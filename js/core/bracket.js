/* ============================================================================
   PRIME-CAE · the reference structure
   ----------------------------------------------------------------------------
   One compact, deliberately generic three-interface structural bracket, shared
   by every 2D figure on the site. Geometry, extrusion, response field, element
   mesh and sample population all come from this single definition, so every
   figure is demonstrably describing the same engineering object.

   The part is public-safe on purpose: it is a structural bracket and nothing
   more. It names no programme and resembles no specific component.
   ========================================================================== */
import { clamp, lerp, rng } from './dom.js';
import { ramp, withAlpha } from './color.js';

/* ---------------------------------------------------------- geometry ----- */
/* design units, x right, y down. Three attachment interfaces: one upper, two
   lower, joined through a central hub by three ribs. */
export const BOSS = [
  { x:  0.02, y: -0.63, r: 0.216, hole: 0.118 },   /* upper            */
  { x:  0.73, y:  0.44, r: 0.216, hole: 0.118 },   /* lower right      */
  { x: -0.71, y:  0.44, r: 0.232, hole: 0.128 },   /* lower left       */
];
export const HUB = { x: 0.01, y: 0.07, r: 0.098 };

/* the envelope reads 1.24 : 1 — substantial, never elongated */
export const BK_EXT = { x0: -1.01, x1: 0.97, y0: -0.90, y1: 0.70 };

const BK_CEN   = { x: (BOSS[0].x + BOSS[1].x + BOSS[2].x) / 3,
                   y: (BOSS[0].y + BOSS[1].y + BOSS[2].y) / 3 };
const BK_DEPTH = [-0.050, -0.038];      /* back face, relative to the front  */
const BK_TILT  = -0.055;                /* three-quarter engineering view    */
const BK_SQUASH = 0.93;

const bkNorm = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };

/* element edges over a contour field read against the field, not the page */
export const MESH_ON_FIELD = 'rgba(255,255,255,.32)';

/* -------------------------------------------------------------- view ----- */
/**
 * Maps the design space into a screen box and enters it as a canvas transform,
 * so every figure gets the same camera, centre, scale and orientation.
 */
export function bracketView(ctx, box, fill = 0.96) {
  const S = Math.min(box.w / (BK_EXT.x1 - BK_EXT.x0),
                     box.h / (BK_EXT.y1 - BK_EXT.y0)) * fill;
  const MX = (BK_EXT.x0 + BK_EXT.x1) / 2, MY = (BK_EXT.y0 + BK_EXT.y1) / 2;
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  return {
    S, cx, cy,
    px: v => v / S,                                    /* screen px → design */
    enter() {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.transform(1, BK_TILT, 0, BK_SQUASH, 0, 0);
      ctx.scale(S, S);
      ctx.translate(-MX, -MY);
    },
    exit() { ctx.restore(); },
    to(x, y) {                                          /* design → screen   */
      const u = x - MX, v = y - MY;
      return [cx + S * u, cy + S * (BK_TILT * u + BK_SQUASH * v)];
    },
  };
}

/* -------------------------------------------------------------- path ----- */
/* rounded polygon: filleted corners, so the internal openings read as cast
   and machined rather than cut out of a sheet */
function bkRoundPoly(ctx, pts, rad) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const d1 = [p0[0] - p1[0], p0[1] - p1[1]], d2 = [p2[0] - p1[0], p2[1] - p1[1]];
    const l1 = Math.hypot(d1[0], d1[1]) || 1, l2 = Math.hypot(d2[0], d2[1]) || 1;
    const u1 = [d1[0] / l1, d1[1] / l1], u2 = [d2[0] / l2, d2[1] / l2];
    const ang = Math.acos(clamp(u1[0] * u2[0] + u1[1] * u2[1], -1, 1));
    const half = Math.max(Math.tan(ang / 2), 1e-3);
    const t = Math.min(rad[i] / half, 0.47 * l1, 0.47 * l2);
    const r = Math.min(t * half, 3);
    const a = [p1[0] + u1[0] * t, p1[1] + u1[1] * t];
    const b = [p1[0] + u2[0] * t, p1[1] + u2[1] * t];
    if (i === 0) ctx.moveTo(a[0], a[1]); else ctx.lineTo(a[0], a[1]);
    ctx.arcTo(p1[0], p1[1], b[0], b[1], r);
  }
  ctx.closePath();
}

