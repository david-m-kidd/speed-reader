import Dexie, { type Table } from 'dexie';
import { defaults, MAX_BYTES, tokenize, type ReadingDocument, type Progress, type Highlight, type Session, type Settings } from '../domain/model';
export class ReaderDB extends Dexie {
  documents!: Table<ReadingDocument, string>;
  progress!: Table<Progress, string>;
  highlights!: Table<Highlight, string>;
  sessions!: Table<Session, string>;
  preferences!: Table<{ id: string; value: Settings }, string>;
  constructor(name = 'stillword') {
    super(name);
    this.version(1).stores({ documents: 'id,updatedAt,title', progress: 'documentId', highlights: 'id,documentId', sessions: 'id,documentId', preferences: 'id' });
    this.version(2).stores({}).upgrade(async transaction => {
      const preferences = transaction.table('preferences');
      const stored = await preferences.get('settings');
      if (stored) await preferences.put({ ...stored, value: { ...stored.value, hold: true } });
    });
  }
}
export const db = new ReaderDB();
export type Backup = { schema: 1 | 2; app: 'stillword'; exportedAt: number; originalsIncluded: false; documents: ReadingDocument[]; progress: Progress[]; highlights: Highlight[]; sessions: Session[]; settings: Settings };
export async function exportBackup(): Promise<Backup> {
  return db.transaction('r', db.tables, async () => ({ schema: 2, app: 'stillword', exportedAt: Date.now(), originalsIncluded: false, documents: await db.documents.toArray(), progress: await db.progress.toArray(), highlights: await db.highlights.toArray(), sessions: await db.sessions.toArray(), settings: (await db.preferences.get('settings'))?.value || defaults }));
}
const fail = () => { throw new Error('This backup is invalid or uses an unsupported schema. No reading data was changed.'); };
const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const integer = (n: unknown) => finite(n) && Number.isInteger(n);
const str = (s: unknown) => typeof s === 'string';
const id = (s: unknown) => str(s) && (s as string).length > 0 && (s as string).length < 200 && !['__proto__', 'constructor', 'prototype'].includes(s as string);
export function validSettings(s: Settings) {
  if (s?.uiLanguage !== undefined && !['en', 'es'].includes(s.uiLanguage)) return false;
  if (!s || !integer(s.wpm) || s.wpm < 100 || s.wpm > 1000 || s.wpm % 25 || !['dark', 'light', 'sepia'].includes(s.theme) || !['sans', 'serif', 'mono'].includes(s.font) || !integer(s.fontSize) || s.fontSize < 24 || s.fontSize > 80 || !/^#[a-f0-9]{6}$/i.test(s.anchorColor) || !integer(s.goal) || s.goal < 1 || s.goal > 1_000_000 || !str(s.timezone)) return false;
  if (!['guides', 'punctuation', 'longWords', 'hold', 'reducedMotion'].every(k => typeof s[k as keyof Settings] === 'boolean')) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: s.timezone }); return true; } catch { return false; }
}
export function validateBackup(value: unknown): Backup {
  if (!value || typeof value !== 'object') return fail();
  const b = value as Backup;
  if (![1,2].includes(b.schema) || b.app !== 'stillword' || !finite(b.exportedAt) || b.originalsIncluded !== false || !validSettings(b.settings)) return fail();
  if (![b.documents, b.progress, b.highlights, b.sessions].every(a => Array.isArray(a) && a.length <= 100_000)) return fail();
  const documents = new Map<string, ReadingDocument>();
  for (const d of b.documents) {
    if (!d || !id(d.id) || documents.has(d.id) || !str(d.title) || !str(d.text) || new Blob([d.text]).size > MAX_BYTES || !['text', 'txt', 'md', 'html', 'pdf', 'epub'].includes(d.source) || d.version !== 1 || d.tokenizer !== 1 || !finite(d.createdAt) || !finite(d.updatedAt)) return fail();
    if (d.author !== undefined && !str(d.author)) return fail();
    if (d.locations !== undefined) {
      if (!Array.isArray(d.locations) || d.locations.length > 2000) return fail();
      let end = 0;
      for (const location of d.locations) {
        if (!location || !['page','chapter'].includes(location.kind) || !str(location.label) || !integer(location.start) || !integer(location.end) || location.start < end || location.end < location.start || location.end > d.text.length) return fail();
        end = location.end;
      }
    }
    if (d.sampleId !== undefined && (!str(d.sampleId) || !/^[a-z0-9-]{1,60}$/.test(d.sampleId))) return fail();
    if (d.attribution !== undefined) {
      if (!d.attribution || !str(d.attribution.author) || !str(d.attribution.chapter) || !str(d.attribution.sourceUrl)) return fail();
      try { if (new URL(d.attribution.sourceUrl).protocol !== 'https:') return fail(); } catch { return fail(); }
    }
    const expected = tokenize(d.text);
    if (expected.text !== d.text || JSON.stringify(expected.tokens) !== JSON.stringify(d.tokens)) return fail();
    documents.set(d.id, d);
  }
  const progressIds = new Set<string>();
  for (const p of b.progress) {
    const d = documents.get(p?.documentId);
    if (!d || progressIds.has(p.documentId) || !integer(p.index) || p.index >= d.tokens.length || typeof p.completed !== 'boolean' || !finite(p.updatedAt) || (p.completed && p.index !== d.tokens.length - 1)) return fail();
    progressIds.add(p.documentId);
  }
  const ids = new Set<string>();
  for (const h of b.highlights) {
    const d = documents.get(h?.documentId);
    if (!d || !id(h.id) || ids.has(h.id) || !integer(h.start) || !integer(h.end) || h.end <= h.start || h.end > d.text.length || d.text.slice(h.start, h.end) !== h.quote || !str(h.note) || !finite(h.createdAt)) return fail();
    ids.add(h.id);
  }
  ids.clear();
  for (const s of b.sessions) {
    if (!s || !documents.has(s.documentId) || !id(s.id) || ids.has(s.id) || !finite(s.startedAt) || !finite(s.endedAt) || s.endedAt < s.startedAt || !finite(s.activeMs) || !integer(s.words) || !validSettings(s.settings) || !s.days || typeof s.days !== 'object') return fail();
    let words = 0, ms = 0;
    for (const [key, day] of Object.entries(s.days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || Number.isNaN(Date.parse(key)) || !day || !integer(day.words) || !finite(day.activeMs)) return fail();
      words += day.words; ms += day.activeMs;
    }
    if (words !== s.words || Math.abs(ms - s.activeMs) > 0.01) return fail();
    ids.add(s.id);
  }
  return b;
}
export async function restoreBackup(backup: Backup, replace: boolean) {
  const b = validateBackup(backup);
  await db.transaction('rw', db.tables, async () => {
    if (replace) await Promise.all(db.tables.map(t => t.clear()));
    for (const d of b.documents) {
      const old = await db.documents.get(d.id);
      if (old && old.text !== d.text) throw new Error('An existing document has the same ID but different content. Use Replace to restore this backup.');
      if (!old || d.updatedAt > old.updatedAt) await db.documents.put(d);
    }
    for (const p of b.progress) { const old = await db.progress.get(p.documentId); if (!old || p.updatedAt > old.updatedAt) await db.progress.put(p); }
    await db.highlights.bulkPut(b.highlights);
    for (const s of b.sessions) { const old = await db.sessions.get(s.id); if (!old || s.endedAt > old.endedAt || (s.endedAt === old.endedAt && s.activeMs > old.activeMs)) await db.sessions.put(s); }
    await db.preferences.put({ id: 'settings', value: b.settings });
  });
}
export async function deleteDocument(id: string) {
  await db.transaction('rw', db.documents, db.progress, db.highlights, db.sessions, async () => {
    await db.documents.delete(id); await db.progress.delete(id);
    await db.highlights.where('documentId').equals(id).delete(); await db.sessions.where('documentId').equals(id).delete();
  });
}
export function storageError(error: unknown) {
  const name = (error as Error)?.name;
  if (/quota/i.test(name)) return 'Device storage is full. Export a backup, then free space before continuing.';
  if (/Security|InvalidState|Unknown|OpenFailed/i.test(name)) return 'Local storage is unavailable. Allow browser storage for this site. Your library cannot be saved until this is resolved.';
  return error instanceof Error ? error.message : 'Could not save your changes. Please try again.';
}
