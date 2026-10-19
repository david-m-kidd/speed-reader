import { useI18n } from '../i18n';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import catalog from './catalog.json';
import { makeDocument } from '../importers/text';
import type { ReadingDocument } from '../domain/model';
export function Samples({ documents, save, open, report }: {
    documents: ReadingDocument[];
    save: (d: ReadingDocument) => Promise<void>;
    open: (id: string) => void;
    report: (error: unknown) => void;
}) {
    const { t, locale } = useI18n();

    return <section className="samples-section" aria-labelledby="samples-heading">
    <div className="section-heading"><div><div className="eyebrow">{t("PUBLIC-DOMAIN SAMPLES")}</div><h2 id="samples-heading">{t("Demo chapters")}</h2><p className="muted">{t("Sample chapters in English and Spanish. Available offline.")}</p></div><span className="pill">{t("ENGLISH + ESPA\u00D1OL")}</span></div>
    <div className="sample-grid">{catalog.map((book, i) => {
            const existing = documents.find(d => d.sampleId === book.id || d.id === `sample-${book.id}`);
            return <article className={`sample-book sample-tone-${i}`} key={book.id}>
        <div className="sample-meta"><span>{t(book.language)}</span><span>{Math.max(1, Math.ceil(book.words / 300))}{t(" min at 300 WPM")}</span></div>
        <h3>{book.title}</h3><p className="sample-author">{book.author}</p><p className="sample-description">{t(book.description)}</p><small>{t(book.chapter)} · {book.words.toLocaleString(locale)}{t(" words")}</small>
        <div className="sample-actions"><button className="text-button" onClick={async () => { if (existing) {
                open(existing.id);
                return;
            } try {
                await save({ ...makeDocument(`${book.title} — ${book.chapter}`, book.text, 'text'), id: `sample-${book.id}`, sampleId: book.id, attribution: { author: book.author, sourceUrl: book.sourceUrl, chapter: book.chapter } });
            }
            catch (e) {
                report(e);
            } }}>{existing ? t("Continue sample") : t("Read this chapter")}<ArrowRight size={14}/></button><a href={book.sourceUrl} target="_blank" rel="noreferrer" aria-label={t("Full edition and source for {0}", [book.title])} title={t("Full edition and source")}><ArrowUpRight size={14}/></a></div>
      </article>;
        })}</div>
    <p className="sample-license">{t("Public domain in the U.S. \u00B7 Chapter excerpts from Project Gutenberg. ")}<a href={`${import.meta.env.BASE_URL}samples/NOTICE.txt`} target="_blank" rel="noreferrer">{t("Sources, full editions & license")}</a>{t(". Copyright status varies outside the U.S.")}</p>
  </section>;
}
