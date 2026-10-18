import { useI18n } from '../i18n';
import { useRef, useState } from 'react';
import { Download, Upload, ShieldCheck, Smartphone, Database, Check, ArrowUpRight } from 'lucide-react';
import { type Settings } from '../domain/model';
import { exportBackup, restoreBackup, validateBackup, type Backup } from '../storage/database';
export function SettingsScreen({ settings: s, update, restored, report, offline }: {
    settings: Settings;
    update: (s: Settings) => void;
    restored: () => Promise<void>;
    report: (e: unknown) => void;
    offline: boolean;
}) {
    const { t } = useI18n();

    const input = useRef<HTMLInputElement>(null), [backup, setBackup] = useState<Backup | null>(null), [replace, setReplace] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
    const set = <K extends keyof Settings>(key: K, value: Settings[K]) => update({ ...s, [key]: value });
    const toggle = (key: 'guides' | 'punctuation' | 'longWords' | 'hold' | 'reducedMotion', title: string, description: string) => <label className="toggle-row"><span><strong>{t(title)}</strong><small>{t(description)}</small></span><input type="checkbox" checked={s[key]} onChange={e => set(key, e.target.checked)}/></label>;
    return <div className="page settings-page"><div className="eyebrow">{t("MAKE IT YOURS")}</div><h1>{t("A comfortable")}<br /><em>{t("place to focus.")}</em></h1><p className="lede">{t("Small adjustments. A reading rhythm that feels like you.")}</p>
    <label className="settings-language">{t("Interface language")}<select aria-label={t("Interface language")} value={s.uiLanguage || 'en'} onChange={e => set('uiLanguage', e.target.value as 'en' | 'es')}><option value="en">English</option><option value="es">Español</option></select></label><div className="settings-grid"><section className="panel"><h2>{t("Reading appearance")}</h2>
      <label>{t("Theme")}<select value={s.theme} onChange={e => set('theme', e.target.value as Settings['theme'])}><option value="dark">{t("Forest at night")}</option><option value="light">{t("Morning light")}</option><option value="sepia">{t("Warm paper")}</option></select></label>
      <label>{t("Typeface")}<select value={s.font} onChange={e => set('font', e.target.value as Settings['font'])}><option value="sans">{t("Still Sans")}</option><option value="serif">{t("Book serif")}</option><option value="mono">{t("Monospace")}</option></select></label>
      <label>{t("Word size ")}<span className="value">{s.fontSize}{t("px")}</span><input type="range" min="24" max="80" step="1" value={s.fontSize} onChange={e => set('fontSize', +e.target.value)}/></label>
      <fieldset><legend>{t("Anchor color")}</legend><div className="swatches">{['#f17567', '#f7bc6b', '#96c9ac', '#aaafff'].map(color => <button key={color} aria-label={t("Anchor color {0}", [color])} aria-pressed={s.anchorColor === color} style={{ background: color }} onClick={() => set('anchorColor', color)}>{s.anchorColor === color && <Check size={17}/>}</button>)}</div></fieldset>
      {toggle('guides', 'Focal guides', 'Quiet markers above and below the anchor.')}{toggle('reducedMotion', 'Reduce motion', 'Keep interface transitions still.')}
    </section><section className="panel"><h2>{t("Your reading rhythm")}</h2>
      <label>{t("Default speed ")}<span className="value">{s.wpm}{t(" WPM")}</span><input aria-label={t("Default speed")} type="range" min="100" max="1000" step="25" value={s.wpm} onChange={e => set('wpm', +e.target.value)}/></label>
      {toggle('punctuation', 'Pause at punctuation', 'Make room for sentences and paragraphs.')}{toggle('longWords', 'Long-word pacing', 'A little extra time for longer words.')}{toggle('hold', 'Hold to read', 'Hold the word area to play. Release to pause.')}
      <label>{t("Daily word goal")}<input type="number" min="1" max="1000000" value={s.goal} onChange={e => { const value = +e.target.value; if (Number.isInteger(value) && value >= 1 && value <= 1000000)
        set('goal', value); }}/></label>
      <label>{t("Streak timezone")}<input key={s.timezone} defaultValue={s.timezone} onBlur={e => { try {
        new Intl.DateTimeFormat('en', { timeZone: e.target.value });
        set('timezone', e.target.value);
    }
    catch {
        e.target.value = s.timezone;
        setMessage('Use an IANA timezone, for example America/Denver.');
    } }}/></label><p className="fine">{t("A goal day ends at midnight in this timezone. Past session buckets keep their original timezone.")}</p>
    </section><section className="panel"><div className="section-heading"><h2>{t("Your library, protected")}</h2><Database size={20}/></div><p className="muted">{t("Browser storage can be cleared or evicted. A backup is the safest way to keep your reading.")}</p>
      <div className="button-row"><button className="secondary" onClick={async () => { try {
        const b = await exportBackup();
        const url = URL.createObjectURL(new Blob([JSON.stringify(b)], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `stillword-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        setMessage('Backup downloaded. Save it somewhere safe.');
    }
    catch (e) {
        report(e);
    } }}><Download size={17}/>{t(" Export backup")}</button><button className="secondary" disabled={busy} onClick={() => input.current?.click()}><Upload size={17}/>{t(" Restore backup")}</button></div>
      <input ref={input} className="sr-only" type="file" aria-label={t("Restore backup file")} accept=".json,application/json" onChange={async (e) => { const f = e.target.files?.[0]; if (!f)
        return; setBusy(true); try {
        if (f.size > 200 * 1024 * 1024)
            throw new Error('Backup exceeds the 200 MB restore limit.');
        setBackup(validateBackup(JSON.parse(await f.text())));
        setReplace(false);
    }
    catch (err) {
        report(err);
    }
    finally {
        setBusy(false);
        e.target.value = '';
    } }}/>
      <p className="fine">{t("Includes readable text, positions, highlights, settings and reading sessions. Original file bytes are excluded. A backup contains your private reading material.")}</p><button className="text-button" onClick={async () => { try {
        const granted = await navigator.storage?.persist?.();
        setMessage(granted ? 'Persistent storage granted. Keep exporting backups too.' : 'Persistent storage was not granted by this browser. Keep regular backups.');
    }
    catch (e) {
        report(e);
    } }}><ShieldCheck size={16}/>{t(" Request persistent storage")}</button>
    </section><section className="panel install-panel"><Smartphone size={28}/><h2>{t("Take a little stillness with you.")}</h2><p className="muted">{t("On iPhone, open the deployed HTTPS site in Safari, tap Share, then Add to Home Screen. Enable Open as Web App if offered.")}</p><span className={`status ${offline ? 'ready' : ''}`}><i />{offline ? t("Ready for offline reading") : t("Offline cache preparing \u00B7 network needed first")}</span><p className="fine">{t("No account. No analytics. No document uploads.")}</p><a className="text-button" href="#library">{t("Back to your reading")}<ArrowUpRight size={16}/></a></section></div>
    {message && <p className="notice" role="status">{t(message)}<button aria-label={t("Dismiss message")} onClick={() => setMessage('')}>×</button></p>}
    {backup && <div className="modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="restore-title" className="modal"><h2 id="restore-title">{t("Restore your library")}</h2><p>{backup.documents.length}{t(" documents \u00B7 ")}{backup.highlights.length}{t(" highlights \u00B7 ")}{backup.sessions.length}{t(" sessions")}</p><p className="muted">{t("Merge preserves newer positions and avoids duplicate IDs. Replace removes the current library before restoring this backup.")}</p><label className="toggle-row"><span>{t("Replace this device\u2019s library")}</span><input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)}/></label><div className="button-row"><button autoFocus className="secondary" disabled={busy} onClick={() => setBackup(null)}>{t("Cancel")}</button><button className={replace ? 'danger' : 'primary'} disabled={busy} onClick={async () => { setBusy(true); try {
        await restoreBackup(backup, replace);
        await restored();
        setBackup(null);
        setMessage('Your backup has been restored.');
    }
    catch (e) {
        report(e);
    }
    finally {
        setBusy(false);
    } }}>{busy ? t("Restoring\u2026") : replace ? t("Replace & restore") : t("Merge backup")}</button></div></section></div>}
  </div>;
}
