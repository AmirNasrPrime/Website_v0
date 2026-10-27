/* ============================================================================
   PRIME-CAE · 01 · the engineering intelligence layer
   One structural model at the centre, six systems connected to it. Selecting a
   system changes how the model is being looked at — never which model it is.
   The camera, the centre, the scale, the orientation and the three interfaces
   are identical in all six states, because that is the entire point.
   ========================================================================== */
import { $, $$, on, clamp, lerp, reduced, coarse } from '../core/dom.js';
import { fitCanvas, sceneLoop } from '../core/canvas.js';
import { SYSTEMS } from '../core/content.js';
import { withAlpha } from '../core/color.js';
import { themeFor } from '../core/theme.js';
import {
  bracketView, bracketPath, bracketShadow, bracketExtrude, bracketMetal,
  bracketBores, bracketEdges, bracketField, bracketMesh, bracketSamples,
  bracketConstruction, bracketMarks, bracketAnchors, BOSS, HUB, BK_EXT, MESH_ON_FIELD,
} from '../core/bracket.js';


/* The route the systems sit on. A short, wide box would otherwise stretch this
   into a 3:1 slot, so the horizontal radius is capped against the vertical one
   and the ellipse keeps its proportions at every size. */
function ringOf(w, h) {
  const ry = h * 0.405;
  return { rx: Math.min(w * 0.42, ry * 1.62), ry };
}

