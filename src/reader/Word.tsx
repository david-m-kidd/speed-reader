import { useLayoutEffect, useRef, useState } from 'react';
import { anchor, type Settings } from '../domain/model';
export const fontFamilies = { sans: '"DM Sans Variable", system-ui, sans-serif', serif: 'Georgia, "Times New Roman", serif', mono: '"Courier New", monospace' };
const cache = new Map<string, number>();
export function Word({ text, settings }: { text: string; settings: Settings }) {
  const area = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({ shift: 0, size: settings.fontSize });
  const a = anchor(text);
  useLayoutEffect(() => {
    let cancelled = false;
    const measure = () => {
      if (!area.current || cancelled) return;
      const available = area.current.clientWidth / 2 - 18;
      const ctx = document.createElement('canvas').getContext('2d')!;
      ctx.fontKerning = 'none';
      const width = (part: string, size: number) => {
        const key = `${settings.font}:${size}:${part}`;
        if (!cache.has(key)) { ctx.font = `500 ${size}px ${fontFamilies[settings.font]}`; cache.set(key, ctx.measureText(part).width); if (cache.size > 12000) cache.clear(); }
        return cache.get(key) ?? ctx.measureText(part).width;
      };
      let size = settings.fontSize;
      const extents = (s: number) => a.glyph ? Math.max(width(a.prefix, s) + width(a.glyph, s) / 2, width(a.suffix, s) + width(a.glyph, s) / 2) : width(text, s) / 2;
      while (size > 16 && extents(size) > available) size--;
      // A uniform final scale handles extreme tokens while preserving the exact anchor center.
      const scale = Math.min(1, available / Math.max(1, extents(size)));
      if (area.current) area.current.style.setProperty('--word-scale', String(scale));
      setMetrics({ shift: a.glyph ? width(a.prefix, size) + width(a.glyph, size) / 2 : width(text, size) / 2, size });
    };
    const fontsLoaded = () => { cache.clear(); measure(); };
    measure();
    if (document.fonts.status !== 'loaded') document.fonts.ready.then(fontsLoaded);
    document.fonts.addEventListener('loadingdone', fontsLoaded);
    const observer = new ResizeObserver(measure); if (area.current) observer.observe(area.current);
    return () => { cancelled = true; observer.disconnect(); document.fonts.removeEventListener('loadingdone', fontsLoaded); };
  }, [text, settings.font, settings.fontSize, a.prefix, a.glyph, a.suffix]);
  return <div ref={area} className={`word-box ${settings.guides ? 'with-guides' : ''}`}>
    <span className="word-origin"><span className="word-scale"><span className="rsvp-word" data-testid="rsvp-word" style={{ fontSize: metrics.size, fontFamily: fontFamilies[settings.font], transform: `translateX(-${metrics.shift}px)` }}>{a.prefix}<span data-testid="anchor" style={{ color: settings.anchorColor }}>{a.glyph}</span>{a.suffix}</span></span></span>
  </div>;
}
