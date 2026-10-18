import { extract } from './text';
import { cancelled, checkAbort, guardExtractedText, yieldToUI, type Extraction } from './structured';
const invalid = () => { throw new Error('This EPUB is malformed or has no readable spine chapters.'); };
function xml(text:string) {
  if(/<!ENTITY|<!DOCTYPE[^>]*\[/i.test(text)) return invalid();
  const doc=new DOMParser().parseFromString(text.replace(/<!DOCTYPE[^>]*>/gi,''),'application/xml');
  if(doc.getElementsByTagName('parsererror').length) return invalid();
  return doc;
}
const tags=(root:Document|Element,name:string)=>Array.from(root.getElementsByTagNameNS('*',name));
function resolvePath(from:string,href:string) {
  if(!href||/^[a-z][a-z0-9+.-]*:|^\/|\\/i.test(href)) return invalid();
  let decoded:string;try { decoded=decodeURIComponent(href.split(/[?#]/)[0]); } catch {return invalid();}
  if(/[:\\]/.test(decoded)||Array.from(decoded).some(c=>c.charCodeAt(0)<32)||decoded.startsWith('/')) return invalid();
  const parts=from.split('/').slice(0,-1);
  for(const part of decoded.split('/')) {if(part==='..') {if(!parts.length)return invalid();parts.pop();} else if(part&&part!=='.')parts.push(part);}
  return parts.join('/');
}
function unpack(file:File,signal:AbortSignal,progress:(done:number,total:number)=>void):Promise<Record<string,Uint8Array>> {
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./epub.worker.ts',import.meta.url),{type:'module'});
    const finish=()=>{worker.terminate();signal.removeEventListener('abort',abort);};
    const abort=()=>{finish();reject(cancelled());};
    signal.addEventListener('abort',abort,{once:true});
    if(signal.aborted) {abort();return;}
    worker.onmessage=({data})=>{if(data.error){finish();reject(new Error(data.error));}else if(data.files){finish();resolve(data.files);}else progress(data.done,data.total);};
    worker.onerror=()=>{finish();reject(new Error('This EPUB archive could not be opened.'));};
    void file.arrayBuffer().then(buffer=>{if(!signal.aborted)worker.postMessage(buffer,[buffer]);},error=>{finish();reject(error);});
  });
}
export async function extractEpub(file:File,signal:AbortSignal,progress:(done:number,total:number)=>void):Promise<Extraction> {
  const files=await unpack(file,signal,progress);checkAbort(signal);
  const decoder=new TextDecoder('utf-8',{fatal:true});
  const read=(path:string)=>{if(!Object.hasOwn(files,path))return invalid();return decoder.decode(files[path]);};
  if(read('mimetype').trim()!=='application/epub+zip')return invalid();
  if(files['META-INF/encryption.xml']) {
    const encryption=xml(read('META-INF/encryption.xml'));
    if(tags(encryption,'EncryptedData').length) throw new Error('Encrypted or DRM-protected EPUBs are not supported. Choose a DRM-free edition.');
  }
  const container=xml(read('META-INF/container.xml'));
  const packagePath=tags(container,'rootfile').find(el=>el.getAttribute('media-type')==='application/oebps-package+xml')?.getAttribute('full-path');
  if(!packagePath)return invalid();
  const packageDoc=xml(read(resolvePath('',packagePath))), items=new Map(tags(packageDoc,'item').map(item=>[item.getAttribute('id'),item]));
  const spine=tags(packageDoc,'spine')[0];if(!spine)return invalid();
  const result:Extraction={title:tags(packageDoc,'title')[0]?.textContent?.trim(),author:tags(packageDoc,'creator')[0]?.textContent?.trim(),sections:[],warnings:[]};
  // Prefer EPUB 3 navigation labels, then EPUB 2 NCX labels. Neither controls reading order.
  const labels=new Map<string,string>();
  const nav=Array.from(items.values()).find(i=>i.getAttribute('properties')?.split(/\s+/).includes('nav'));
  if(nav?.getAttribute('href')) {
    const path=resolvePath(packagePath,nav.getAttribute('href')!);
    const template=document.createElement('template');template.innerHTML=read(path);
    template.content.querySelectorAll('nav a[href]').forEach(a=>{try {const target=resolvePath(path,a.getAttribute('href')!);if(!labels.has(target)) labels.set(target,a.textContent?.trim()||'');}catch{/* Ignore remote/invalid navigation links. */}});
  } else {
    const ncx=items.get(spine.getAttribute('toc'));
    if(ncx?.getAttribute('href')) {
      const path=resolvePath(packagePath,ncx.getAttribute('href')!);
      for(const point of tags(xml(read(path)),'navPoint')) {
        const href=tags(point,'content')[0]?.getAttribute('src');
        if(href)try{const target=resolvePath(path,href);if(!labels.has(target))labels.set(target,tags(point,'text')[0]?.textContent?.trim()||'');}catch{/* Ignore invalid navigation links. */}
      }
    }
  }
  let length=0;
  for(const ref of tags(spine,'itemref')) {
    checkAbort(signal); const item=items.get(ref.getAttribute('idref'));
    if(!item)return invalid();
    if(ref.getAttribute('linear')==='no'||item.getAttribute('properties')?.split(/\s+/).includes('nav'))continue;
    if(!['application/xhtml+xml','text/html'].includes(item.getAttribute('media-type')||''))continue;
    const path=resolvePath(packagePath,item.getAttribute('href')||''), html=read(path);
    const template=document.createElement('template');template.innerHTML=html;
    const css=[...Array.from(template.content.querySelectorAll('style'),s=>s.textContent||''),...Array.from(template.content.querySelectorAll('link[rel="stylesheet"][href]'),link=>{try{return files[resolvePath(path,link.getAttribute('href')!)]?read(resolvePath(path,link.getAttribute('href')!)):'';}catch{return '';}})].join('\n');
    // Apply only hidden-content rules in an inert tree. Never attach styles or fetch external resources.
    for(const rule of css.matchAll(/([^{}]+)\{([^{}]+)\}/g)) if(/display\s*:\s*none|visibility\s*:\s*hidden/i.test(rule[2])) try {template.content.querySelectorAll(rule[1].trim()).forEach(el=>el.remove());}catch{/* Unsupported selector. */}
    template.content.querySelectorAll('nav,[epub\\:type="toc"],script').forEach(el=>el.remove());
    const label=labels.get(path)||template.content.querySelector('h1,h2,title')?.textContent?.trim()||String(result.sections.length+1);
    const text=extract(template.innerHTML,'html'); length+=text.length;guardExtractedText(length);
    if(text)result.sections.push({kind:'chapter',label,text});
    progress(result.sections.length,tags(spine,'itemref').length);await yieldToUI(signal);
  }
  if(!result.sections.length)return invalid();
  return result;
}