export function initLayer() {
  const wrap = $('#orbit'), canvas = $('#orbitCanvas'), ring = $('#orbitNodes');
  if (!wrap || !canvas) return;

  const nodes = $$('.orbit__node', wrap);
  /* the ring reads its own order from the markup, so the trace lines can never
     drift out of step with the labels */
  const ORDER = nodes.map(n => n.dataset.node);
  const { ctx, size } = fitCanvas(canvas);
  const T = themeFor(canvas);
  const tag = $('#layerTag'), body = $('#layerLine');

  let active = 'geometry', prev = 'geometry';
  let tSel = performance.now() / 1000, optV = 0, tLast = tSel;
  const pos = [];
  let rail = false;

  /* -------------------------------------------------- node placement --- */
  /* Nodes are clamped inside the frame, so nothing can ever leave the
     viewport at any width — the canvas then draws to where they actually are. */
  function place() {
    const r = wrap.getBoundingClientRect();
    rail = !!ring && getComputedStyle(ring).position === 'static';
    if (rail) {
      nodes.forEach(n => { n.style.left = ''; n.style.top = ''; });
      pos.length = 0;
      return;
    }
    const cr = canvas.getBoundingClientRect();
    const w = cr.width, h = cr.height;
    const cx = w / 2, cy = h * 0.48;
    const { rx, ry } = ringOf(w, h);
    nodes.forEach((n, i) => {
      const a = (-90 + i * 60) * Math.PI / 180;
      const hw = n.offsetWidth / 2 || 60, hh = n.offsetHeight / 2 || 22;
      const x = clamp(cx + Math.cos(a) * rx, hw + 6, w - hw - 6);
      const y = clamp(cy + Math.sin(a) * ry, hh + 6, h - hh - 6);
      n.style.left = `${x}px`;
      n.style.top  = `${y}px`;
      pos[i] = { x, y, hw, hh, a };
    });
  }
  place();
  new ResizeObserver(place).observe(wrap);

  /* ------------------------------------------------------- selection --- */
  /* The workflow walks itself: a light travels the dashed ring, and whichever
     system it has reached is the one acting on the model. A visitor who takes
     over moves the light to their choice and holds it there. */
  const DWELL = 2.5, MOVE = 0.9;
  let idx = 0, phase = 'dwell', tPhase = performance.now() / 1000, held = 0;

  /* in rail mode the active system has to stay on screen as the flow advances,
     or the visitor is watching a control they cannot see */
  function revealNode(id) {
    if (!rail || !ring) return;
    const n = nodes[ORDER.indexOf(id)];
    if (!n) return;
    const left = n.offsetLeft - (ring.clientWidth - n.offsetWidth) / 2;
    ring.scrollTo({ left: Math.max(0, left), behavior: reduced() ? 'auto' : 'smooth' });
  }

  function apply(id) {
    if (id === active) return;
    prev = active; active = id;
    tSel = performance.now() / 1000;
    nodes.forEach(n => n.setAttribute('aria-pressed', String(n.dataset.node === id)));
    const sys = SYSTEMS[id];
    if (!sys) return;
    if (tag) tag.textContent = sys.tag;
    if (body) body.textContent = sys.line;
    revealNode(id);
  }
  function select(id) {
    const i = ORDER.indexOf(id);
    if (i < 0) return;
    idx = i; phase = 'dwell';
    tPhase = performance.now() / 1000;
    held = tPhase + 9;
    apply(id);
  }
  nodes.forEach(n => {
    on(n, 'click', () => select(n.dataset.node));
    on(n, 'pointerenter', () => select(n.dataset.node));
    on(n, 'focus', () => select(n.dataset.node));
  });
  active = prev = 'physics';
  apply(ORDER[0]);
  held = 0;

  /* ------------------------------------------------------------ draw --- */
  sceneLoop(canvas, now => {
    const { w, h } = size;
    if (!w) return;
    const dt = clamp(now - tLast, 0, 0.2); tLast = now;

    /* the light steps the workflow on, unless the visitor is holding it */
    if (!reduced() && now > held && !document.hidden) {
      if (phase === 'dwell' && now - tPhase > DWELL) { phase = 'move'; tPhase = now; }
      else if (phase === 'move' && now - tPhase > MOVE) {
        idx = (idx + 1) % ORDER.length; phase = 'dwell'; tPhase = now;
        apply(ORDER[idx]);
      }
    }
    const t = now - tSel;

    /* one 500 ms crossfade between states, one eased geometry morph */
    const tr = reduced() ? 1 : clamp(t / 0.5, 0, 1);
    const e  = tr * tr * (3 - 2 * tr);
    const mix = {};
    mix[active] = e;
    if (prev !== active) mix[prev] = (mix[prev] || 0) + (1 - e);
    const wOf = k => mix[k] || 0;

    const optT = active === 'optimization' ? 1 : 0;
    optV = reduced() ? optT : optV + (optT - optV) * (1 - Math.exp(-dt / 0.20));
    const opt = Math.round(optV * 1000) / 1000;

    ctx.clearRect(0, 0, w, h);

    const cx = w / 2, cy = h * 0.48;
    if (!rail && pos.length === 6) drawRoute(ctx, cx, cy, w, h, now, T, idx, phase, tPhase);

    /* the structural model — same camera, same centre, in every state */
    const ring = ringOf(w, h);
    /* the widest the structure can be and still leave a node pill room to sit
       outside it: clearance = rx - pill half-width - structure half-width */
    const bw = rail ? Math.min(w * 0.94, 620)
                    : Math.max(200, Math.min(w * 0.60, 2 * (ring.rx - 113), 640));
    const bh = h * (rail ? 0.86 : 0.70);
    const V = bracketView(ctx, { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh }, 0.98);

    V.enter();
    bracketShadow(ctx, 0.15);
    bracketExtrude(ctx, opt, false);
    const dark = wOf('physics') + wOf('ai') + wOf('validation');
    if (dark > 0.01) {
      ctx.globalAlpha = clamp(dark, 0, 1);
      bracketExtrude(ctx, opt, true, 9);
      ctx.globalAlpha = 1;
    }
    bracketMetal(ctx, opt);

    const rev = reduced() ? 1 : clamp(t / 0.85, 0, 1);
    const X0 = BK_EXT.x0, Y0 = BK_EXT.y0;
    const WD = BK_EXT.x1 - BK_EXT.x0, HD = BK_EXT.y1 - BK_EXT.y0;

    if (wOf('physics') > 0.01) {
      const k = active === 'physics' ? rev : 1;
      bracketField(ctx, opt, { alpha: wOf('physics'), clipTo: [X0, Y0, WD * k, HD] });
      bracketMesh(ctx, V, opt, { alpha: wOf('physics') * 0.8, clipTo: [X0, Y0, WD * k, HD] });
    }
    if (wOf('ai') > 0.01) {
      const k = active === 'ai' ? clamp(t / 0.6, 0, 1) : 1;
      bracketField(ctx, opt, { smooth: true, alpha: wOf('ai') * k });
    }
    if (wOf('validation') > 0.01) {
      const sx = HUB.x;
      ctx.globalAlpha = wOf('validation');
      const kk = active === 'validation' ? rev : 1;
      bracketField(ctx, opt, { clipTo: [lerp(sx, X0, kk), Y0, (sx - X0) * kk, HD] });
      bracketMesh(ctx, V, opt, { alpha: 0.85, clipTo: [lerp(sx, X0, kk), Y0, (sx - X0) * kk, HD] });
      bracketField(ctx, opt, { smooth: true, clipTo: [sx, Y0, (BK_EXT.x1 - sx) * kk, HD] });
      ctx.globalAlpha = 1;
    }

    bracketBores(ctx, V, opt);
    bracketEdges(ctx, V, opt, dark > 0.5 ? 'rgba(12,32,60,.62)' : 'rgba(26,52,82,.55)');

    if (wOf('geometry') > 0.01) {
      ctx.globalAlpha = wOf('geometry');
      bracketConstruction(ctx, V, clamp(t / 0.9, 0, 1), T);
      bracketMarks(ctx, V, clamp(t / 0.9, 0, 1), T);
      ctx.globalAlpha = 1;
    }
    if (wOf('data') > 0.01) drawSamples(ctx, V, opt, now, t, wOf('data'), T);
    if (wOf('optimization') > 0.01) drawEvolution(ctx, V, opt, wOf('optimization'), T);
    if (wOf('validation') > 0.01) drawSplitPlane(ctx, V, wOf('validation'), T);
    /* the workflow ring sits over the model, so a trace can meet the part */
    if (!rail && pos.length === 6) {
      const anc = bracketAnchors(opt).map(p => V.to(p[0], p[1]));
      V.exit();
      drawTrace(ctx, now, T, idx, phase, tPhase, anc, cx, cy);
    } else V.exit();

    if (wOf('validation') > 0.01 && !rail) {
      const a = clamp((t - 0.9) / 0.5, 0, 1) * wOf('validation');
      if (a > 0.01) {
        ctx.globalAlpha = a;
        ctx.strokeStyle = withAlpha(T.pass, 0.85);
        ctx.lineWidth = 1.5;
        /* the foot of the ring belongs to a node — the badge takes the corner,
           which nothing else ever occupies */
        const bx = 14, by = 14;
        ctx.strokeRect(bx, by, 124, 30);
        ctx.font = '600 12px ui-monospace, monospace';
        ctx.fillStyle = T.pass;
        ctx.fillText('VALIDATED', bx + 20, by + 19);
        ctx.globalAlpha = 1;
      }
    }
  }, { fps: coarse() ? 24 : 30 });

  /* --------------------------------------------- workflow + trace ------ */
  /* One direction, stated cleanly: a single elliptical route with arrows, a
     light running around it, and a live trace from whichever system it has
     reached onto the model itself. */
  function drawRoute(ctx, cx, cy, w, h, now, T, idx, phase, tPhase) {
    const n = pos.length;
    const { rx, ry } = ringOf(w, h);
    const ang = i => (-90 + i * 60) * Math.PI / 180;
    const at = a => [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];

    /* the route — one continuous ellipse, one dash pattern, no seams */
    ctx.save();
    ctx.setLineDash([5, 11]);
    ctx.lineCap = 'round';
    ctx.lineDashOffset = -((now * 20) % 16);
    ctx.strokeStyle = withAlpha(T.text3, 0.42);
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    /* direction, once between each pair */
    for (let i = 0; i < n; i++) {
      const a = ang(i) + Math.PI / 6;
      const p = at(a);
      const d = [-Math.sin(a) * rx, Math.cos(a) * ry];
      const dl = Math.hypot(d[0], d[1]) || 1;
      const ux = d[0] / dl, uy = d[1] / dl, s = 7;
      ctx.fillStyle = withAlpha(T.text3, 0.62);
      ctx.beginPath();
      ctx.moveTo(p[0] + ux * s, p[1] + uy * s);
      ctx.lineTo(p[0] - ux * s * 0.75 - uy * s * 0.62, p[1] - uy * s * 0.75 + ux * s * 0.62);
      ctx.lineTo(p[0] - ux * s * 0.75 + uy * s * 0.62, p[1] - uy * s * 0.75 - ux * s * 0.62);
      ctx.closePath(); ctx.fill();
    }

    /* the span currently being travelled */
    const prog = phase === 'move' ? clamp((now - tPhase) / MOVE, 0, 1) : 0;
    const e = prog * prog * (3 - 2 * prog);
    if (phase === 'move') {
      ctx.save();
      ctx.strokeStyle = withAlpha(T.accent, 0.9);
      ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, ang(idx), ang(idx) + (Math.PI / 3) * e);
      ctx.stroke();
      ctx.restore();
    }

    /* the light */
    const la = ang(idx) + (Math.PI / 3) * e;
    const [lx, ly] = at(la);
    const halo = phase === 'dwell' ? 30 + 5 * Math.sin(now * 3.2) : 15;
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, halo);
    g.addColorStop(0, withAlpha(T.accent2 || T.accent, phase === 'dwell' ? 0.55 : 0.95));
    g.addColorStop(1, withAlpha(T.accent, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(lx, ly, halo, 0, Math.PI * 2); ctx.fill();
    if (phase === 'move') {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(lx, ly, 3.2, 0, Math.PI * 2); ctx.fill();
    }

  }

  function drawTrace(ctx, now, T, idx, phase, tPhase, anchors, cx, cy) {
    /* the trace from the acting system onto the part */
    const p = pos[idx];
    const tgt = anchors[idx] || [cx, cy];
    /* leave from the edge of the pill on the line that actually reaches the
       part, so the trace never starts off-axis from its own label */
    const dx = tgt[0] - p.x, dy = tgt[1] - p.y;
    const dl = Math.hypot(dx, dy) || 1;
    const ux = dx / dl, uy = dy / dl;
    const ex = p.hw + 8, ey = p.hh + 8;
    const k = Math.min(Math.abs(ux) > 1e-4 ? ex / Math.abs(ux) : 1e6,
                       Math.abs(uy) > 1e-4 ? ey / Math.abs(uy) : 1e6);
    const x1 = p.x + ux * k, y1 = p.y + uy * k;
    const live = phase === 'dwell';
    ctx.strokeStyle = withAlpha(T.accent, live ? 0.9 : 0.32);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(tgt[0], tgt[1]); ctx.stroke();
    ctx.fillStyle = withAlpha(T.accent, live ? 0.95 : 0.35);
    ctx.beginPath(); ctx.arc(tgt[0], tgt[1], 3.6, 0, Math.PI * 2); ctx.fill();

    if (!reduced() && live) {
      const k = ((now - tPhase) / 1.1) % 1;
      const px = lerp(x1, tgt[0], k), py = lerp(y1, tgt[1], k);
      const al = 0.95 * Math.sin(k * Math.PI);
      const vx = tgt[0] - x1, vy = tgt[1] - y1;
      const ul = Math.hypot(vx, vy) || 1, tl = 22;
      const gg = ctx.createLinearGradient(px - vx / ul * tl, py - vy / ul * tl, px, py);
      gg.addColorStop(0, withAlpha(T.accent, 0));
      gg.addColorStop(1, withAlpha(T.accent2 || T.accent, al));
      ctx.strokeStyle = gg; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px - vx / ul * tl, py - vy / ul * tl); ctx.lineTo(px, py); ctx.stroke();
      ctx.fillStyle = withAlpha(T.accent, al);
      ctx.beginPath(); ctx.arc(px, py, 2.6, 0, Math.PI * 2); ctx.fill();
    }
  }
}

