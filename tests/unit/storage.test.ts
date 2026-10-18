import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, ReaderDB, exportBackup, restoreBackup, validateBackup } from '../../src/storage/database';
import { defaults, tokenize, type ReadingDocument } from '../../src/domain/model';
const doc: ReadingDocument = { id: 'test-doc', title: 'Café', source: 'text', ...tokenize('¡Hola, café!\n\nAño nuevo.'), version: 1, tokenizer: 1, createdAt: 1, updatedAt: 1 };
beforeEach(async () => { await Promise.all(db.tables.map(t => t.clear())); });
describe('complete transactional backups', () => {
  it('upgrades an existing library to hold-by-default without losing its documents', async () => {
    const name = 'stillword-migration-test'; const old = new Dexie(name);
    old.version(1).stores({ documents: 'id,updatedAt,title', progress: 'documentId', highlights: 'id,documentId', sessions: 'id,documentId', preferences: 'id' });
    await old.table('documents').put(doc); await old.table('preferences').put({ id: 'settings', value: { ...defaults, hold: false, wpm: 450 } }); old.close();
    const upgraded = new ReaderDB(name); await upgraded.open(); expect((await upgraded.preferences.get('settings'))?.value).toMatchObject({ hold: true, wpm: 450 }); expect((await upgraded.documents.get(doc.id))?.text).toBe(doc.text); upgraded.close(); await Dexie.delete(name);
  });
  it('restores documents, positions, highlights, settings and activity into empty storage, idempotently', async () => {
    await db.documents.put(doc); await db.progress.put({ documentId: doc.id, index: 2, completed: false, updatedAt: 2 });
    await db.highlights.put({ id: 'h', documentId: doc.id, start: 0, end: 6, quote: doc.text.slice(0, 6), note: 'keep', createdAt: 2 });
    await db.sessions.put({ id: 's', documentId: doc.id, startedAt: 1, endedAt: 201, activeMs: 200, words: 1, days: { '2026-10-17': { words: 1, activeMs: 200 } }, settings: defaults });
    const backup = validateBackup(JSON.parse(JSON.stringify(await exportBackup())));
    await Promise.all(db.tables.map(t => t.clear())); await restoreBackup(backup, false); await restoreBackup(backup, false);
    expect(await db.documents.count()).toBe(1); expect((await db.progress.get(doc.id))?.index).toBe(2); expect((await db.highlights.get('h'))?.note).toBe('keep'); expect(await db.sessions.count()).toBe(1); expect((await db.preferences.get('settings'))?.value.wpm).toBe(300);
  });
  it('rejects tampered offsets and unsupported settings before writes', async () => { await db.documents.put(doc); const b = await exportBackup(); b.documents[0].tokens[0].start = 100; expect(() => validateBackup(b)).toThrow('invalid'); expect((await db.documents.get(doc.id))?.tokens[0].start).toBe(0); });
  it('rolls back merge conflicts and preserves newer positions', async () => { await db.documents.put(doc); await db.progress.put({ documentId: doc.id, index: 3, completed: false, updatedAt: 10 }); const b = await exportBackup(); b.progress[0].updatedAt = 1; b.progress[0].index = 0; await restoreBackup(b, false); expect((await db.progress.get(doc.id))?.index).toBe(3); b.documents[0] = { ...doc, ...tokenize('different text') }; await expect(restoreBackup(b, false)).rejects.toThrow(); expect((await db.documents.get(doc.id))?.text).toBe(doc.text); });
});
