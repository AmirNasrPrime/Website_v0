/* ============================================================================
   PRIME-CAE · field colour ramp
   The same six stops are mirrored in GLSL in the WebGL scenes, so a contour
   means the same thing everywhere on the site.
   ========================================================================== */
import { clamp, lerp } from './dom.js';

const STOPS = [
  [0.00, [ 11,  36,  92]],
  [0.22, [ 20, 100, 205]],
  [0.44, [ 41, 200, 224]],
  [0.62, [126, 226, 168]],
  [0.80, [240, 180,  41]],
  [1.00, [255,  84,  84]],
];

export function ramp(t) {
  t = clamp(t, 0, 1);
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i][0]) {
      const [p0, c0] = STOPS[i - 1], [p1, c1] = STOPS[i];
      const u = (t - p0) / (p1 - p0);
      return [Math.round(lerp(c0[0], c1[0], u)),
              Math.round(lerp(c0[1], c1[1], u)),
              Math.round(lerp(c0[2], c1[2], u))];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

export const rampCss = (t, a = 1) => {
  const c = ramp(t);
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
};

/* cool-only variant, for structure that is not carrying a physical field */
export function steel(t, a = 1) {
  t = clamp(t, 0, 1);
  return `rgba(${Math.round(lerp(20, 132, t * t))},${Math.round(lerp(42, 200, t))},${Math.round(lerp(72, 255, Math.sqrt(t)))},${a})`;
}

export const INK = {
  line:  'rgba(255,255,255,.055)',
  line2: 'rgba(255,255,255,.11)',
  faint: 'rgba(255,255,255,.24)',
  soft:  'rgba(255,255,255,.42)',
  blue:  'rgba(92,166,255,.9)',
  blueS: 'rgba(92,166,255,.28)',
  cyan:  'rgba(34,201,212,.85)',
  warm:  'rgba(240,150,80,.9)',
  pass:  'rgba(47,190,139,.92)',
  fail:  'rgba(224,83,83,.95)',
};

/* Re-alpha a colour that came from the environment contract. Values arrive as
   #rrggbb, rgb() or rgba(); anything else is returned untouched. */
export function withAlpha(col, a) {
  if (!col) return `rgba(128,128,128,${a})`;
  col = col.trim();
  if (col[0] === '#') {
    const h = col.slice(1);
    const n = h.length === 3
      ? h.split('').map(c => parseInt(c + c, 16))
      : [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
    return `rgba(${n[0]},${n[1]},${n[2]},${a})`;
  }
  const m = col.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const p = m[1].split(/[,\s/]+/).filter(Boolean);
    return `rgba(${p[0]},${p[1]},${p[2]},${a})`;
  }
  return col;
}