/* ----------------------------------------------------------- states ----- */
/* DATA — measurement locations across the part, resolving outward from the
   centre. Sparse and deliberate: samples, not a particle field. */
function drawSamples(ctx, V, opt, now, t, a, T) {
  const pts = bracketSamples(52, opt);
  const acc = T.accent2 || T.accent;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = withAlpha(acc, 0.16);
  ctx.lineWidth = V.px(0.8);
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
      if (d > 0.17) continue;
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
      ctx.stroke();
    }
  }
  const wave = (t * 0.55) % 1.9;
  pts.forEach((p, i) => {
    const k = clamp(t * 1.7 - p.d * 1.4, 0, 1);
    if (k <= 0) return;
    const pulse = Math.exp(-Math.pow((p.d - wave) / 0.16, 2));
    const r = V.px(2.2 + 2.2 * pulse);
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3.2);
    g.addColorStop(0, withAlpha(acc, (0.85 + 0.15 * pulse) * k));
    g.addColorStop(1, withAlpha(acc, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = withAlpha('#FFFFFF', 0.9 * k);
    ctx.beginPath(); ctx.arc(p.x, p.y, V.px(1.5), 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}

/* OPTIMIZATION — the baseline held as a ghost while the material retracts */
function drawEvolution(ctx, V, opt, a, T) {
  ctx.save();
  ctx.globalAlpha = a * 0.7;
  ctx.setLineDash([V.px(5), V.px(7)]);
  ctx.strokeStyle = withAlpha(T.text3, 0.55);
  ctx.lineWidth = V.px(1.3);
  bracketPath(ctx, 0);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = a;
  ctx.strokeStyle = T.accent;
  ctx.lineWidth = V.px(2);
  bracketPath(ctx, opt);
  ctx.stroke();
  ctx.restore();
}

/* VALIDATION — the comparison plane, held to a hairline */
function drawSplitPlane(ctx, V, a, T) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = withAlpha('#FFFFFF', 0.85);
  ctx.lineWidth = V.px(1.6);
  ctx.setLineDash([V.px(7), V.px(6)]);
  ctx.beginPath();
  ctx.moveTo(HUB.x, BK_EXT.y0 + 0.03);
  ctx.lineTo(HUB.x, BK_EXT.y1 - 0.03);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}
