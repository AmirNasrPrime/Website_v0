/* ============================================================================
   PRIME-CAE · DOM + math helpers
   ========================================================================== */
export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const on = (node, type, fn, opts) => {
  if (node) node.addEventListener(type, fn, opts);
  return () => node && node.removeEventListener(type, fn, opts);
};

export const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

export const clamp  = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp   = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const fmt    = (v, d = 2) => v.toFixed(d);

/* deterministic RNG so every figure is identical on every visit */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const coarse  = () => window.matchMedia('(pointer: coarse)').matches;
export const narrow  = () => window.matchMedia('(max-width: 900px)').matches;

/* one shared rAF ticker — many small loops would each pay their own cost */
const tickers = new Set();
let running = false, t0 = performance.now();
function pump(now) {
  if (!tickers.size) { running = false; return; }
  requestAnimationFrame(pump);
  const t = (now - t0) / 1000;
  for (const fn of tickers) { try { fn(t); } catch (e) { tickers.delete(fn); console.error(e); } }
}
export function addTicker(fn) {
  tickers.add(fn);
  if (!running) { running = true; requestAnimationFrame(pump); }
  return () => tickers.delete(fn);
}

/**
 * Land a section under the header with its content at the top of the frame.
 * Anchoring on the section box itself lands on its top padding, which reads as
 * a large empty gap and pushes the actual content out of the window.
 */
export function scrollToSection(el, extra = 18) {
  if (!el) return;
  const nav = document.getElementById('nav');
  const navH = nav ? nav.getBoundingClientRect().height : 88;
  const head = el.querySelector('.sec-head, .shell') || el;
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const top = Math.min(max, Math.max(0,
    head.getBoundingClientRect().top + window.scrollY - navH - extra));
  window.scrollTo({ top, behavior: reduced() ? 'auto' : 'smooth' });
}
