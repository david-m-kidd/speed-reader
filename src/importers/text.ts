import { MAX_BYTES, tokenize, type ReadingDocument } from '../domain/model';
export const supported = ['txt', 'md', 'markdown', 'html', 'htm'];
export function guardSize(bytes: number) { if (bytes > MAX_BYTES) throw new Error('The input exceeds 20 MB. Split it into smaller files. Nothing was truncated.'); }
export function extract(source: string, format: string): string {
  guardSize(new Blob([source]).size);
  if (format === 'html' || format === 'htm') {
    // Parsing a detached template is inert: no imported images/frames/styles are attached or fetched.
    const template = document.createElement('template'); template.innerHTML = source;
    template.content.querySelectorAll('script,style,noscript,iframe,object,embed,template,svg,canvas,head,title,link,meta,[hidden],[aria-hidden="true"]').forEach(el => el.remove());
    template.content.querySelectorAll('[style]').forEach(el => { if (/display\s*:\s*none|visibility\s*:\s*hidden/i.test(el.getAttribute('style')!)) el.remove(); });
    template.content.querySelectorAll('br').forEach(el => el.replaceWith('\n'));
    template.content.querySelectorAll('p,div,section,article,h1,h2,h3,h4,li,blockquote,pre,tr').forEach(el => { el.prepend('\n\n'); el.append('\n\n'); });
    return (template.content.textContent || '').replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  if (format === 'md' || format === 'markdown') return source.replace(/^\s{0,3}#{1,6}\s+/gm, '').replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/^\s*```[^\n]*\n?|^\s*```\s*$/gm, '').replace(/(\*\*|__|~~|`)/g, '').replace(/\*([^*\n]+)\*/g, '$1').replace(/^\s*>\s?/gm, '').replace(/^\s*[-*+]\s+/gm, '').trim();
  return source.trim();
}
export function makeDocument(title: string, text: string, source: ReadingDocument['source']): ReadingDocument {
  guardSize(new Blob([text]).size);
  const normalized = tokenize(text), now = Date.now();
  return { id: crypto.randomUUID(), title: title.trim() || normalized.tokens.slice(0, 6).map(t => t.text).join(' '), source, ...normalized, version: 1, tokenizer: 1, createdAt: now, updatedAt: now };
}
