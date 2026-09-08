/* ============================================================================
   PRIME-CAE · environment reader
   A canvas has no way to inherit CSS, so it asks the environment it was placed
   in for the same --env-* contract every other component uses. The handle is
   mutated in place on resize and on load, so a figure can never keep drawing
   with ink from a background it no longer sits on.
   ========================================================================== */
const KEYS = {
  mode:        '--env-mode',
  bg:          '--env-bg',
  panel:       '--env-panel-solid',
  surface:     '--env-surface',
  text:        '--env-text',
  text2:       '--env-text-2',
  text3:       '--env-text-3',
  text4:       '--env-text-4',
  line:        '--env-line',
  lineStrong:  '--env-line-strong',
  lineActive:  '--env-line-active',
  grid:        '--env-grid',
  gridMajor:   '--env-grid-major',
  accent:      '--env-accent',
  accent2:     '--env-accent-2',
  accentWash:  '--env-accent-wash',
  accentEdge:  '--env-accent-edge',
  pass:        '--env-pass',
  warn:        '--env-warn',
  fail:        '--env-fail',
};

export function readEnv(el) {
  const host = (el && el.closest && el.closest('[data-env]')) || document.documentElement;
  const cs = getComputedStyle(host);
  const out = {};
  for (const k in KEYS) out[k] = cs.getPropertyValue(KEYS[k]).trim();
  out.isLight = out.mode === 'light';
  /* a neutral ink for structure that must simply be visible */
  out.ink = out.isLight ? 'rgba(9,43,74,' : 'rgba(190,222,255,';
  return out;
}

export function themeFor(el) {
  const t = {};
  const sync = () => Object.assign(t, readEnv(el));
  sync();
  window.addEventListener('resize', sync, { passive: true });
  window.addEventListener('load', sync);
  return t;
}

/** ink at an arbitrary alpha, correct for the local environment */
export const inkAt = (T, a) => `${T.ink}${a})`;
