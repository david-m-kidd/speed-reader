import { useI18n } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, FileText, Upload, ArrowRight, ShieldCheck } from 'lucide-react';
import { extract, guardSize, makeDocument, supported } from '../importers/text';
import { MAX_TOKENS, type ReadingDocument } from '../domain/model';
import { checkAbort, joinSections, structuredDocument, type Extraction } from '../importers/structured';
import { defaultCleanup, pdfSections, type PdfCleanup, type PdfPage } from '../importers/pdf-layout';
export function ImportScreen({ save, back }: { save: (d: ReadingDocument) => Promise<void>; back: () => void }) {
  const { t, locale } = useI18n();
  const [title,setTitle]=useState(''),[raw,setRaw]=useState(''),[text,setText]=useState('');
  const [source,setSource]=useState<ReadingDocument['source']>('text'),[preview,setPreview]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[extracting,setExtracting]=useState(false);
  const [book,setBook]=useState<Extraction|null>(null),[pages,setPages]=useState<PdfPage[]|null>(null),[cleanup,setCleanup]=useState(defaultCleanup),[section,setSection]=useState(0),[progress,setProgress]=useState<[number,number]>([0,0]);
  const file=useRef<HTMLInputElement>(null), controller=useRef<AbortController|null>(null);
  useEffect(()=>()=>controller.current?.abort(),[]);
  const combined=book?joinSections(book.sections).text:text, count=combined.match(/\S+/gu)?.length||0;
  const prepare=(value=raw,format:string=source)=>{try {
    const result=extract(value,format);if(!result.trim())throw new Error('No readable text found. Try pasting the text instead.');
    setText(result);setBook(null);setPages(null);setSource(format==='md'||format==='markdown'?'md':format==='html'||format==='htm'?'html':format==='txt'?'txt':'text');setPreview(true);setError('');
  }catch(e){setError((e as Error).message);}};
  const load=async(f?:File)=>{
    if(!f)return; controller.current?.abort();const job=new AbortController();controller.current=job;
    setError('');setBusy(true);setExtracting(true);setProgress([0,0]);
    try {
      guardSize(f.size);const ext=f.name.split('.').pop()?.toLowerCase()||'';
      if(![...supported,'pdf','epub'].includes(ext))throw new Error('Choose a TXT, Markdown, HTML, searchable PDF, or DRM-free EPUB file.');
      let result:Extraction;
      if(ext==='pdf') {
        const {extractPdf}=await import('../importers/pdf');checkAbort(job.signal);
        const extracted=await extractPdf(f,job.signal,(done,total)=>setProgress([done,total]));checkAbort(job.signal);
        setPages(extracted);setCleanup(defaultCleanup);
        result={sections:pdfSections(extracted,defaultCleanup),warnings:['PDF reading order can differ from the page. Review columns and cleanup before saving.','Tables, equations and diagrams are not preserved in the reading stream.']};
        if(extracted.some(p=>!p.lines.length))result.warnings.push('Some pages have no text. Image-only pages need OCR and remain empty in this preview.');
      } else if(ext==='epub') {
        const {extractEpub}=await import('../importers/epub');checkAbort(job.signal);
        result=await extractEpub(f,job.signal,(done,total)=>setProgress([done,total]));checkAbort(job.signal);setPages(null);
      } else {
        const value=await f.text();checkAbort(job.signal);setTitle(f.name.replace(/\.[^.]+$/,''));setRaw(value);prepare(value,ext);return;
      }
      setSource(ext as ReadingDocument['source']);setBook(result);setSection(0);setTitle(result.title||f.name.replace(/\.[^.]+$/,''));setPreview(true);
    }catch(e){if(!job.signal.aborted)setError((e as Error).message);}
    finally{if(controller.current===job){controller.current=null;setBusy(false);setExtracting(false);if(file.current)file.current.value='';}}
  };
  const updateCleanup=(options:PdfCleanup)=>{if(!pages||!book)return;setCleanup(options);setBook({...book,sections:pdfSections(pages,options)});};
  const sectionLabel=(index:number)=>book?.sections[index]?.kind==='page'?t('Page {0}',[book.sections[index].label]):book?.sections[index]?.label;
  return <div className="page narrow"><button className="text-button" onClick={back}><ArrowLeft size={17}/>{t(' Your library')}</button>
    <div className="eyebrow">{t('MAKE ROOM FOR A GOOD READ')}</div><h1>{t('Add something')}<br/><em>{t('worth your attention.')}</em></h1><p className="lede">{t('An article, a chapter, a thought you’ve been meaning to return to.')}</p>
    <div className="import-panel"><div className="section-heading"><h2>{preview?t('Review your text'):t('Start with your words')}</h2><span className="pill">{preview?t('{0} words',[count.toLocaleString(locale)]):t('01 / IMPORT')}</span></div>
      {extracting&&<div role="status" className="import-progress"><span>{progress[1]?t('Extracting {0} of {1}…',progress):t('Preparing import…')}</span><progress value={progress[0]} max={progress[1]||1}/><button className="secondary" onClick={()=>controller.current?.abort()}>{t('Cancel import')}</button></div>}
      <label>{t('Title ')}<span className="muted">{t('(optional)')}</span><input placeholder={t('Give this read a name')} value={title} onChange={e=>setTitle(e.target.value)} maxLength={300} disabled={busy}/></label>
      {book?.author&&<p className="fine">{book.author}</p>}
      {book&&<div className="extraction-details">
        {book.warnings.map(w=><p className="extraction-warning" key={w}>{t(w)}</p>)}
        {pages&&<fieldset className="cleanup-options" disabled={busy}><legend>{t('PDF cleanup · optional')}</legend><p className="fine">{t('Changing cleanup rebuilds the preview and resets edits. Turn options off to undo.')}</p>{(['margins','pageNumbers','hyphens','columns'] as const).map((key,i)=><label className="toggle-row" key={key}><span>{t(['Remove repeated margin headers and footers','Remove isolated margin page numbers','Join likely line-break hyphenation','Read likely columns left to right'][i])}</span><input type="checkbox" checked={cleanup[key]} onChange={e=>updateCleanup({...cleanup,[key]:e.target.checked})}/></label>)}</fieldset>}
        <label>{t('Page or chapter')}<select value={section} disabled={busy} onChange={e=>setSection(+e.target.value)}>{book.sections.map((s,i)=><option key={i} value={i}>{sectionLabel(i)}{!s.text?' · '+t('No text'):''}</option>)}</select></label>
        {pages&&<details><summary>{t('Before cleanup · extracted page text')}</summary><pre className="source-preview">{pdfSections([pages[section]],defaultCleanup)[0].text||t('No text')}</pre></details>}
      </div>}
      <label>{preview?t('Cleaned text · edit anything before saving'):t('Paste text')}<textarea data-testid="import-text" rows={12} placeholder={t('A little less scrolling. A little more reading. Paste your text here…')} value={book?book.sections[section]?.text||'':preview?text:raw} disabled={busy} onChange={e=>{if(book)setBook({...book,sections:book.sections.map((s,i)=>i===section?{...s,text:e.target.value}:s)});else if(preview)setText(e.target.value);else setRaw(e.target.value);}} spellCheck={false}/></label>
      <p className="fine">{t('Up to 20 MB per input and 250,000 words per document. English and Spanish supported. Your text is never silently shortened.')}</p>
      {book&&<p className="fine">{t('Each page or chapter stays editable. Locations are saved with your text; original file bytes are not kept.')}</p>}
      {error&&<p role="alert" className="error">{t(error)}</p>}

      <div className="button-row">{preview?<><button className="secondary" disabled={busy} onClick={()=>{setPreview(false);setBook(null);setPages(null);setSource('text');}}>{t('Back to source')}</button><button className="primary" disabled={busy||count===0||count>MAX_TOKENS} onClick={async()=>{setBusy(true);try{await save(book?structuredDocument(title,book,source):makeDocument(title,text,source));}catch(e){setError((e as Error).message);setBusy(false);}}}>{busy?t('Saving…'):t('Save to library')}<ArrowRight size={17}/></button></>:<><button className="secondary" disabled={busy} onClick={()=>file.current?.click()}><Upload size={16}/>{t(' Upload a file')}</button><button className="primary" disabled={busy||!raw.trim()} onClick={()=>prepare(raw,'text')}>{t('Review text')}<ArrowRight size={17}/></button></>}</div>
      <input ref={file} className="sr-only" aria-label={t('Upload reading file')} type="file" disabled={busy} accept=".txt,.md,.markdown,.html,.htm,.pdf,.epub,text/plain,text/markdown,text/html,application/pdf,application/epub+zip" onChange={e=>void load(e.target.files?.[0])}/>
    </div><div className="import-notes"><span><FileText size={17}/>{t(' TXT, Markdown, HTML, PDF & EPUB')}</span><span><ShieldCheck size={17}/>{t(' Only on this device')}</span></div>
  </div>;
}
