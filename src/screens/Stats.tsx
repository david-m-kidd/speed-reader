import { Flame, Clock3, BookOpen, ArrowUpRight } from 'lucide-react';
import { currentStreak, dayKey, previousDate, type Session, type Settings } from '../domain/model';
export function StatsScreen({ sessions, settings }: { sessions: Session[]; settings: Settings }) {
  const today = dayKey(Date.now(), settings.timezone), days: Record<string, number> = {};
  let words = 0, ms = 0;
  sessions.forEach(s => { words += s.words; ms += s.activeMs; Object.entries(s.days).forEach(([k, v]) => { days[k] = (days[k] || 0) + v.words; }); });
  const week = [today]; while (week.length < 7) week.unshift(previousDate(week[0]));
  const max = Math.max(settings.goal, ...week.map(d => days[d] || 0));
  return <div className="page"><div className="eyebrow">ONE WORD AT A TIME</div><h1>Attention<br/><em>adds up.</em></h1><p className="lede">A little reading, often. Your rhythm is what matters.</p>
    <div className="stat-cards"><div className="panel"><BookOpen size={20}/><strong>{words.toLocaleString()}</strong><span>words read</span></div><div className="panel"><Clock3 size={20}/><strong>{Math.round(ms / 60000).toLocaleString()}<small> min</small></strong><span>active reading time</span></div><div className="panel"><Flame size={20}/><strong>{currentStreak(days, today, settings.goal)}<small> days</small></strong><span>current goal streak</span></div></div>
    <section className="panel activity"><div className="section-heading"><h2>A week of small moments</h2><span className="pill">LAST 7 DAYS</span></div><div className="chart" role="img" aria-label={week.map(d => `${d}: ${days[d] || 0} words`).join('; ')}>{week.map(d => <div className={`chart-column ${d === today ? 'today' : ''}`} key={d}><span>{(days[d] || 0).toLocaleString()}</span><div className="bar-track"><i style={{ height: `${Math.max(1, (days[d] || 0) / max * 100)}%` }}/></div><small>{new Date(`${d}T12:00:00Z`).toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' })}</small></div>)}</div></section>
    <div className="stats-foot"><p><strong>{(days[today] || 0).toLocaleString()} / {settings.goal.toLocaleString()}</strong> words toward today’s goal</p><a className="text-button" href="#settings">Adjust your goal<ArrowUpRight size={16}/></a></div><p className="fine">Words count after their display interval finishes. Re-reading counts as activity; these totals do not measure unique coverage. Effective speed: {ms ? Math.round(words / ms * 60000) : 0} WPM across active playback. Daily buckets follow the timezone saved with each session.</p>
  </div>;
}