/* one weight-relief window, bounded by two ribs and one outer arm */
function bkWindow(ctx, A, B, opt) {
  const cx = (HUB.x + A.x + B.x) / 3, cy = (HUB.y + A.y + B.y) / 3;
  const toward = (px, py, d) => {
    const u = bkNorm([cx - px, cy - py]);
    return [px + u[0] * d, py + u[1] * d];
  };
  const wH = toward(HUB.x, HUB.y, HUB.r + 0.054 - 0.026 * opt);
  const wA = toward(A.x, A.y, A.r * 0.52 + 0.180 - 0.062 * opt);
  const wB = toward(B.x, B.y, B.r * 0.52 + 0.180 - 0.062 * opt);
  const bow = 0.052 + 0.036 * opt;
  const mid = (p, q, k) => {
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    const u = bkNorm([mx - cx, my - cy]);
    return [mx + u[0] * k, my + u[1] * k];
  };
  bkRoundPoly(ctx,
    [wH, mid(wH, wA, bow), wA, mid(wA, wB, bow * 1.15), wB, mid(wB, wH, bow)],
    [0.085, 0.34, 0.075, 0.44, 0.075, 0.34]);
}

/**
 * The complete section: outer boundary, three bores, three relief windows.
 * `opt` (0..1) drives the structural optimisation — deeper waists, thinner
 * ribs, larger openings — while the interfaces stay exactly where they were.
 * Fill it with the even-odd rule.
 */
export function bracketPath(ctx, opt = 0) {
  const waist = 0.078 + 0.048 * opt;
  const N = [];
  for (let i = 0; i < 3; i++) {
    const A = BOSS[i], B = BOSS[(i + 1) % 3];
    const d = bkNorm([B.x - A.x, B.y - A.y]);
    let n = [d[1], -d[0]];
    if (n[0] * ((A.x + B.x) / 2 - BK_CEN.x) + n[1] * ((A.y + B.y) / 2 - BK_CEN.y) < 0)
      n = [-n[0], -n[1]];
    N.push({ n, d, L: Math.hypot(B.x - A.x, B.y - A.y) });
  }
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const A = BOSS[i], B = BOSS[(i + 1) % 3], { n, d, L } = N[i];
    const ax = A.x + n[0] * A.r, ay = A.y + n[1] * A.r;
    const bx = B.x + n[0] * B.r, by = B.y + n[1] * B.r;
    if (i === 0) ctx.moveTo(ax, ay);
    ctx.bezierCurveTo(
      ax + d[0] * L * 0.30 - n[0] * waist, ay + d[1] * L * 0.30 - n[1] * waist,
      bx - d[0] * L * 0.30 - n[0] * waist, by - d[1] * L * 0.30 - n[1] * waist,
      bx, by);
    const a1 = Math.atan2(n[1], n[0]);
    let a2 = Math.atan2(N[(i + 1) % 3].n[1], N[(i + 1) % 3].n[0]);
    while (a2 < a1) a2 += Math.PI * 2;
    ctx.arc(B.x, B.y, B.r, a1, a2);
  }
  ctx.closePath();

  for (const b of BOSS) {
    ctx.moveTo(b.x + b.hole, b.y);
    ctx.arc(b.x, b.y, b.hole, 0, Math.PI * 2);
  }
  for (let i = 0; i < 3; i++) bkWindow(ctx, BOSS[i], BOSS[(i + 1) % 3], opt);
}

