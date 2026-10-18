import { describe, it, expect, vi } from 'vitest';
import { anchor, graphemes, tokenize, interval, defaults, dayKey, addActivity, currentStreak, type Session } from '../../src/domain/model';
describe('normalized tokens and anchors', () => {
  it('preserves accents, punctuation, UTF-16 offsets and paragraphs', () => {
    const { text, tokens } = tokenize('  ¡Hola, café! 👩‍💻\r\n\r\nAño nuevo.  ');
    expect(tokens.map(t => t.text)).toEqual(['¡Hola,', 'café!', '👩‍💻', 'Año', 'nuevo.']);
    for (const t of tokens) expect(text.slice(t.start, t.end)).toBe(t.text);
    expect(tokens[2].paragraphEnd).toBe(true); expect(tokens[3].paragraph).toBe(1);
    expect(tokens[0].sentence).toBe(0); expect(tokens[2].sentence).toBe(1);
  });
  it.each([['a', 'a'], ['“café,”', 'a'], ['número', 'm'], ['extraordinario', 'a'], ['abcdefghijklmnop', 'e'], ['¡', '']])('selects a lexical anchor for %s', (text, letter) => { expect(anchor(text).glyph).toBe(letter); });
  it('handles combining accents and emoji without slicing a grapheme', () => { expect(graphemes('a\u0301👩‍💻')).toEqual(['a\u0301', '👩‍💻']); expect(anchor('a\u0301').glyph).toBe('a\u0301'); });
  it('uses a tested fallback when Segmenter is unavailable', () => { vi.stubGlobal('Intl', { ...Intl, Segmenter: undefined }); expect(graphemes('a\u0301👩‍💻')).toEqual(['a\u0301', '👩‍💻']); vi.unstubAllGlobals(); });
  it('rejects empty and oversized token streams', () => { expect(() => tokenize(' ')).toThrow(); expect(() => tokenize('a '.repeat(250001))).toThrow('250,000'); });
  it('uses max boundary pacing and multiplies only long word factor', () => { const { tokens } = tokenize('Hello, extraordinary.'); expect(interval(tokens[0], defaults)).toBe(270); expect(interval(tokens[1], defaults)).toBeCloseTo(200 * 2.2 * 1.15); expect(interval(tokens[1], { ...defaults, punctuation: false, longWords: false })).toBe(200); });
});
describe('local daily accounting', () => {
  it('uses the configured timezone instead of UTC dates', () => { expect(dayKey(Date.parse('2026-10-18T01:00:00Z'), 'America/Denver')).toBe('2026-10-17'); });
  it.each([['2026-03-08T06:59:59.000Z', '2026-03-08T07:00:01.000Z', '2026-03-07', '2026-03-08'], ['2026-11-01T05:59:59.000Z', '2026-11-01T06:00:01.000Z', '2026-10-31', '2026-11-01']])('splits midnight around DST dates: %s', (a, b, dayA, dayB) => { const s: Session = { id: 's', documentId: 'd', startedAt: Date.parse(a), endedAt: Date.parse(a), words: 0, activeMs: 0, days: {}, settings: { ...defaults, timezone: 'America/Denver' } }; addActivity(s, Date.parse(a), Date.parse(b), 1); expect(s.days[dayA]).toEqual({ words: 0, activeMs: 1000 }); expect(s.days[dayB]).toEqual({ words: 1, activeMs: 1000 }); });
  it('does not break yesterday’s streak before today is finished', () => { expect(currentStreak({ '2026-10-16': 2000, '2026-10-15': 2500 }, '2026-10-17', 2000)).toBe(2); });
});
