import { useI18n } from '../i18n';
import { Flame, Clock3, BookOpen, ArrowUpRight } from 'lucide-react';
import { currentStreak, dayKey, previousDate, type Session, type Settings } from '../domain/model';
export function StatsScreen({ sessions, settings }: {
    sessions: Session[];
    settings: Settings;
}) {
    const { t, locale } = useI18n();

    const today = dayKey(Date.now(), settings.timezone), days: Record<string, number> = {};
    let words = 0, ms = 0;
    sessions.forEach(s => { words += s.words; ms += s.activeMs; Object.entries(s.days).forEach(([k, v]) => { days[k] = (days[k] || 0) + v.words; }); });
    const week = [today];
    while (week.length < 7)
        week.unshift(previousDate(week[0]));
    const max = Math.max(settings.goal, ...week.map(d => days[d] || 0));
    return <div className="page"><div className="eyebrow">{t("ONE WORD AT A TIME")}</div><h1>{t("Attention")}<br /><em>{t("adds up.")}</em></h1><p className="lede">{t("A little reading, often. Your rhythm is what matters.")}</p>
    <div className="stat-cards"><div className="panel"><BookOpen size={20}/><strong>{words.toLocaleString(locale)}</strong><span>{t("words read")}</span></div><div className="panel"><Clock3 size={20}/><strong>{Math.round(ms / 60000).toLocaleString(locale)}<small>{t(" min")}</small></strong><span>{t("active reading time")}</span></div><div className="panel"><Flame size={20}/><strong>{currentStreak(days, today, settings.goal)}<small>{t(" days")}</small></strong><span>{t("current goal streak")}</span></div></div>
    <section className="panel activity"><div className="section-heading"><h2>{t("A week of small moments")}</h2><span className="pill">{t("LAST 7 DAYS")}</span></div><div className="chart" role="img" aria-label={week.map(d => t("{0}: {1} words", [d, (days[d] || 0).toLocaleString(locale)])).join('; ')}>{week.map(d => <div className={`chart-column ${d === today ? 'today' : ''}`} key={d}><span>{(days[d] || 0).toLocaleString(locale)}</span><div className="bar-track"><i style={{ height: `${Math.max(1, (days[d] || 0) / max * 100)}%` }}/></div><small>{new Date(`${d}T12:00:00Z`).toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' })}</small></div>)}</div></section>
    <div className="stats-foot"><p><strong>{(days[today] || 0).toLocaleString(locale)} / {settings.goal.toLocaleString(locale)}</strong>{t(" words toward today\u2019s goal")}</p><a className="text-button" href="#settings">{t("Adjust your goal")}<ArrowUpRight size={16}/></a></div><p className="fine">{t("Words count after their display interval finishes. Re-reading counts as activity; these totals do not measure unique coverage. Effective speed: ")}{ms ? Math.round(words / ms * 60000) : 0}{t(" WPM across active playback. Daily buckets follow the timezone saved with each session.")}</p>
  </div>;
}