/* ------------------------------------------------------------- solid ----- */
const bkMix = (a, b, t) => `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
const BK_STEEL_BACK = [ 76,  92, 110], BK_STEEL_NEAR = [148, 165, 182];
const BK_FIELD_BACK = [  8,  26,  62], BK_FIELD_NEAR = [ 20,  62, 116];

/** soft contact shadow — gives the part weight on the page */
export function bracketShadow(ctx, a = 0.16) {
  const g = ctx.createRadialGradient(0.02, 0.70, 0.02, 0.02, 0.70, 0.95);
  g.addColorStop(0, `rgba(20,44,74,${a})`);
  g.addColorStop(0.55, `rgba(20,44,74,${a * 0.34})`);
  g.addColorStop(1, 'rgba(20,44,74,0)');
  ctx.save(); ctx.translate(0.02, 0.70); ctx.scale(1, 0.16); ctx.translate(-0.02, -0.70);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0.02, 0.70, 0.95, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** the extruded side walls, back to front */
export function bracketExtrude(ctx, opt = 0, dark = false, steps = 11) {
  const back = dark ? BK_FIELD_BACK : BK_STEEL_BACK;
  const near = dark ? BK_FIELD_NEAR : BK_STEEL_NEAR;
  for (let k = steps; k >= 1; k--) {
    const u = k / steps;
    ctx.save();
    ctx.translate(BK_DEPTH[0] * u, BK_DEPTH[1] * u);
    bracketPath(ctx, opt);
    ctx.fillStyle = bkMix(near, back, u * 0.92);
    ctx.fill('evenodd');
    ctx.restore();
  }
}

/** machined aluminium front face */
export function bracketMetal(ctx, opt = 0) {
  bracketPath(ctx, opt);
  const g = ctx.createLinearGradient(-1.0, -0.9, 0.95, 0.7);
  [[0, '#F4F8FB'], [.20, '#C6D4E1'], [.40, '#E9EFF5'], [.60, '#A5B7C8'],
   [.80, '#D9E3EC'], [1, '#8B9EB1']].forEach(([p, c]) => g.addColorStop(p, c));
  ctx.fillStyle = g;
  ctx.fill('evenodd');

  ctx.save();
  bracketPath(ctx, opt); ctx.clip('evenodd');
  const s = ctx.createRadialGradient(-0.45, -0.55, 0.05, -0.45, -0.55, 1.5);
  s.addColorStop(0, 'rgba(255,255,255,.55)');
  s.addColorStop(0.55, 'rgba(255,255,255,.10)');
  s.addColorStop(1, 'rgba(150,175,200,0)');
  ctx.fillStyle = s;
  ctx.fillRect(BK_EXT.x0, BK_EXT.y0, BK_EXT.x1 - BK_EXT.x0, BK_EXT.y1 - BK_EXT.y0);
  ctx.restore();
}

/** the visible bore walls, plus the raised ring around each interface */
export function bracketBores(ctx, V, opt = 0) {
  for (const b of BOSS) {
    ctx.save();
    ctx.beginPath(); ctx.arc(b.x, b.y, b.hole, 0, Math.PI * 2); ctx.clip();
    ctx.save();
    ctx.translate(BK_DEPTH[0], BK_DEPTH[1]);
    bracketPath(ctx, opt);
    const g = ctx.createLinearGradient(b.x - b.hole, b.y - b.hole, b.x + b.hole, b.y + b.hole);
    g.addColorStop(0, '#41556B');
    g.addColorStop(0.55, '#7C8DA0');
    g.addColorStop(1, '#AFBDCB');
    ctx.fillStyle = g;
    ctx.fill('evenodd');
    ctx.restore();
    ctx.restore();

    ctx.lineWidth = V.px(1.5);
    ctx.strokeStyle = 'rgba(255,255,255,.72)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.hole, Math.PI * 0.55, Math.PI * 1.75); ctx.stroke();
    ctx.strokeStyle = 'rgba(28,52,80,.42)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.hole, Math.PI * 1.75, Math.PI * 2.55); ctx.stroke();
    ctx.lineWidth = V.px(1.1);
    ctx.strokeStyle = 'rgba(255,255,255,.34)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.hole + (b.r - b.hole) * 0.30, 0, Math.PI * 2); ctx.stroke();
  }
}

/** crisp edge definition: dark contour, light inboard highlight */
export function bracketEdges(ctx, V, opt = 0, contour = 'rgba(26,52,82,.55)') {
  ctx.save();
  bracketPath(ctx, opt); ctx.clip('evenodd');
  ctx.translate(-0.010, -0.009);
  bracketPath(ctx, opt);
  ctx.lineWidth = V.px(2.4); ctx.strokeStyle = 'rgba(255,255,255,.60)';
  ctx.stroke();
  ctx.restore();

  bracketPath(ctx, opt);
  ctx.lineWidth = V.px(1.35); ctx.strokeStyle = contour;
  ctx.stroke();
}

/** the whole solid part in one call */
export function bracketSolid(ctx, V, opt = 0) {
  bracketShadow(ctx);
  bracketExtrude(ctx, opt, false);
  bracketMetal(ctx, opt);
  bracketBores(ctx, V, opt);
  bracketEdges(ctx, V, opt);
}

/* ------------------------------------------------------------- field ----- */
let BK_SPOTS = null;
function bkSpots() {
  if (BK_SPOTS) return BK_SPOTS;
  const s = [];
  BOSS.forEach((b, i) => {
    const t = bkNorm([HUB.x - b.x, HUB.y - b.y]);          /* bearing side  */
    const rr = b.hole + (b.r - b.hole) * 0.45;
    s.push({ x: b.x + t[0] * rr, y: b.y + t[1] * rr, w: 0.80, s: 0.122 });
    BOSS.forEach((o, j) => {                               /* arm junctions */
      if (j === i) return;
      const d = bkNorm([o.x - b.x, o.y - b.y]);
      s.push({ x: b.x + d[0] * b.r * 0.74, y: b.y + d[1] * b.r * 0.74, w: 0.44, s: 0.115 });
    });
  });
  s.push({ x: HUB.x, y: HUB.y, w: 0.42, s: 0.155 });
  BK_SPOTS = s;
  return s;
}

const BK_PATHS = (() => {
  const p = [];
  for (const b of BOSS) p.push([HUB.x, HUB.y, b.x, b.y]);
  for (let i = 0; i < 3; i++) {
    const a = BOSS[i], b = BOSS[(i + 1) % 3];
    p.push([a.x, a.y, b.x, b.y]);
  }
  return p;
})();

function bkSegDist(px, py, s) {
  const vx = s[2] - s[0], vy = s[3] - s[1];
  const t = clamp(((px - s[0]) * vx + (py - s[1]) * vy) / (vx * vx + vy * vy || 1), 0, 1);
  return Math.hypot(px - (s[0] + vx * t), py - (s[1] + vy * t));
}

/** illustrative structural response: load paths plus interface concentrations */
export function bracketStress(x, y, smooth = false, opt = 0) {
  let f = 0.09;
  for (const q of bkSpots()) {
    const sg = q.s * (smooth ? 1.45 : 1);
    const dx = x - q.x, dy = y - q.y;
    f += q.w * (smooth ? 0.90 : 1) * Math.exp(-(dx * dx + dy * dy) / (2 * sg * sg));
  }
  let d = 9;
  for (const s of BK_PATHS) d = Math.min(d, bkSegDist(x, y, s));
  f += 0.24 * Math.max(0, 1 - d / 0.44);
  return clamp(f - 0.11 * opt, 0, 1);
}

/* the field is expensive per pixel and never changes, so it is rasterised once
   per variant and drawn as an image from then on */
const BK_FIELDS = {};
export function bracketFieldImage(smooth = false, opt = 0) {
  const key = `${smooth ? 'a' : 'p'}${Math.round(opt * 4)}`;
  if (BK_FIELDS[key]) return BK_FIELDS[key];
  const W = 180, H = Math.round(W * (BK_EXT.y1 - BK_EXT.y0) / (BK_EXT.x1 - BK_EXT.x0));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const x = BK_EXT.x0 + (i + 0.5) / W * (BK_EXT.x1 - BK_EXT.x0);
      const y = BK_EXT.y0 + (j + 0.5) / H * (BK_EXT.y1 - BK_EXT.y0);
      const col = ramp(bracketStress(x, y, smooth, Math.round(opt * 4) / 4));
      const k = (j * W + i) * 4;
      img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2];
      img.data[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  BK_FIELDS[key] = c;
  return c;
}

/**
 * Paints the response field onto the front face. `clipTo` may narrow it to one
 * side of a comparison plane; `alpha` fades it in over the metal underneath.
 */
export function bracketField(ctx, opt = 0, { smooth = false, alpha = 1, clipTo = null } = {}) {
  ctx.save();
  bracketPath(ctx, opt); ctx.clip('evenodd');
  if (clipTo) { ctx.beginPath(); ctx.rect(clipTo[0], clipTo[1], clipTo[2], clipTo[3]); ctx.clip(); }
  ctx.globalAlpha = alpha;
  ctx.drawImage(bracketFieldImage(smooth, opt),
    BK_EXT.x0, BK_EXT.y0, BK_EXT.x1 - BK_EXT.x0, BK_EXT.y1 - BK_EXT.y0);
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* -------------------------------------------------------------- mesh ----- */
/** a triangular surface mesh, clipped to the material */
export function bracketMesh(ctx, V, opt = 0, {
  style = MESH_ON_FIELD, step = 0.062, alpha = 1, clipTo = null,
} = {}) {
  ctx.save();
  bracketPath(ctx, opt); ctx.clip('evenodd');
  if (clipTo) { ctx.beginPath(); ctx.rect(clipTo[0], clipTo[1], clipTo[2], clipTo[3]); ctx.clip(); }
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = style;
  ctx.lineWidth = V.px(0.85);
  for (const deg of [0, 60, 120]) {
    const a = deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    for (let k = -1.5; k <= 1.5; k += step) {
      ctx.beginPath();
      ctx.moveTo(ca * k - sa * 2.0, sa * k + ca * 2.0);
      ctx.lineTo(ca * k + sa * 2.0, sa * k - ca * 2.0);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* ----------------------------------------------------------- samples ----- */
/* rejection sampling against a rasterised mask, so every point sits in real
   material and never on an opening or an edge */
const BK_SAMPLES = {};
export function bracketSamples(n = 90, opt = 0) {
  const key = `${n}:${Math.round(opt * 4)}`;
  if (BK_SAMPLES[key]) return BK_SAMPLES[key];
  const W = 220, H = Math.round(W * (BK_EXT.y1 - BK_EXT.y0) / (BK_EXT.x1 - BK_EXT.x0));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const sx = W / (BK_EXT.x1 - BK_EXT.x0), sy = H / (BK_EXT.y1 - BK_EXT.y0);
  g.setTransform(sx, 0, 0, sy, -BK_EXT.x0 * sx, -BK_EXT.y0 * sy);
  bracketPath(g, Math.round(opt * 4) / 4);
  g.fillStyle = '#fff'; g.fill('evenodd');
  const d = g.getImageData(0, 0, W, H).data;
  const solid = (x, y) => {
    const i = Math.round((x - BK_EXT.x0) * sx), j = Math.round((y - BK_EXT.y0) * sy);
    if (i < 3 || j < 3 || i > W - 4 || j > H - 4) return false;
    for (const [oi, oj] of [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]])
      if (d[((j + oj) * W + (i + oi)) * 4 + 3] < 200) return false;
    return true;
  };
  const R = rng(9137), out = [];
  for (let g2 = 0; g2 < 9000 && out.length < n; g2++) {
    const x = BK_EXT.x0 + R() * (BK_EXT.x1 - BK_EXT.x0);
    const y = BK_EXT.y0 + R() * (BK_EXT.y1 - BK_EXT.y0);
    if (!solid(x, y)) continue;
    let near = false;
    for (const p of out) if (Math.hypot(p.x - x, p.y - y) < 0.085) { near = true; break; }
    if (near) continue;
    out.push({ x, y, d: Math.hypot(x - HUB.x, y - HUB.y) });
  }
  out.sort((a, b) => a.d - b.d);
  BK_SAMPLES[key] = out;
  return out;
}

/* ------------------------------------------------------------- chrome ---- */
/** restrained construction geometry: interface axes and the reference circle */
export function bracketConstruction(ctx, V, k = 1, T = null) {
  const ink = T ? withAlpha(T.text3, 0.5) : 'rgba(60,96,140,.45)';
  ctx.save();
  ctx.lineWidth = V.px(1.2);
  ctx.strokeStyle = ink;
  ctx.setLineDash([V.px(6), V.px(8)]);
  const R = Math.hypot(BOSS[0].x - BK_CEN.x, BOSS[0].y - BK_CEN.y) * 1.16;
  ctx.globalAlpha = k;
  ctx.beginPath(); ctx.arc(BK_CEN.x, BK_CEN.y, R, 0, Math.PI * 2 * k); ctx.stroke();
  for (const b of BOSS) {
    const u = bkNorm([b.x - BK_CEN.x, b.y - BK_CEN.y]);
    ctx.beginPath();
    ctx.moveTo(BK_CEN.x, BK_CEN.y);
    ctx.lineTo(b.x + u[0] * b.r * 1.55 * k, b.y + u[1] * b.r * 1.55 * k);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** the interfaces themselves, marked as controlled features */
export function bracketMarks(ctx, V, k = 1, T = null) {
  const acc = T ? T.accent : '#1464CD';
  const s = V.px(4.5);
  ctx.save();
  [...BOSS.map(b => [b.x, b.y]), [HUB.x, HUB.y]].forEach((p, i) => {
    const a = clamp(k * 5 - i, 0, 1);
    if (a <= 0) return;
    ctx.globalAlpha = a;
    ctx.strokeStyle = acc; ctx.lineWidth = V.px(1.6);
    ctx.strokeRect(p[0] - s, p[1] - s, s * 2, s * 2);
    ctx.beginPath();
    ctx.moveTo(p[0] - s * 2.1, p[1]); ctx.lineTo(p[0] + s * 2.1, p[1]);
    ctx.moveTo(p[0], p[1] - s * 2.1); ctx.lineTo(p[0], p[1] + s * 2.1);
    ctx.lineWidth = V.px(1); ctx.stroke();
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** applied load at the upper interface, reactions at the two lower ones */
export function bracketLoads(ctx, V, alpha = 1) {
  const arrow = (x, y, dx, dy, col) => {
    const u = bkNorm([dx, dy]), L = 0.30;
    ctx.strokeStyle = col; ctx.lineWidth = V.px(2.2); ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - u[0] * L, y - u[1] * L); ctx.lineTo(x, y); ctx.stroke();
    const p = [-u[1], u[0]], hh = 0.055;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - u[0] * hh * 2 + p[0] * hh, y - u[1] * hh * 2 + p[1] * hh);
    ctx.lineTo(x - u[0] * hh * 2 - p[0] * hh, y - u[1] * hh * 2 - p[1] * hh);
    ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
  };
  ctx.save();
  ctx.globalAlpha = alpha;
  arrow(BOSS[0].x, BOSS[0].y - BOSS[0].r * 0.2, 0.12, 1, 'rgba(240,150,80,.95)');
  const g = 'rgba(47,190,139,.85)';
  [BOSS[1], BOSS[2]].forEach(b => {
    ctx.strokeStyle = g; ctx.lineWidth = V.px(2);
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(b.x + i * 0.075, b.y + b.r * 0.98);
      ctx.lineTo(b.x + i * 0.075 - 0.05, b.y + b.r * 0.98 + 0.09);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(b.x - 0.13, b.y + b.r * 0.98); ctx.lineTo(b.x + 0.13, b.y + b.r * 0.98);
    ctx.stroke();
  });
  ctx.restore();
}


/**
 * Six points on the outer boundary — one per system in the ring — so a trace
 * coming in from any direction lands on real material instead of stopping in
 * mid-air. Ordered from the upper interface, clockwise.
 */
export function bracketAnchors(opt = 0) {
  const waist = 0.078 + 0.048 * opt;
  const out = [];
  for (let i = 0; i < 3; i++) {
    const A = BOSS[i], B = BOSS[(i + 1) % 3];
    const uA = bkNorm([A.x - BK_CEN.x, A.y - BK_CEN.y]);
    out.push([A.x + uA[0] * A.r, A.y + uA[1] * A.r]);
    const d = bkNorm([B.x - A.x, B.y - A.y]);
    let n = [d[1], -d[0]];
    if (n[0] * ((A.x + B.x) / 2 - BK_CEN.x) + n[1] * ((A.y + B.y) / 2 - BK_CEN.y) < 0)
      n = [-n[0], -n[1]];
    const mx = (A.x + B.x) / 2 + n[0] * ((A.r + B.r) / 2 - waist * 0.75);
    const my = (A.y + B.y) / 2 + n[1] * ((A.r + B.r) / 2 - waist * 0.75);
    out.push([mx, my]);
  }
  return out;
}
