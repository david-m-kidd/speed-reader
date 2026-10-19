import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { ArrowRight, Hand, Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react';
import { LanguageToggle, useI18n, type Language } from '../i18n';
import { tokenize, type Settings } from '../domain/model';
import { Playback, type PlaybackState } from '../reader/engine';
import { Word } from '../reader/Word';
import { demoText } from '../samples/demo';
export function Demo({ settings, onLanguageChange, finish }: { settings: Settings; onLanguageChange: (language: Language) => void; finish: () => Promise<void> }) {
  const { language,t }=useI18n();
  const model=useMemo(()=>tokenize(demoText[language]),[language]);
  const [wpm,setWpm]=useState(250),[snapshot,setSnapshot]=useState<{index:number;state:PlaybackState}>({index:0,state:'paused'}),[showText,setShowText]=useState(false),[leaving,setLeaving]=useState(false);
  const controller=useRef<Playback|null>(null),pointer=useRef<number|null>(null);
  const demoSettings=useMemo(()=>({...settings,wpm,hold:true}),[settings,wpm]);
  const settingsRef=useRef(demoSettings);settingsRef.current=demoSettings;
  useEffect(()=>{
    const engine=new Playback(model.tokens,settingsRef.current,()=>setSnapshot({index:engine.index,state:engine.state}),()=>{});
    controller.current=engine;setSnapshot({index:0,state:'paused'});pointer.current=null;
    const pause=()=>engine.pause(), visibility=()=>{if(document.hidden)pause();};
    document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pause);window.addEventListener('stillword:save',pause);
    return()=>{engine.dispose();controller.current=null;document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pause);window.removeEventListener('stillword:save',pause);};
  },[model]);
  useEffect(()=>{controller.current?.configure(demoSettings);},[demoSettings]);
  const ended=snapshot.state==='ended',playing=snapshot.state==='playing';
  const start=()=>{const engine=controller.current;if(!engine)return;if(engine.state==='ended')engine.seek(0);engine.play();};
  const pause=()=>controller.current?.pause();
  const toggle=()=>{if(controller.current?.state==='playing')pause();else start();};
  const release=()=>{if(pointer.current!==null){pointer.current=null;pause();}};
  const hold=(event:PointerEvent<HTMLButtonElement>)=>{if(event.button!==0)return;pointer.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);start();};
  const leave=async()=>{pause();setLeaving(true);try{await finish();}finally{setLeaving(false);}};
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{if((event.target as HTMLElement).closest('button,input,select,textarea,a,[contenteditable=true]'))return;if(event.code==='Space'){event.preventDefault();const engine=controller.current;if(engine?.state==='playing')engine.pause();else if(engine?.state!=='ended')engine?.play();}};
    document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);
  },[]);
  return <div className="demo-page">
    <header className="demo-header"><a className="brand" href="#demo" aria-label={t('Stillword demo')}>stillword<span className="brand-dot">.</span></a><div><LanguageToggle onChange={onLanguageChange}/><button className="text-button" disabled={leaving} onClick={()=>void leave()}>{t('Skip demo')}</button></div></header>
    <section className="demo-intro"><div className="eyebrow">{t('READER DEMO')}</div><h1>{t('Read one word at a time.')}</h1><p>{t('Keep your eyes on the highlighted letter. Hold to advance; release to pause.')}</p></section>
    <section className="demo-player" aria-label={t('Interactive reader demo')}>
      <button className="word-tap" data-testid="demo-word-area" aria-label={t('Hold word to read')} onPointerDown={hold} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onClick={e=>{if(e.detail===0)toggle();}} onBlur={release}><Word text={model.tokens[Math.min(snapshot.index,model.tokens.length-1)].text} settings={demoSettings}/></button>
      <div className="demo-position"><span>{t('{0} / {1} words',[snapshot.index+1,model.tokens.length])}</span><span>{t('Short introduction')}</span></div>
      <progress aria-label={t('Demo progress')} value={ended?model.tokens.length:snapshot.index} max={model.tokens.length}/>
      <div className="reader-speed-row"><button className="icon-button" aria-label={t('Decrease speed')} disabled={wpm<=100} onClick={()=>setWpm(wpm-25)}><Minus size={15}/></button><label><strong>{wpm}</strong><span>{t('words / min')}</span><input className="sr-only" type="range" aria-label={t('Demo reading speed')} min="100" max="1000" step="25" value={wpm} onChange={e=>setWpm(+e.target.value)}/></label><button className="icon-button" aria-label={t('Increase speed')} disabled={wpm>=1000} onClick={()=>setWpm(wpm+25)}><Plus size={15}/></button></div>
      <button className={`hold-button ${playing&&pointer.current!==null?'is-held':''}`} data-testid="demo-hold-control" onPointerDown={hold} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onKeyDown={e=>{if((e.code==='Space'||e.key==='Enter')&&!e.repeat){e.preventDefault();start();}}} onKeyUp={e=>{if(e.code==='Space'||e.key==='Enter'){e.preventDefault();pause();}}} onClick={e=>{if(e.detail===0)toggle();}} onBlur={()=>{pointer.current=null;pause();}}><Hand size={18}/>{t('Hold to read')}</button>
      <div className="demo-utilities"><button className="handsfree-button" aria-label={playing?t('Pause demo'):t('Play demo')} onClick={toggle}>{playing?<Pause size={14}/>:<Play size={14}/>}<span>{playing?t('Pause'):t('Play')}</span></button><button className="text-button" onClick={()=>controller.current?.seek(0)}><RotateCcw size={14}/>{t('Restart')}</button></div>
      <div className="demo-status" role="status">{ended?t('Demo complete. Continue to your library.'):t('Use Play if you prefer hands-free reading.')}</div>
      {ended&&<button className="primary demo-continue" disabled={leaving} onClick={()=>void leave()}>{t('Continue to library')}<ArrowRight size={17}/></button>}
    </section>
    <div className="demo-text-option"><button className="text-button" aria-expanded={showText} onClick={()=>{pause();setShowText(!showText);}}>{showText?t('Hide demo text'):t('Read demo as text')}</button>{showText&&<section className="demo-transcript"><h2>{t('Demo text')}</h2>{model.text.split('\n\n').map((paragraph,i)=><p key={i}>{paragraph}</p>)}<button className="primary" disabled={leaving} onClick={()=>void leave()}>{t('Continue to library')}<ArrowRight size={17}/></button></section>}</div>
    <footer className="demo-footer">{t('Next: choose a demo chapter or upload your own book.')}</footer>
  </div>;
}
