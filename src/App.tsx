import { useI18n, LanguageToggle } from './i18n';
import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Plus, Highlighter, BarChart3, Settings as SettingsIcon, ArrowUpRight, ArrowRight, Search, MoreHorizontal, Leaf, ShieldCheck, WifiOff, X, Play, Trash2 } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { defaults, dayKey, type ReadingDocument, type Progress, type Settings, type Highlight, type Session } from './domain/model';
import { db, deleteDocument, storageError } from './storage/database';
import { Demo } from './screens/Demo';
import { ImportScreen } from './screens/Import';
import { Reader } from './screens/Reader';
import { SettingsScreen } from './screens/Settings';
import { StatsScreen } from './screens/Stats';
import { Samples } from './samples/Samples';
const go = (route: string) => { location.hash = route; };
export default function App() {
    const { t, locale, setLanguage } = useI18n();

    const [route, setRoute] = useState(location.hash.slice(1) || 'home'), [loaded, setLoaded] = useState(false), [error, setError] = useState(''), [settings, setSettings] = useState<Settings>(defaults);
    useEffect(() => { setLanguage(settings.uiLanguage || 'en'); }, [settings.uiLanguage, setLanguage]);
    const [documents, setDocuments] = useState<ReadingDocument[]>([]), [progress, setProgress] = useState<Progress[]>([]), [highlights, setHighlights] = useState<Highlight[]>([]), [sessions, setSessions] = useState<Session[]>([]);
    const [search, setSearch] = useState(''), [sort, setSort] = useState('recent'), [remove, setRemove] = useState<ReadingDocument | null>(null), [online, setOnline] = useState(navigator.onLine);
    const report = useCallback((e: unknown) => setError(storageError(e)), []);
    const refresh = useCallback(async () => { const [d, p, h, ss, pref] = await Promise.all([db.documents.toArray(), db.progress.toArray(), db.highlights.toArray(), db.sessions.toArray(), db.preferences.get('settings')]); setDocuments(d); setProgress(p); setHighlights(h); setSessions(ss); setSettings(pref?.value || defaults); }, []);
    useEffect(() => { refresh().then(() => setLoaded(true)).catch(report); }, [refresh, report]);
    useEffect(() => {
        const changed = () => { const next = location.hash.slice(1) || 'home'; const pending: Promise<void>[] = []; window.dispatchEvent(new CustomEvent('stillword:save', { detail: pending })); void Promise.all(pending).then(refresh).catch(report).finally(() => setRoute(next)); };
        const connectivity = () => setOnline(navigator.onLine);
        window.addEventListener('hashchange', changed);
        window.addEventListener('online', connectivity);
        window.addEventListener('offline', connectivity);
        return () => { window.removeEventListener('hashchange', changed); window.removeEventListener('online', connectivity); window.removeEventListener('offline', connectivity); };
    }, [refresh, report]);
    // Constrain keyboard focus to whichever modal is open, including backup and context dialogs.
    useEffect(() => {
        const key = (event: KeyboardEvent) => {
            const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
            if (!dialog || event.key !== 'Tab')
                return;
            const items = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select,textarea,a[href]')).filter(el => el.offsetParent !== null);
            const first = items[0], last = items[items.length - 1];
            if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
                event.preventDefault();
                last?.focus();
            }
            else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
                event.preventDefault();
                first?.focus();
            }
        };
        document.addEventListener('keydown', key);
        return () => document.removeEventListener('keydown', key);
    }, []);
    useEffect(() => { document.documentElement.dataset.theme = settings.theme; document.documentElement.dataset.motion = settings.reducedMotion ? 'reduced' : 'full'; }, [settings.theme, settings.reducedMotion]);
    const { offlineReady: [offlineReady], needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({ onRegisterError: report });
    const [offlineCached, setOfflineCached] = useState(false);
    useEffect(() => {
        if (!('serviceWorker' in navigator) || !('caches' in window))
            return;
        let cancelled = false;
        navigator.serviceWorker.ready.then(async (registration) => {
            const shell = await caches.match(new URL(`${import.meta.env.BASE_URL}index.html`, location.origin).href, { ignoreSearch: true });
            if (!cancelled && registration.active && shell)
                setOfflineCached(true);
        }).catch(() => { });
        return () => { cancelled = true; };
    }, [offlineReady]);
    const offlineAvailable = offlineReady || offlineCached;
    const updateSettings = useCallback((s: Settings) => { setSettings(s); void db.preferences.put({ id: 'settings', value: s }).catch(report); }, [report]);
    const saveDocument = async (d: ReadingDocument) => { await db.documents.put(d); await refresh(); go(`reader/${d.id}`); };
    const showingDemo = route === 'demo' || (route === 'home' && !settings.demoCompleted && !documents.length);
    const finishDemo = async () => { try { const next = { ...settings, demoCompleted: true }; await db.preferences.put({ id: 'settings', value: next }); setSettings(next); go('library'); } catch (e) { report(e); } };
    const reading = showingDemo || route.startsWith('reader/'), doc = documents.find(d => d.id === route.slice(7));
    const today = dayKey(Date.now(), settings.timezone), todayWords = sessions.reduce((sum, s) => sum + (s.days[today]?.words || 0), 0);
    const getProgress = (id: string) => progress.find(p => p.documentId === id);
    const recent = [...documents].sort((a, b) => (getProgress(b.id)?.updatedAt || b.createdAt) - (getProgress(a.id)?.updatedAt || a.createdAt))[0];
    const filtered = documents.filter(d => d.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'length' ? a.tokens.length - b.tokens.length : (getProgress(b.id)?.updatedAt || b.createdAt) - (getProgress(a.id)?.updatedAt || a.createdAt));
    const nav = [{ id: 'library', label: 'My library', icon: BookOpen }, { id: 'highlights', label: 'Highlights', icon: Highlighter }, { id: 'stats', label: 'Reading activity', icon: BarChart3 }, { id: 'settings', label: 'Settings', icon: SettingsIcon }];
    return <><a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>{t("Skip to content")}</a>
    {!reading && <aside className="sidebar"><a href="#library" className="brand" aria-label={t("Stillword home")}><span className="brand-icon"><Leaf size={22}/></span>{t("stillword")}<span className="brand-dot">.</span></a><div className="sidebar-caption">{t("PERSONAL READER")}</div><nav aria-label={t("Main navigation")}>{nav.map(n => <a href={`#${n.id}`} key={n.id} aria-current={route === n.id ? 'page' : undefined} className={route === n.id ? 'active' : ''}><n.icon size={19}/><span>{t(n.label)}</span>{n.id === 'library' && <small>{documents.length}</small>}</a>)}</nav><button className="primary sidebar-add" onClick={() => go('import')}><Plus size={18}/>{t(" Add a read")}</button><div className="sidebar-bottom"><span className="tiny-leaf"><Leaf size={20}/></span><p>{t("Local library.")}<br />{t("No account required.")}</p><div className="local-badge"><ShieldCheck size={13}/>{t(" PRIVATE BY DEFAULT")}</div></div></aside>}
    <main id="main-content" tabIndex={-1} className={reading ? 'main-reader' : 'main'}>
      {!reading && <header className="topbar"><span>{t("READING WORKSPACE")}</span><div><LanguageToggle onChange={uiLanguage => updateSettings({ ...settings, uiLanguage })}/><span className="status"><i />{online ? t("Stored on this device") : t("You\u2019re offline")}</span><span className="avatar" aria-label={t("Personal library")}>SW</span></div></header>}
      {error && <div className="error global-error" role="alert">{t(error)}<button aria-label={t("Dismiss error")} onClick={() => setError('')}><X size={18}/></button></div>}
      {!loaded ? <div className="page"><h1>{t("Opening your library\u2026")}</h1><p className="muted">{error ? t("Resolve the storage issue above, then reload this page.") : t("Loading saved documents.")}</p></div> : showingDemo ? <Demo settings={settings} onLanguageChange={uiLanguage => updateSettings({ ...settings, uiLanguage })} finish={finishDemo}/> : reading ? doc ? <Reader key={doc.id} doc={doc} progress={getProgress(doc.id)} settings={settings} updateSettings={updateSettings} onLanguageChange={uiLanguage => updateSettings({ ...settings, uiLanguage })} back={() => go('library')} report={report}/> : <div className="page"><h1>{t("This read isn\u2019t here.")}</h1><a href="#library">{t("Return to your library")}</a></div> : route === 'import' ? <ImportScreen save={saveDocument} back={() => go('library')}/> : route === 'settings' ? <SettingsScreen settings={settings} update={updateSettings} restored={refresh} report={report} offline={offlineAvailable}/> : route === 'stats' ? <StatsScreen sessions={sessions} settings={settings}/> : route === 'highlights' ? <div className="page"><div className="eyebrow">{t("HIGHLIGHTS")}</div><h1>{t("Saved highlights")}</h1><p className="lede">{t("Review saved passages and notes.")}</p><div className="highlights-list">{highlights.length ? [...highlights].sort((a, b) => b.createdAt - a.createdAt).map(h => <article className="panel highlight-card" key={h.id}><Highlighter size={18}/><blockquote>{h.quote}</blockquote>{h.note && <p className="muted">{h.note}</p>}<div className="section-heading"><button className="text-button" onClick={async () => { const d = documents.find(d => d.id === h.documentId); if (!d)
            return; const index = d.tokens.findIndex(t => t.end > h.start); await db.progress.put({ documentId: d.id, index: Math.max(0, index), completed: false, updatedAt: Date.now() }); await refresh(); go(`reader/${d.id}`); }}>{documents.find(d => d.id === h.documentId)?.title}<ArrowUpRight size={16}/></button><button className="icon-button" aria-label={t("Delete highlight")} onClick={async () => { try {
            await db.highlights.delete(h.id);
            await refresh();
        }
        catch (e) {
            report(e);
        } }}><Trash2 size={16}/></button></div></article>) : <div className="empty-state"><Highlighter size={32}/><h2>{t("No highlights yet.")}</h2><p>{t("Open a read\u2019s context view and select a passage to save your first highlight.")}</p><a className="text-button" href="#library">{t("Open library")}<ArrowRight size={16}/></a></div>}</div></div> : <div className="page library-page"><div className="page-intro"><div><div className="eyebrow">{t("LIBRARY")}</div><h1>{t("Your library")}</h1><p className="lede">{t("Continue reading, open a demo chapter, or import a document.")}</p></div><div className="daily-goal"><div className="goal-ring" style={{ '--progress': `${Math.min(100, todayWords / settings.goal * 100)}%` } as React.CSSProperties}><Leaf size={23}/></div><span><strong>{todayWords.toLocaleString(locale)} <small>/ {settings.goal.toLocaleString(locale)}</small></strong><small>{t("words read today")}</small></span></div></div>
        {recent ? <section className="continue-card"><div className="mini-cover" aria-hidden="true"><span>{t("STILLWORD")}<br />{t("LIBRARY")}</span><i>{recent.title.slice(0, 1)}</i><Leaf size={22}/></div><div className="continue-copy"><div className="eyebrow">{getProgress(recent.id)?.completed ? t("COMPLETED") : t("CONTINUE READING")}</div><h2>{recent.title}</h2><p>{recent.tokens.length.toLocaleString(locale)}{t(" words ")}<span>·</span> {Math.max(1, Math.ceil((recent.tokens.length - (getProgress(recent.id)?.index || 0)) / settings.wpm))}{t(" min remaining")}</p><div className="thin-progress"><i style={{ width: `${getProgress(recent.id)?.completed ? 100 : (getProgress(recent.id)?.index || 0) / recent.tokens.length * 100}%` }}/></div></div><button className="primary" onClick={() => go(`reader/${recent.id}`)}><Play size={16} fill="currentColor"/>{getProgress(recent.id) ? t("Continue reading") : t("Start reading")}</button></section> : <section className="welcome-card"><span className="welcome-mark" aria-hidden="true"><Leaf size={62} strokeWidth={1}/><i /></span><div><div className="eyebrow">{t("GET STARTED")}</div><h2>{t("Build your library.")}</h2><p>{t("Upload a document or choose one of the demo chapters below.")}</p><button className="primary" onClick={() => go('import')}>{t("Add your first read")}<Plus size={17}/></button></div><span className="welcome-number" aria-hidden="true">{t("Aa")}</span></section>}
        {documents.length > 0 && <section className="library-section"><div className="section-heading library-heading"><div><h2>{t("Your reading shelf ")}<span className="count">{documents.length}</span></h2><p className="muted">{t("Documents saved on this device.")}</p></div><div className="library-tools"><label className="search-field"><Search size={17}/><input aria-label={t("Search library")} placeholder={t("Find a read\u2026")} value={search} onChange={e => setSearch(e.target.value)}/></label><select aria-label={t("Sort library")} value={sort} onChange={e => setSort(e.target.value)}><option value="recent">{t("Recently opened")}</option><option value="title">{t("Title A\u2013Z")}</option><option value="length">{t("Shortest first")}</option></select></div></div>
        <div className="book-grid">{filtered.map((d, i) => { const p = getProgress(d.id), percent = p?.completed ? 100 : (p?.index || 0) / d.tokens.length * 100; return <article className="book-card" key={d.id}><button className={`book-cover cover-${i % 4}`} aria-label={t("Read {0}", [d.title])} onClick={() => go(`reader/${d.id}`)}><span className="cover-label">{t("YOUR PERSONAL LIBRARY ")}<span>№ {String(i + 1).padStart(2, '0')}</span></span><span className="cover-title">{d.title}</span><span className="cover-art" aria-hidden="true"><i /><i /><i /></span><span className="cover-footer">{t("STILLWORD ")}<ArrowUpRight size={18}/></span></button><div className="book-info"><div><h3><button onClick={() => go(`reader/${d.id}`)}>{d.title}</button></h3><p>{d.source.toUpperCase()} <span>·</span> {d.tokens.length.toLocaleString(locale)}{t(" words")}</p></div><button className="icon-button" aria-label={t("Delete {0}", [d.title])} title={t("Delete read")} onClick={() => setRemove(d)}><MoreHorizontal size={19}/></button></div><div className="book-progress"><span>{p?.completed ? t("Finished") : p ? t("{0}% complete", [Math.round(percent)]) : t("Not started")}</span><span>{Math.max(1, Math.ceil(d.tokens.length / settings.wpm))}{t(" min")}</span></div><div className="thin-progress"><i style={{ width: `${percent}%` }}/></div></article>; })}<button className="add-card" onClick={() => go('import')}><span><Plus size={26}/></span><strong>{t("Import a document")}</strong><small>{t("Add a new read")}</small></button></div>{search && !filtered.length && <p className="muted">{t("No reads match \u201C")}{search}”.</p>}</section>}
        <div className="sample-strip"><span><strong>{t('Reader demo')}</strong>{t(' Review the controls before starting a book.')}</span><button className="text-button" onClick={() => go('demo')}>{t('Replay demo')}<ArrowRight size={17}/></button></div>
        <Samples documents={documents} save={saveDocument} open={id => go(`reader/${id}`)} report={report}/>
        <footer className="library-footer"><span><ShieldCheck size={14}/>{t(" Books and progress are stored only on this device.")}</span><a href="#settings">{offlineAvailable ? t("Offline ready") : t("Install & back up")}{offlineAvailable ? <WifiOff size={14}/> : <ArrowUpRight size={14}/>}</a></footer>
      </div>}
      {!reading && <nav className="mobile-nav" aria-label={t("Mobile navigation")}>{nav.map(n => <a key={n.id} href={`#${n.id}`} className={route === n.id ? 'active' : ''}><n.icon size={20}/><span>{n.label === 'Reading activity' ? t("Activity") : n.label === 'My library' ? t("Library") : t(n.label)}</span></a>)}</nav>}
    </main>
    {needRefresh && <div className="update-toast" role="status"><strong>{t("A fresh version is ready.")}</strong><p>{t("Your reading place will be saved before reloading.")}</p><button className="primary" onClick={async () => { const pending: Promise<void>[] = []; window.dispatchEvent(new CustomEvent('stillword:save', { detail: pending })); try {
        await Promise.all(pending);
        await updateServiceWorker(true);
    }
    catch (e) {
        report(e);
    } }}>{t("Save & reload")}</button><button className="text-button" onClick={() => setNeedRefresh(false)}>{t("Later")}</button></div>}
    {remove && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">{t("Remove this read?")}</h2><p>“{remove.title}{t("\u201D and its progress, highlights, and activity will be removed from this device. Export a backup first if you want to keep it.")}</p><div className="button-row"><button autoFocus className="secondary" onClick={() => setRemove(null)}>{t("Keep it")}</button><button className="danger" onClick={async () => { try {
        await deleteDocument(remove.id);
        setRemove(null);
        await refresh();
    }
    catch (e) {
        report(e);
    } }}>{t("Delete read")}</button></div></section></div>}
  </>;
}
