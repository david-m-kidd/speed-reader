import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import spanish from './es.json';
export type Language = 'en' | 'es';
export function translate(text: string, language: Language, values: unknown[] = []): string {
  const key = text.trim();
  const value = language === 'es' ? (spanish as Record<string, string>)[key] ?? key : key;
  const leading = text.slice(0, text.length - text.trimStart().length);
  const trailing = text.slice(text.trimEnd().length);
  return leading + value.replace(/\{(\d+)\}/g, (_, n: string) => String(values[+n] ?? '')) + trailing;
}
const LanguageContext = createContext({ language: 'en' as Language, locale: 'en-US', setLanguage: (_: Language) => {}, t: (text: string, values?: unknown[]) => translate(text, 'en', values) });
export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  useEffect(() => { document.documentElement.lang = language; document.title = language === 'es' ? 'Stillword — Herramientas de lectura' : 'Stillword — Reading tools'; }, [language]);
  const value = useMemo(() => ({ language, locale: language === 'es' ? 'es-ES' : 'en-US', setLanguage, t: (text: string, values?: unknown[]) => translate(text, language, values) }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useI18n() { return useContext(LanguageContext); }
export function LanguageToggle({ onChange }: { onChange: (language: Language) => void }) {
  const { language, t } = useI18n();
  return <div className="language-toggle" role="group" aria-label={t('Interface language')}><button type="button" aria-label="English" title="English" aria-pressed={language === 'en'} onClick={() => onChange('en')}>EN</button><button type="button" aria-label="Español" title="Español" aria-pressed={language === 'es'} onClick={() => onChange('es')}>ES</button></div>;
}
