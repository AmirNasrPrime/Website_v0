/* ============================================================================
   PRIME-CAE · canvas sizing and on-screen-only draw loops
   ========================================================================== */
import { addTicker, reduced } from './dom.js';

/* Keeps the backing store matched to the CSS box at a capped device ratio. */
export function fitCanvas(canvas, maxDpr = 2) {
  const ctx = canvas.getContext('2d');
  const size = { w: 0, h: 0, dpr: 1 };
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const w = Math.round(r.width), h = Math.round(r.height);
    if (w === size.w && h === size.h && dpr === size.dpr) return true;
    size.w = w; size.h = h; size.dpr = dpr;
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  return { ctx, size, resize, dispose: () => ro.disconnect() };
}

/**
 * Draw only while the element is on screen and the tab is visible.
 * One frame is always painted on entry, so a paused figure is never blank.
 */
export function sceneLoop(el, draw, { fps = 30 } = {}) {
  let stop = null, visible = false, last = -1;
  const still = reduced();

  const paint = t => { try { draw(t); } catch (e) { console.error(e); } };

  const start = () => {
    if (stop || still) return;
    stop = addTicker(t => {
      if (fps && t - last < 1 / fps) return;
      last = t;
      paint(t);
    });
  };
  const halt = () => { if (stop) { stop(); stop = null; } };

  /* a resize clears the backing store; if the ticker is halted — a hidden tab,
     reduced motion — nothing would ever repaint it */
  const ro = new ResizeObserver(() => { if (visible) paint(performance.now() / 1000); });
  ro.observe(el);

  const io = new IntersectionObserver(es => {
    visible = es[0].isIntersecting;
    if (!visible) { halt(); return; }
    paint(performance.now() / 1000);
    if (!document.hidden) start();
  }, { rootMargin: '140px' });
  io.observe(el);

  document.addEventListener('visibilitychange', () => {
    if (visible && !document.hidden) { paint(performance.now() / 1000); start(); }
    else halt();
  });

  return { redraw: () => paint(performance.now() / 1000), halt, dispose: () => { halt(); io.disconnect(); ro.disconnect(); } };
}
