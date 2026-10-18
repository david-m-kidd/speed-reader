import { useRef, useState } from 'react';
import { ArrowLeft, FileText, Upload, ArrowRight, ShieldCheck } from 'lucide-react';
import { extract, guardSize, makeDocument, supported } from '../importers/text';
import { MAX_TOKENS, type ReadingDocument } from '../domain/model';

export function ImportScreen({ save, back }: { save: (d: ReadingDocument) => Promise<void>; back: () => void }) {
  const [title, setTitle] = useState(''), [raw, setRaw] = useState(''), [text, setText] = useState('');
  const [source, setSource] = useState<ReadingDocument['source']>('text'), [preview, setPreview] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const count = text.match(/\S+/gu)?.length || 0;
  const prepare = (value = raw, format: string = source) => { try { const result = extract(value, format); if (!result.trim()) throw new Error('No readable text found. Try pasting the text instead.'); setText(result); setPreview(true); setError(''); } catch (e) { setError((e as Error).message); } };
  const load = async (f?: File) => {
    if (!f) return;
    setError(''); setBusy(true);
    try {
      guardSize(f.size); const ext = f.name.split('.').pop()?.toLowerCase() || '';
      if (!supported.includes(ext)) throw new Error('Choose a TXT, Markdown, or HTML file. PDF and EPUB imports are planned for Milestone 2.');
      const value = await f.text(); setTitle(f.name.replace(/\.[^.]+$/, '')); setRaw(value); setSource(ext === 'markdown' ? 'md' : ext === 'htm' ? 'html' : ext as ReadingDocument['source']); prepare(value, ext);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); if (file.current) file.current.value = ''; }
  };
  return <div className="page narrow"><button className="text-button" onClick={back}><ArrowLeft size={17}/> Your library</button>
    <div className="eyebrow">MAKE ROOM FOR A GOOD READ</div><h1>Add something<br/><em>worth your attention.</em></h1><p className="lede">An article, a chapter, a thought you’ve been meaning to return to.</p>
    <div className="import-panel"><div className="section-heading"><h2>{preview ? 'Review your text' : 'Start with your words'}</h2><span className="pill">{preview ? `${count.toLocaleString()} words` : '01 / IMPORT'}</span></div>
      <label>Title <span className="muted">(optional)</span><input placeholder="Give this read a name" value={title} onChange={e => setTitle(e.target.value)} maxLength={300}/></label>
      <label>{preview ? 'Cleaned text · edit anything before saving' : 'Paste text'}<textarea data-testid="import-text" rows={12} placeholder="A little less scrolling. A little more reading. Paste your text here…" value={preview ? text : raw} onChange={e => preview ? setText(e.target.value) : setRaw(e.target.value)} spellCheck={false}/></label>
      <p className="fine">Up to 20 MB per input and 250,000 words per document. English and Spanish supported. Your text is never silently shortened.</p>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="button-row">{preview ? <><button className="secondary" disabled={busy} onClick={() => setPreview(false)}>Back to source</button><button className="primary" disabled={busy || count === 0 || count > MAX_TOKENS} onClick={async () => { setBusy(true); try { await save(makeDocument(title, text, source)); } catch (e) { setError((e as Error).message); setBusy(false); } }}>{busy ? 'Saving…' : 'Save to library'}<ArrowRight size={17}/></button></> : <><button className="secondary" disabled={busy} onClick={() => file.current?.click()}><Upload size={16}/> Upload a file</button><button className="primary" disabled={busy || !raw.trim()} onClick={() => prepare()}>Review text<ArrowRight size={17}/></button></>}</div>
      <input ref={file} className="sr-only" aria-label="Upload reading file" type="file" accept=".txt,.md,.markdown,.html,.htm,text/plain,text/markdown,text/html" onChange={e => void load(e.target.files?.[0])}/>
    </div><div className="import-notes"><span><FileText size={17}/> TXT, Markdown & HTML</span><span><ShieldCheck size={17}/> Only on this device</span></div>
  </div>;
}
