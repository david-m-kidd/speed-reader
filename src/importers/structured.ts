import { MAX_BYTES, type ReadingDocument, type SourceLocation } from '../domain/model';
import { makeDocument } from './text';
export type Section = { label: string; text: string; kind: SourceLocation['kind'] };
export type Extraction = { title?: string; author?: string; sections: Section[]; warnings: string[] };
export const cancelled = () => new DOMException('Import cancelled.', 'AbortError');
export function checkAbort(signal: AbortSignal) { if (signal.aborted) throw cancelled(); }
export async function yieldToUI(signal: AbortSignal) { await new Promise(r => setTimeout(r, 0)); checkAbort(signal); }
export function joinSections(sections: Section[]) {
  let text = ''; const locations: SourceLocation[] = [];
  for (const section of sections) {
    const value = section.text.replace(/\r\n?/g, '\n').split('\0').join('').trim();
    if (text && value) text += '\n\n';
    const start = text.length; text += value;
    locations.push({ kind: section.kind, label: section.label, start, end: text.length });
  }
  return { text, locations };
}
export function structuredDocument(title: string, extraction: Extraction, source: ReadingDocument['source']) {
  const joined = joinSections(extraction.sections);
  const doc = makeDocument(title, joined.text, source);
  return { ...doc, locations: joined.locations, ...(extraction.author ? { author: extraction.author } : {}) };
}
export function guardExtractedText(length: number) {
  // Conservative UTF-16 budget, followed by the exact UTF-8 guard at save time.
  if (length > MAX_BYTES / 2) throw new Error('Extracted text exceeds the safe import limit. Split the book into smaller files.');
}
