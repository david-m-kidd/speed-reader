export type Token = { id: number; text: string; start: number; end: number; paragraph: number; sentence: number; paragraphEnd: boolean; sentenceEnd: boolean };
export type SourceLocation = { kind: 'page' | 'chapter'; label: string; start: number; end: number };
export type ReadingDocument = { id: string; title: string; source: 'text' | 'txt' | 'md' | 'html' | 'pdf' | 'epub'; text: string; tokens: Token[]; locations?: SourceLocation[]; author?: string; version: 1; tokenizer: 1; createdAt: number; updatedAt: number; sampleId?: string; attribution?: { author: string; sourceUrl: string; chapter: string } };
export type Progress = { documentId: string; index: number; completed: boolean; updatedAt: number };
export type Highlight = { id: string; documentId: string; start: number; end: number; quote: string; note: string; createdAt: number };
export type Settings = { demoCompleted?: boolean; uiLanguage?: 'en' | 'es'; wpm: number; theme: 'dark' | 'light' | 'sepia'; font: 'sans' | 'serif' | 'mono'; fontSize: number; anchorColor: string; guides: boolean; punctuation: boolean; longWords: boolean; hold: boolean; reducedMotion: boolean; goal: number; timezone: string };
export type Session = { id: string; documentId: string; startedAt: number; endedAt: number; activeMs: number; words: number; days: Record<string, { words: number; activeMs: number }>; settings: Settings };
export const defaults: Settings = { uiLanguage: 'en', wpm: 300, theme: 'dark', font: 'sans', fontSize: 52, anchorColor: '#f17567', guides: true, punctuation: true, longWords: true, hold: true, reducedMotion: false, goal: 2000, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
export const MAX_BYTES = 20 * 1024 * 1024;
export const MAX_TOKENS = 250_000;

export function graphemes(text: string): string[] {
  if (typeof Intl.Segmenter === 'function') return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), s => s.segment);
  const result: string[] = [];
  for (const c of Array.from(text)) {
    if (result.length && (/\p{M}|[\uFE0E\uFE0F\u200D]/u.test(c) || result[result.length - 1].endsWith('\u200D'))) result[result.length - 1] += c;
    else result.push(c);
  }
  return result;
}
export function anchor(text: string) {
  const chars = graphemes(text);
  const lexical = chars.map((g, i) => /[\p{L}\p{N}]/u.test(g) ? i : -1).filter(i => i >= 0);
  if (!lexical.length) return { prefix: '', glyph: '', suffix: text, length: 0 };
  const n = lexical.length;
  const offset = n === 1 ? 0 : n <= 5 ? 1 : n <= 9 ? 2 : n <= 13 ? 3 : 4;
  const i = lexical[Math.min(offset, n - 1)];
  return { prefix: chars.slice(0, i).join(''), glyph: chars[i], suffix: chars.slice(i + 1).join(''), length: n };
}
export function tokenize(input: string): { text: string; tokens: Token[] } {
  const text = input.replace(/\r\n?/g, '\n').split(String.fromCharCode(0)).join('').trim();
  const matches: RegExpMatchArray[] = [];
  for (const match of text.matchAll(/\S+/gu)) {
    if (matches.length === MAX_TOKENS) throw new Error('This document exceeds the 250,000-word limit. Split it into smaller documents. Nothing was truncated.');
    matches.push(match);
  }
  if (!matches.length) throw new Error('Add some text before saving.');
  if (matches.length > MAX_TOKENS) throw new Error('This document exceeds the 250,000-word limit. Split it into smaller documents. Nothing was truncated.');
  let paragraph = 0, sentence = 0;
  const tokens = matches.map((m, id): Token => {
    const start = m.index!, end = start + m[0].length;
    const gap = text.slice(end, matches[id + 1]?.index ?? text.length);
    const paragraphEnd = /\n\s*\n/u.test(gap) || id === matches.length - 1;
    const sentenceEnd = /[.!?…]["'”’»\])}]*$/u.test(m[0]) || paragraphEnd;
    const token = { id, text: m[0], start, end, paragraph, sentence, paragraphEnd, sentenceEnd };
    if (paragraphEnd) paragraph++;
    if (sentenceEnd) sentence++;
    return token;
  });
  return { text, tokens };
}
export function interval(token: Token, settings: Pick<Settings, 'wpm' | 'punctuation' | 'longWords'>) {
  let factor = 1;
  if (settings.punctuation) factor = token.paragraphEnd ? 2.2 : token.sentenceEnd ? 1.8 : /[,;:]["'”’»]*$/u.test(token.text) ? 1.35 : 1;
  if (settings.longWords && anchor(token.text).length > 10) factor *= 1.15;
  return 60_000 / settings.wpm * factor;
}
export function dayKey(timestamp: number, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(timestamp);
  return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type)!.value).join('-');
}
// Split active time at actual timezone midnight (including 23/25-hour DST days).
export function addActivity(session: Session, start: number, end: number, words: number) {
  session.activeMs += Math.max(0, end - start); session.words += words; session.endedAt = end;
  let cursor = start;
  while (cursor < end) {
    const key = dayKey(cursor, session.settings.timezone);
    let boundary = end;
    if (dayKey(end - 1, session.settings.timezone) !== key) {
      let lo = cursor, hi = end;
      while (hi - lo > 1) { const mid = Math.floor((lo + hi) / 2); if (dayKey(mid, session.settings.timezone) === key) lo = mid; else hi = mid; }
      boundary = hi;
    }
    session.days[key] ??= { words: 0, activeMs: 0 };
    session.days[key].activeMs += boundary - cursor;
    cursor = boundary;
  }
  const key = dayKey(end, session.settings.timezone);
  session.days[key] ??= { words: 0, activeMs: 0 };
  session.days[key].words += words;
}
export function previousDate(key: string) { const d = new Date(`${key}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); }
export function currentStreak(days: Record<string, number>, today: string, goal: number) {
  let key = (days[today] || 0) >= goal ? today : previousDate(today), count = 0;
  while ((days[key] || 0) >= goal) { count++; key = previousDate(key); }
  return count;
}
