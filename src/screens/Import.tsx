import { useI18n } from '../i18n';
import { useRef, useState } from 'react';
import { ArrowLeft, FileText, Upload, ArrowRight, ShieldCheck } from 'lucide-react';
import { extract, guardSize, makeDocument, supported } from '../importers/text';
import { MAX_TOKENS, type ReadingDocument } from '../domain/model';
export function ImportScreen({ save, back }: {
    save: (d: ReadingDocument) => Promise<void>;
    back: () => void;
}) {
    const { t, locale } = useI18n();

    const [title, setTitle] = useState(''), [raw, setRaw] = useState(''), [text, setText] = useState('');
    const [source, setSource] = useState<ReadingDocument['source']>('text'), [preview, setPreview] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const file = useRef<HTMLInputElement>(null);
    const count = text.match(/\S+/gu)?.length || 0;
    const prepare = (value = raw, format: string = source) => { try {
        const result = extract(value, format);
        if (!result.trim())
            throw new Error('No readable text found. Try pasting the text instead.');
        setText(result);
        setPreview(true);
        setError('');
    }
    catch (e) {
        setError((e as Error).message);
    } };
    const load = async (f?: File) => {
        if (!f)
            return;
        setError('');
        setBusy(true);
        try {
            guardSize(f.size);
            const ext = f.name.split('.').pop()?.toLowerCase() || '';
            if (!supported.includes(ext))
                throw new Error('Choose a TXT, Markdown, or HTML file. PDF and EPUB imports are planned for Milestone 2.');
            const value = await f.text();
            setTitle(f.name.replace(/\.[^.]+$/, ''));
            setRaw(value);
            setSource(ext === 'markdown' ? 'md' : ext === 'htm' ? 'html' : ext as ReadingDocument['source']);
            prepare(value, ext);
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
            if (file.current)
                file.current.value = '';
        }
    };
    return <div className="page narrow"><button className="text-button" onClick={back}><ArrowLeft size={17}/>{t(" Your library")}</button>
    <div className="eyebrow">{t("MAKE ROOM FOR A GOOD READ")}</div><h1>{t("Add something")}<br /><em>{t("worth your attention.")}</em></h1><p className="lede">{t("An article, a chapter, a thought you\u2019ve been meaning to return to.")}</p>
    <div className="import-panel"><div className="section-heading"><h2>{preview ? t("Review your text") : t("Start with your words")}</h2><span className="pill">{preview ? t("{0} words", [count.toLocaleString(locale)]) : t("01 / IMPORT")}</span></div>
      <label>{t("Title ")}<span className="muted">{t("(optional)")}</span><input placeholder={t("Give this read a name")} value={title} onChange={e => setTitle(e.target.value)} maxLength={300}/></label>
      <label>{preview ? t("Cleaned text \u00B7 edit anything before saving") : t("Paste text")}<textarea data-testid="import-text" rows={12} placeholder={t("A little less scrolling. A little more reading. Paste your text here\u2026")} value={preview ? text : raw} onChange={e => preview ? setText(e.target.value) : setRaw(e.target.value)} spellCheck={false}/></label>
      <p className="fine">{t("Up to 20 MB per input and 250,000 words per document. English and Spanish supported. Your text is never silently shortened.")}</p>
      {error && <p role="alert" className="error">{t(error)}</p>}
      <div className="button-row">{preview ? <><button className="secondary" disabled={busy} onClick={() => setPreview(false)}>{t("Back to source")}</button><button className="primary" disabled={busy || count === 0 || count > MAX_TOKENS} onClick={async () => { setBusy(true); try {
        await save(makeDocument(title, text, source));
    }
    catch (e) {
        setError((e as Error).message);
        setBusy(false);
    } }}>{busy ? t("Saving\u2026") : t("Save to library")}<ArrowRight size={17}/></button></> : <><button className="secondary" disabled={busy} onClick={() => file.current?.click()}><Upload size={16}/>{t(" Upload a file")}</button><button className="primary" disabled={busy || !raw.trim()} onClick={() => prepare()}>{t("Review text")}<ArrowRight size={17}/></button></>}</div>
      <input ref={file} className="sr-only" aria-label={t("Upload reading file")} type="file" accept=".txt,.md,.markdown,.html,.htm,text/plain,text/markdown,text/html" onChange={e => void load(e.target.files?.[0])}/>
    </div><div className="import-notes"><span><FileText size={17}/>{t(" TXT, Markdown & HTML")}</span><span><ShieldCheck size={17}/>{t(" Only on this device")}</span></div>
  </div>;
}
