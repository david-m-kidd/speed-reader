import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { checkAbort, guardExtractedText, yieldToUI } from './structured';
import { groupLines, type PdfPage, type PdfLine } from './pdf-layout';
GlobalWorkerOptions.workerSrc = workerUrl;
export async function extractPdf(file: File, signal: AbortSignal, progress: (done: number, total: number) => void): Promise<PdfPage[]> {
  checkAbort(signal);
  const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()), useSystemFonts: false, disableFontFace: true, stopAtErrors: true, maxImageSize: 0 });
  const abort = () => { void task.destroy(); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    const doc = await task.promise; checkAbort(signal);
    if (doc.numPages > 2000) throw new Error('This PDF exceeds the 2,000-page import limit. Split it into smaller files.');
    const pages: PdfPage[] = []; let length = 0;
    for (let n=1;n<=doc.numPages;n++) {
      checkAbort(signal); const page = await doc.getPage(n), viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent(); checkAbort(signal);
      const items: PdfLine[] = content.items.flatMap(item => {
        if (!('str' in item)) return [];
        length += item.str.length; guardExtractedText(length);
        return [{ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width, height: item.height || 10 }];
      });
      pages.push({ number:n, width:viewport.width, height:viewport.height, lines:groupLines(items) });
      page.cleanup(); progress(n,doc.numPages); await yieldToUI(signal);
    }
    if (!pages.some(p => p.lines.some(l => /[\p{L}\p{N}]/u.test(l.text)))) throw new Error('This PDF has no usable text. It may be scanned; OCR is needed before importing.');
    return pages;
  } catch (error) {
    checkAbort(signal);
    if ((error as Error).name === 'PasswordException' || /password|destroyed/i.test((error as Error).message)) throw new Error('Password-protected PDFs are not supported. Save an unlocked copy locally, then import it.', { cause: error });
    throw error;
  } finally { signal.removeEventListener('abort',abort); await task.destroy(); }
}
