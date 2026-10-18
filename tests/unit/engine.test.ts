import { describe, it, expect } from 'vitest';
import { Playback, type Clock } from '../../src/reader/engine';
import { defaults, tokenize } from '../../src/domain/model';
function fixture(text = 'one two three') {
  let time = 0, seq = 0, words = 0, ms = 0;
  const jobs = new Map<number, { fn: () => void; at: number }>();
  const clock: Clock = { now: () => time, schedule: (fn, delay) => { jobs.set(++seq, { fn, at: time + delay }); return seq; }, cancel: h => { jobs.delete(h as number); } };
  const engine = new Playback(tokenize(text).tokens, { ...defaults, punctuation: false, longWords: false }, () => {}, (w, m) => { words += w; ms += m; }, clock);
  const tick = (delta: number) => { const end = time + delta; while (true) { const next = [...jobs].sort((a, b) => a[1].at - b[1].at)[0]; if (!next || next[1].at > end) break; time = next[1].at; jobs.delete(next[0]); next[1].fn(); } time = end; };
  return { engine, tick, jobs, counts: () => ({ words, ms }), late: (delta: number) => { time += delta; const next = [...jobs][0]; jobs.delete(next[0]); next[1].fn(); } };
}
describe('playback invariants', () => {
  it('shows each word for 200 ms at 300 WPM and counts the final interval once', () => { const f = fixture(); f.engine.play(); f.tick(199); expect(f.engine.index).toBe(0); f.tick(1); expect(f.engine.index).toBe(1); f.tick(400); expect(f.engine.state).toBe('ended'); expect(f.counts()).toEqual({ words: 3, ms: 600 }); f.tick(1000); expect(f.counts().words).toBe(3); expect(f.jobs.size).toBe(0); });
  it('pause freezes position and resumes only the remaining interval', () => { const f = fixture(); f.engine.play(); f.tick(70); f.engine.pause(); f.tick(500); expect(f.counts().words).toBe(0); expect(f.engine.index).toBe(0); f.engine.play(); f.tick(129); expect(f.engine.index).toBe(0); f.tick(1); expect(f.engine.index).toBe(1); });
  it('rescales only the remaining fraction on speed changes', () => { const f = fixture(); f.engine.play(); f.tick(100); f.engine.configure({ ...defaults, wpm: 600, punctuation: false, longWords: false }); f.tick(49); expect(f.engine.index).toBe(0); f.tick(1); expect(f.engine.index).toBe(1); expect(f.jobs.size).toBe(1); });
  it('seek invalidates stale callbacks and never counts skipped tokens', () => { const f = fixture('one two three four five'); f.engine.play(); const stale = [...f.jobs.values()][0].fn; f.tick(50); f.engine.seek(4); stale(); f.tick(500); expect(f.engine.index).toBe(4); expect(f.counts().words).toBe(0); f.engine.play(); f.tick(200); expect(f.counts().words).toBe(1); });
  it('repeated play/dispose cannot create duplicate advancement', () => { const f = fixture(); f.engine.play(); f.engine.play(); expect(f.jobs.size).toBe(1); f.engine.dispose(); f.engine.play(); f.tick(200); expect(f.counts().words).toBe(1); });
  it('seriously late callbacks pause without skipping unseen words', () => { const f = fixture(); f.engine.play(); f.late(5000); expect(f.engine.index).toBe(0); expect(f.engine.state).toBe('paused'); expect(f.counts().words).toBe(0); expect(f.jobs.size).toBe(0); });
  it('corrects small deadline drift while accounting actual active time', () => { const f = fixture(); f.engine.play(); f.late(208); f.tick(192); expect(f.engine.index).toBe(2); expect(f.counts()).toEqual({ words: 2, ms: 400 }); });
  it('resets after larger delays instead of creating catch-up bursts', () => { const f = fixture(); f.engine.play(); f.late(300); f.tick(199); expect(f.engine.index).toBe(1); f.tick(1); expect(f.engine.index).toBe(2); expect(f.counts()).toEqual({ words: 2, ms: 500 }); });
  it('sentence controls seek to sentence starts', () => { const f = fixture('one two. three four. five six.'); f.engine.seek(3); f.engine.sentence(-1); expect(f.engine.index).toBe(2); f.engine.sentence(-1); expect(f.engine.index).toBe(0); f.engine.sentence(1); expect(f.engine.index).toBe(2); });
});
