import { interval, type Token, type Settings } from '../domain/model';
export type PlaybackState = 'idle' | 'paused' | 'playing' | 'ended';
export type Clock = { now: () => number; schedule: (fn: () => void, ms: number) => unknown; cancel: (handle: unknown) => void };
const browserClock: Clock = { now: () => performance.now(), schedule: (fn, ms) => setTimeout(fn, ms), cancel: h => clearTimeout(h as ReturnType<typeof setTimeout>) };
export class Playback {
  state: PlaybackState = 'idle';
  index = 0;
  private timer: unknown;
  private generation = 0;
  private duration = 0;
  private remaining = 0;
  private sliceStart = 0;
  private deadline = 0;
  constructor(public tokens: Token[], public settings: Settings, private changed: () => void, private activity: (words: number, ms: number) => void, private clock = browserClock) {
    this.state = tokens.length ? 'paused' : 'idle'; this.resetInterval();
  }
  private invalidate() { this.generation++; if (this.timer !== undefined) this.clock.cancel(this.timer); this.timer = undefined; }
  private resetInterval() { this.duration = this.tokens[this.index] ? interval(this.tokens[this.index], this.settings) : 0; this.remaining = this.duration; }
  private account(completing = false) { const elapsed = Math.max(0, this.clock.now() - this.sliceStart); this.activity(0, completing ? elapsed : Math.min(elapsed, this.remaining)); this.remaining = Math.max(0, this.remaining - elapsed); this.sliceStart = this.clock.now(); }
  private schedule() {
    const generation = this.generation;
    this.timer = this.clock.schedule(() => {
      if (generation !== this.generation || this.state !== 'playing') return;
      const now = this.clock.now();
      // Never burst through words the reader did not see after a suspended/late timer.
      if (now - this.deadline > Math.max(1000, this.duration * 3)) { this.pause(); return; }
      if (now + 0.5 < this.deadline) { this.schedule(); return; }
      this.account(true); this.activity(1, 0);
      if (this.index === this.tokens.length - 1) { this.invalidate(); this.state = 'ended'; this.changed(); return; }
      const previousDeadline = this.deadline;
      this.index++; this.resetInterval(); this.sliceStart = now;
      this.deadline = (now - previousDeadline > 16 ? now : previousDeadline) + this.remaining;
      this.changed(); this.schedule();
    }, Math.max(0, this.deadline - this.clock.now()));
  }
  play() {
    if (!this.tokens.length || this.state === 'playing' || this.state === 'ended') return;
    this.invalidate(); this.state = 'playing'; this.sliceStart = this.clock.now(); this.deadline = this.sliceStart + this.remaining; this.schedule(); this.changed();
  }
  pause() { if (this.state !== 'playing') return; this.account(); this.invalidate(); this.state = 'paused'; this.changed(); }
  seek(index: number) { this.pause(); this.invalidate(); this.index = Math.max(0, Math.min(this.tokens.length - 1, Math.round(index))); this.resetInterval(); this.state = this.tokens.length ? 'paused' : 'idle'; this.changed(); }
  configure(settings: Settings) {
    const playing = this.state === 'playing'; if (playing) this.account();
    const fraction = this.duration ? this.remaining / this.duration : 1;
    this.invalidate(); this.settings = settings; this.resetInterval(); this.remaining *= fraction;
    if (playing) { this.sliceStart = this.clock.now(); this.deadline = this.sliceStart + this.remaining; this.schedule(); }
    this.changed();
  }
  sentence(direction: -1 | 1) {
    const current = this.tokens[this.index]?.sentence;
    let i = this.index;
    if (direction === -1) { while (i > 0 && this.tokens[i - 1].sentence === current) i--; if (i === this.index && i > 0) { i--; const s = this.tokens[i].sentence; while (i > 0 && this.tokens[i - 1].sentence === s) i--; } }
    else { while (i < this.tokens.length - 1 && this.tokens[i].sentence === current) i++; }
    this.seek(i);
  }
  dispose() { this.pause(); this.invalidate(); }
}
