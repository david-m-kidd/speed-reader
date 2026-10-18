import { useI18n, LanguageToggle, type Language } from '../i18n';
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, SkipBack, SkipForward, AlignLeft, X, Highlighter, Minus, Plus, Check, ArrowRight, Hand } from 'lucide-react';
import { Playback } from '../reader/engine';
import { Word } from '../reader/Word';
import { addActivity, type ReadingDocument, type Progress, type Settings, type Session } from '../domain/model';
import { db } from '../storage/database';
export function Reader({ doc, progress, settings, updateSettings, onLanguageChange, back, report }: {
    doc: ReadingDocument;
    progress?: Progress;
    settings: Settings;
    updateSettings: (s: Settings) => void; onLanguageChange: (language: Language) => void;
    back: () => void;
    report: (e: unknown) => void;
}) {
    const { t, locale } = useI18n();

    const [, redraw] = useState(0), [context, setContext] = useState(false), [contextIndex, setContextIndex] = useState(progress?.index || 0), [selection, setSelection] = useState<{
        start: number;
        end: number;
        quote: string;
    } | null>(null), [note, setNote] = useState(''), [saved, setSaved] = useState(false);
    const session = useRef<Session | null>(null), settingsRef = useRef(settings), engineRef = useRef<Playback | null>(null), ready = useRef(false), mounted = useRef(true), pointer = useRef<number | null>(null), completed = useRef(progress?.completed || false), contextEl = useRef<HTMLDivElement>(null), saveQueue = useRef(Promise.resolve());
    const saveError = useRef<unknown>(null);
    settingsRef.current = settings;
    const persist = useCallback(() => {
        const e = engineRef.current;
        if (!e || !ready.current)
            return Promise.resolve();
        if (e.state === 'ended')
            completed.current = true;
        const p: Progress = { documentId: doc.id, index: e.index, completed: completed.current, updatedAt: Date.now() };
        const s = session.current ? structuredClone(session.current) : null;
        saveQueue.current = saveQueue.current.catch(() => { }).then(() => db.transaction('rw', db.progress, db.sessions, async () => { await db.progress.put(p); if (s && (s.activeMs || s.words))
            await db.sessions.put(s); })).then(() => { saveError.current = null; }).catch(error => { saveError.current = error; report(error); });
        return saveQueue.current;
    }, [doc.id, report]);
    if (!engineRef.current) {
        engineRef.current = new Playback(doc.tokens, settings, () => { if (mounted.current)
            redraw(n => n + 1); const e = engineRef.current; if (ready.current && e?.state !== 'playing')
            void persist(); }, (words, ms) => {
            if (!session.current) {
                const now = Date.now();
                session.current = { id: crypto.randomUUID(), documentId: doc.id, startedAt: now - ms, endedAt: now, activeMs: 0, words: 0, days: {}, settings: { ...settingsRef.current } };
            }
            const end = Date.now();
            addActivity(session.current, end - ms, end, words);
        });
        engineRef.current.seek(progress?.index || 0);
    }
    const engine = engineRef.current;
    useEffect(() => {
        mounted.current = true;
        ready.current = true;
        const timer = setInterval(() => { if (engine.state === 'playing')
            void persist(); }, 1000);
        const pause = () => { engine.pause(); void persist(); };
        const visibility = () => { if (document.hidden)
            pause(); };
        const beforeUpdate = (event: Event) => { engine.pause(); (event as CustomEvent<Promise<void>[]>).detail.push(persist().then(() => { if (saveError.current)
            throw saveError.current; })); };
        document.addEventListener('visibilitychange', visibility);
        window.addEventListener('pagehide', pause);
        window.addEventListener('stillword:save', beforeUpdate);
        return () => { mounted.current = false; engine.dispose(); void persist(); clearInterval(timer); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', pause); window.removeEventListener('stillword:save', beforeUpdate); };
    }, [engine, persist]);
    useEffect(() => { engine.configure(settings); }, [engine, settings]);
    const playing = engine.state === 'playing';
    useEffect(() => {
        let released = false, lock: {
            release: () => Promise<void>;
        } | undefined;
        if (playing && 'wakeLock' in navigator)
            navigator.wakeLock.request('screen').then(value => { if (released)
                void value.release();
            else
                lock = value; }).catch(() => { });
        return () => { released = true; void lock?.release(); };
    }, [playing]);
    const toggle = useCallback(() => { if (engine.state === 'playing')
        engine.pause();
    else {
        if (engine.state === 'ended') {
            completed.current = false;
            engine.seek(0);
        }
        engine.play();
    } }, [engine]);
    const holdStart = (event: PointerEvent<HTMLButtonElement>, force = false) => {
        if ((!settings.hold && !force) || event.button !== 0)
            return;
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        if (engine.state === 'ended') {
            completed.current = false;
            engine.seek(0);
        }
        engine.play();
    };
    const holdEnd = (event: PointerEvent<HTMLButtonElement>) => { if (pointer.current === event.pointerId) {
        pointer.current = null;
        engine.pause();
    } };
    const holdCancel = () => { if (pointer.current !== null) {
        pointer.current = null;
        engine.pause();
    } };
    useEffect(() => {
        const key = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).closest('input,textarea,select,button,[contenteditable=true]'))
                return;
            if (e.key === 'Escape') {
                setContext(false);
                return;
            }
            if (context)
                return;
            if (e.code === 'Space') {
                e.preventDefault();
                toggle();
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                const dir = e.key === 'ArrowLeft' ? -1 : 1;
                if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey)
                    engine.sentence(dir);
                else if (engine.state !== 'playing')
                    engine.seek(engine.index + dir);
            }
        };
        document.addEventListener('keydown', key);
        return () => document.removeEventListener('keydown', key);
    }, [context, engine, toggle]);
    const openContext = () => { engine.pause(); setContextIndex(engine.index); setContext(true); setSelection(null); };
    const percentage = completed.current ? 100 : engine.index / doc.tokens.length * 100;
    const currentParagraph = doc.tokens[contextIndex]?.paragraph || 0;
    const locationAt = (index: number) => doc.locations?.findIndex(l => l.start <= doc.tokens[index].start && l.end > doc.tokens[index].start) ?? -1;
    const sourceLocation = doc.locations?.[locationAt(engine.index)];
    const first = doc.tokens.findIndex(t => t.paragraph >= Math.max(0, currentParagraph - 1));
    let last = doc.tokens.findIndex(t => t.paragraph > currentParagraph + 1);
    if (last < 0)
        last = doc.tokens.length;
    // Bound exceptionally long paragraphs to 700 tokens for a responsive phone context view.
    const windowStart = Math.max(first, contextIndex - 350), windowEnd = Math.min(last, windowStart + 700);
    const startOffset = doc.tokens[windowStart]?.start || 0;
    const readSelection = () => {
        const sel = window.getSelection(), el = contextEl.current;
        if (!sel || !el || sel.isCollapsed || !el.contains(sel.anchorNode) || !el.contains(sel.focusNode)) {
            setSelection(null);
            return;
        }
        const range = sel.getRangeAt(0), before = range.cloneRange();
        before.selectNodeContents(el);
        before.setEnd(range.startContainer, range.startOffset);
        const start = startOffset + before.toString().length, end = start + range.toString().length;
        if (end > start) {
            setSelection({ start, end, quote: doc.text.slice(start, end) });
            setSaved(false);
        }
    };
    return <div className={`reader-page ${playing ? 'is-playing' : ''}`}>
    <header className="reader-header"><div className="reader-header-left"><button className="text-button" aria-label={t("Library")} onClick={back}><ArrowLeft size={18}/><span>{t("Library")}</span></button><LanguageToggle onChange={onLanguageChange}/></div><div className="reader-title"><span className="eyebrow">{t("STILLWORD")}</span><h1>{doc.title}</h1></div><button className="secondary context-button" aria-label={t("Context")} onClick={openContext}><AlignLeft size={17}/><span>{t("Context")}</span></button></header>
    <div className="reader-stage">
      <button className="word-tap" data-testid="word-area" aria-label={settings.hold ? t("Hold word to read") : playing ? t("Pause reading") : t("Start reading")} onClick={e => { if (!settings.hold || e.detail === 0)
        toggle(); }} onPointerDown={holdStart} onPointerUp={holdEnd} onPointerCancel={holdCancel} onLostPointerCapture={holdCancel}><Word text={doc.tokens[engine.index]?.text || ''} settings={settings}/></button>
      <p className="reader-hint">{engine.state === 'ended' ? t("A moment well spent.") : settings.hold ? (playing ? t("A little space. One word at a time.") : t("Hold to begin. Let go to pause.")) : t("Tap the word or press space to read.")}</p>
    </div>
    <div className="reader-controls">
      <div className="position-label"><span>{Math.round(percentage)}% <span className="muted">{t("through")}</span></span><span>{Math.max(1, Math.ceil((doc.tokens.length - engine.index) / settings.wpm))}{t(" min left")}</span></div>
      <input className="progress-range" aria-label={t("Reading position")} type="range" min="0" max={doc.tokens.length - 1} value={engine.index} onChange={e => { completed.current = false; engine.seek(+e.target.value); }}/>
      <div className="reader-speed-row"><button className="icon-button" aria-label={t("Decrease speed")} disabled={settings.wpm <= 100} onClick={() => updateSettings({ ...settings, wpm: settings.wpm - 25 })}><Minus size={14}/></button><label><strong>{settings.wpm}</strong><span>{t("words / min")}</span><input className="sr-only" aria-label={t("Reading speed")} type="range" min="100" max="1000" step="25" value={settings.wpm} onChange={e => updateSettings({ ...settings, wpm: +e.target.value })}/></label><button className="icon-button" aria-label={t("Increase speed")} disabled={settings.wpm >= 1000} onClick={() => updateSettings({ ...settings, wpm: settings.wpm + 25 })}><Plus size={14}/></button></div>
      {settings.hold && <button className={`hold-button ${playing && pointer.current !== null ? 'is-held' : ''}`} data-testid="hold-control" aria-label={t("Hold to read")} onPointerDown={e => holdStart(e, true)} onPointerUp={holdEnd} onPointerCancel={holdCancel} onLostPointerCapture={holdCancel} onKeyDown={e => { if ((e.code === 'Space' || e.key === 'Enter') && !e.repeat) {
        e.preventDefault();
        if (engine.state === 'ended') {
            completed.current = false;
            engine.seek(0);
        }
        engine.play();
    } }} onKeyUp={e => { if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        engine.pause();
    } }} onBlur={() => { if (pointer.current !== null)
        holdCancel();
    else
        engine.pause(); }}><Hand size={18} strokeWidth={1.5}/><span>{playing && pointer.current !== null ? t("Reading\u2026") : t("Hold to read")}</span></button>}
      <div className="reader-utilities"><button className="icon-button" aria-label={t("Previous sentence")} title={t("Previous sentence")} onClick={() => engine.sentence(-1)}><SkipBack size={14}/></button><button className="icon-button quiet-rewind" aria-label={t("Rewind 10 words")} title={t("Back 10 words")} onClick={() => engine.seek(engine.index - 10)}><RotateCcw size={14}/><span>10</span></button><button className={`handsfree-button ${playing ? 'active' : ''} ${!settings.hold ? 'is-primary' : ''}`} aria-label={playing ? t("Pause") : engine.state === 'ended' ? t("Read again") : t("Play")} onClick={toggle}>{playing ? <Pause size={14}/> : <Play size={14}/>}<span>{playing ? t("Pause") : engine.state === 'ended' ? t("Read again") : settings.hold ? t("Hands-free") : t("Play")}</span></button><button className="icon-button" aria-label={t("Next sentence")} title={t("Next sentence")} onClick={() => engine.sentence(1)}><SkipForward size={14}/></button></div>
      <div className="reader-footnote"><span>{settings.punctuation || settings.longWords ? t("Natural pacing") : t("Even pacing")}</span><span>{session.current?.activeMs ? t("{0} effective WPM", [Math.round(session.current.words / session.current.activeMs * 60000)]) : t("{0} / {1} words", [(engine.index + 1).toLocaleString(locale), doc.tokens.length.toLocaleString(locale)])}</span></div>
      {sourceLocation && <div className="reader-attribution"><span>{sourceLocation.kind === 'page' ? t('Page {0}', [sourceLocation.label]) : sourceLocation.label}</span>{doc.author && <span>{doc.author}</span>}</div>}
      {doc.attribution && <div className="reader-attribution"><span>{doc.attribution.author}{t(" \u00B7 Chapter sample")}</span><a href={`${import.meta.env.BASE_URL}samples/NOTICE.txt`} target="_blank" rel="noreferrer">{t("Source & license")}</a></div>}
    </div>
    {context && <div className="modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="context-title" className="modal context-modal"><div className="section-heading"><div><span className="eyebrow">{t("PAUSED \u00B7 READ AT YOUR PACE")}</span><h2 id="context-title">{t("A little context.")}</h2></div><button autoFocus className="icon-button" aria-label={t("Close context")} onClick={() => setContext(false)}><X size={22}/></button></div><p className="fine">{t("Tap a word to return there. Select a passage, then save a highlight.")}</p>
      {!!doc.locations?.length && <label className="location-picker">{t('Page or chapter')}<select value={Math.max(0,locationAt(contextIndex))} onChange={e=>{const location=doc.locations![+e.target.value];const index=doc.tokens.findIndex(token=>token.start>=location.start&&token.start<location.end);if(index>=0){engine.seek(index);setContextIndex(index);setSelection(null);contextEl.current?.scrollTo(0,0);}}}>{doc.locations.map((location,i)=><option key={i} value={i} disabled={location.start===location.end}>{location.kind==='page'?t('Page {0}',[location.label]):location.label}</option>)}</select></label>}
      <div className="context-text" ref={contextEl} onMouseUp={readSelection} onTouchEnd={() => setTimeout(readSelection, 120)} onKeyUp={readSelection}>{doc.tokens.slice(windowStart, windowEnd).map((t, i) => <span key={t.id}>{i > 0 ? doc.text.slice(doc.tokens[t.id - 1].end, t.start) : ""}<span className={t.id === engine.index ? 'current-token' : ''} data-token={t.id} onClick={() => { if (!window.getSelection()?.isCollapsed)
            return; engine.seek(t.id); setContext(false); }}>{t.text}</span></span>)}</div>
      <div className="context-navigation"><button className="text-button" disabled={windowStart === 0} onClick={() => { setContextIndex(Math.max(0, windowStart - 1)); setSelection(null); contextEl.current?.scrollTo(0, 0); }}><ArrowLeft size={16}/>{t(" Earlier")}</button><span className="fine">{t("Words ")}{windowStart + 1}–{windowEnd}</span><button className="text-button" disabled={windowEnd >= doc.tokens.length} onClick={() => { setContextIndex(Math.min(doc.tokens.length - 1, windowEnd + 1)); setSelection(null); contextEl.current?.scrollTo(0, 0); }}>{t("Later")}<ArrowRight size={16}/></button></div>
      {selection && <div className="highlight-editor"><p>“{selection.quote.length > 180 ? selection.quote.slice(0, 180) + '…' : selection.quote}”</p><label>{t("Note (optional)")}<input placeholder={t("What stood out?")} value={note} onChange={e => setNote(e.target.value)}/></label><button className="primary" disabled={saved} onClick={async () => { try {
            await db.highlights.put({ id: crypto.randomUUID(), documentId: doc.id, ...selection, note, createdAt: Date.now() });
            setSaved(true);
            setNote('');
        }
        catch (e) {
            report(e);
        } }}>{saved ? <Check size={17}/> : <Highlighter size={17}/>} {saved ? t("Highlight saved") : t("Save highlight")}</button></div>}
    </section></div>}
  </div>;
}
