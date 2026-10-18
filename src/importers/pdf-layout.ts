import type { Section } from './structured';
export type PdfLine = { text: string; x: number; y: number; width: number; height: number };
export type PdfPage = { number: number; width: number; height: number; lines: PdfLine[] };
export type PdfCleanup = { margins: boolean; pageNumbers: boolean; hyphens: boolean; columns: boolean };
export const defaultCleanup: PdfCleanup = { margins: false, pageNumbers: false, hyphens: false, columns: false };
export function groupLines(items: PdfLine[]): PdfLine[] {
  const rows: PdfLine[][] = [];
  for (const item of items.filter(i => i.text.trim()).sort((a,b) => b.y - a.y || a.x - b.x)) {
    const last = rows.at(-1);
    const row = last && Math.abs(last[0].y - item.y) < Math.max(2, Math.min(last[0].height, item.height) * .3) ? last : undefined;
    if (row) row.push(item); else rows.push([item]);
  }
  return rows.flatMap(row => {
    const runs: PdfLine[] = [];
    for (const item of row.sort((a,b) => a.x - b.x)) {
      const last = runs.at(-1), gap = last ? item.x - last.x - last.width : Infinity;
      if (last && gap < Math.max(12, item.height * 2)) {
        last.text += (gap > item.height * .15 ? ' ' : '') + item.text;
        last.width = Math.max(last.width, item.x + item.width - last.x);
      } else runs.push({ ...item });
    }
    return runs;
  });
}
const margin = (p: PdfPage, l: PdfLine) => l.y > p.height * .9 || l.y < p.height * .1;
const signature = (s: string) => s.trim().replace(/\s+/g, ' ');
export function pdfSections(pages: PdfPage[], options: PdfCleanup): Section[] {
  const counts = new Map<string, number>();
  for (const p of pages) for (const s of new Set(p.lines.filter(l => margin(p,l)).map(l => signature(l.text)))) counts.set(s, (counts.get(s) || 0) + 1);
  return pages.map(p => {
    let lines = p.lines.filter(l => !(options.margins && pages.length >= 2 && margin(p,l) && (counts.get(signature(l.text)) || 0) >= Math.max(2, Math.ceil(pages.length * .6))) && !(options.pageNumbers && margin(p,l) && /^\s*(?:\d+|[ivxlcdm]+)\s*$/i.test(l.text)));
    const left = lines.filter(l => l.x + l.width < p.width * .53), right = lines.filter(l => l.x > p.width * .47);
    // Split only when both columns have substantial content and no body line spans the gutter.
    const spanning = lines.filter(l => l.x < p.width * .45 && l.x + l.width > p.width * .55 && l.y < p.height * .88);
    if (options.columns && left.length >= 3 && right.length >= 3 && !spanning.length) {
      const top = lines.filter(l => !left.includes(l) && !right.includes(l));
      lines = [...top, ...left.sort((a,b) => b.y-a.y), ...right.sort((a,b) => b.y-a.y)];
    } else lines = [...lines].sort((a,b) => b.y-a.y || a.x-b.x);
    let text = '';
    for (let i=0;i<lines.length;i++) {
      const line = lines[i], previous = lines[i-1];
      const paragraph = previous && (Math.abs(previous.y-line.y) > Math.max(previous.height,line.height)*1.8 || line.x < previous.x - p.width*.2);
      text += (i ? paragraph ? '\n\n' : '\n' : '') + line.text;
    }
    if (options.hyphens) text = text.replace(/([\p{Ll}]{3,})-\n([\p{Ll}]{3,})/gu, '$1$2');
    return { kind: 'page', label: String(p.number), text: text.trim() };
  });
}
