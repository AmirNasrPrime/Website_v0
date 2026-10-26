/* ============================================================================
   PRIME-CAE · 01 · about
   The transition out of the hero, and the one claim the section makes, drawn.

   Both figures are real 3D — projected, lit, depth-sorted and draggable — drawn
   on a canvas with the small toolkit in core/scene3d.js (no WebGL, no library).

   The figure is a phase portrait of an oscillating system. Sparse observations
   are all any model is given; several unconstrained fits pass straight through
   them and then drift off, each one a different answer. The physics-guided
   prediction is held on the orbit the governing equation allows, and stays on
   it all the way round. That is the whole argument for physics-guided learning
   in one picture: data alone admits many answers, physics admits one.

   It is paired with a second plot, a design-domain search: the other half of
   the platform's argument. Once the response is trusted, search the design
   space for the best design that respects the constraints. The two share one
   frame and hand over to each other; 01/02 tabs let the reader choose.

   Nothing here animates for its own sake — the field drifts, the predictions
   trace once, the search converges once, and reduced motion draws the settled
   state of both.
   ========================================================================== */
import { $, $$, on, clamp, lerp, rng, reduced, coarse, tickNow } from '../core/dom.js';
import { fitCanvas, sceneLoop } from '../core/canvas.js';
import { withAlpha } from '../core/color.js';
import { themeFor } from '../core/theme.js';
import { makeCamera, orbit, lambert, rim, mix, rgba } from '../core/scene3d.js';

export function initAbout() {
  const sec = $('#about');
  if (!sec) return;

  field($('#aboutField'));
  pairViews(sec, [portrait($('#aboutCanvas')), domainSearch($('#aboutSearch'))]);
}

/* ------------------------------------------------------------- the field -- */
/* Streamlines across the section: a coordinate field under load, drifting.
   Deliberately below the threshold of attention — it is the ground the type
   sits on, not a thing to look at. */
function field(canvas) {
  if (!canvas) return;
  const { ctx, size } = fitCanvas(canvas, 1.5);
  const T = themeFor(canvas);
  const R = rng(2207);
  const lines = Array.from({ length: 17 }, (_, i) => ({
    y: (i + .5) / 17,
    k: 1.1 + R() * 1.9,
    ph: R() * Math.PI * 2,
    sp: .06 + R() * .10,
    a: .30 + R() * .70,
  }));

  sceneLoop(canvas, now => {
    const { w, h } = size;
    if (!w) return;
    const t = reduced() ? 0 : now;
    ctx.clearRect(0, 0, w, h);

    /* stations — the vertical reference the streamlines are read against */
    ctx.lineWidth = 1;
    for (let i = 0; i <= 12; i++) {
      const x = (i / 12) * w;
      ctx.strokeStyle = withAlpha(T.accent, i % 4 === 0 ? .07 : .035);
      ctx.beginPath(); ctx.moveTo(x, h * .06); ctx.lineTo(x, h * .94); ctx.stroke();
    }

    for (const L of lines) {
      const y0 = L.y * h;
      /* the disturbance dies away at both edges, so nothing terminates hard */
      ctx.beginPath();
      for (let i = 0; i <= 64; i++) {
        const u = i / 64, x = u * w;
        const env = Math.sin(u * Math.PI);
        const y = y0
          + Math.sin(u * L.k * Math.PI * 2 + t * L.sp + L.ph) * h * .045 * env
          + Math.sin(u * L.k * 2.7 + t * L.sp * .6) * h * .014 * env;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = withAlpha(T.accent, .05 + .07 * L.a);
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
  }, { fps: coarse() ? 18 : 24 });
}

/* ---------------------------------------------------------- the figure -- */
/* Phase space, in three dimensions. Displacement and rate make the circle; time
   is the axis it travels along. The orbit the governing equation allows is
   therefore a tube. A prediction held to the physics winds along the tube's
   wall and stays there; the unconstrained fits agree with the observations at
   the near end and then spiral off it, each one a different answer. Drag to
   turn it. The same argument as before — data alone admits many answers,
   physics admits one — with the extra dimension doing the work. */
function portrait(canvas) {
  if (!canvas) return null;
  const { ctx, size } = fitCanvas(canvas);
  const T = themeFor(canvas);
  let t0 = tickNow(), idle = false, loop = null;
  const ctl = orbit(canvas, { yaw: 0.62, pitch: 0.36, swing: 0.42, onChange: () => loop && loop.redraw() });

  const ACC = [84, 168, 255], OBS_INK = [96, 214, 218], GREY = [150, 172, 198], GLASS = [120, 186, 255];

  /* three fits that agree with the data and then part company with reality —
     one gaining radius, one losing it, one running ahead in phase */
  const FITS = [
    { gain:  0.74, phase:  0.00 },
    { gain: -0.42, phase:  0.18 },
    { gain:  0.26, phase: -0.34 },
  ];
  const TURNS = Math.PI * 2.4, TH0 = -0.62, L = 1.55;     /* tube half-length */
  /* the observations: a short arc near the start of the tube, and nothing else */
  const R = rng(5501);
  const OBS = Array.from({ length: 7 }, (_, i) => {
    const th = -0.62 + (i / 6) * 1.24;
    return { th, jx: (R() - 0.5) * 0.04, jy: (R() - 0.5) * 0.04 };
  });
  const NA = 40, NX = 14;
  const at = (s, r, th) => [-L + 2 * L * s, r * Math.sin(th), r * Math.cos(th)];

  loop = sceneLoop(canvas, now => {
    if (idle) return;
    const { w, h } = size;
    if (!w) return;
    const t = reduced() ? 9 : now - t0;
    const { yaw, pitch } = ctl.pose(now);
    ctx.clearRect(0, 0, w, h);

    const big = w >= 440, KEY = 64, PAD = 12;
    const plotH = h - KEY - PAD;
    const cam = makeCamera({ w: w - PAD * 2, h: plotH, yaw, pitch, dist: 6.6, zoom: 0.60,
                             cx: w / 2, cy: PAD + plotH / 2 });
    const sc = k => k / cam.k0;
    const near = cam.dist - 2.3, far = cam.dist + 2.3;
    const cue = d => clamp(1.14 - ((d - near) / (far - near)) * 0.72, 0.3, 1.14);
    const ops = [];
    const seg = (a, b, col, al, lw) => ops.push({ d: (a[2] + b[2]) / 2, k: 's', a, b, col, al, lw });

    /* ---- the tube: a glass wall that is brightest at its rim ---------------- */
    const grid = [];
    for (let i = 0; i <= NX; i++) {
      const X = -L + (2 * L * i) / NX, row = [];
      for (let a = 0; a < NA; a++) {
        const th = (a / NA) * Math.PI * 2;
        row.push(cam.project(X, Math.sin(th), Math.cos(th)));
      }
      grid.push(row);
    }
    for (let i = 0; i < NX; i++) {
      for (let a = 0; a < NA; a++) {
        const a2 = (a + 1) % NA;
        const thm = ((a + 0.5) / NA) * Math.PI * 2;
        const nv = cam.view(0, Math.sin(thm), Math.cos(thm));
        const alpha = 0.016 + 0.17 * Math.pow(rim(nv), 1.7) + 0.05 * Math.pow(lambert(nv), 3);
        const p = [grid[i][a], grid[i + 1][a], grid[i + 1][a2], grid[i][a2]];
        ops.push({ d: (p[0][2] + p[1][2] + p[2][2] + p[3][2]) / 4, k: 'q', p, fill: rgba(GLASS, alpha) });
      }
    }
    for (const i of [0, 4, 7, 10, 14]) {                  /* cross-sections */
      const row = grid[i];
      ops.push({ d: row.reduce((s, q) => s + q[2], 0) / NA, k: 'ring', row,
                 al: i === 0 || i === NX ? 0.34 : 0.17 });
    }
    for (let a = 0; a < NA; a += 5) {                     /* stringers */
      for (let i = 0; i < NX; i++) seg(grid[i][a], grid[i + 1][a], GLASS, 0.10, 0.9);
    }

    /* ---- what the physics permits: the dashed helix on the wall ------------ */
    const GOV = 150;
    let prev = null;
    for (let i = 0; i <= GOV; i++) {
      const s = i / GOV, q = cam.project(...at(s, 1, TH0 + s * TURNS));
      if (prev && (i % 8) < 4) seg(prev, q, GREY, 0.62, 1.15);
      prev = q;
    }

    const p = reduced() ? 1 : clamp((t * 0.145) % 1.24, 0, 1);

    /* ---- fits with nothing holding them ------------------------------------ */
    FITS.forEach((f, k) => {
      prev = null;
      for (let i = 0; i <= 140; i++) {
        const s = (i / 140) * p;
        const q = cam.project(...at(s, 1 + f.gain * s * s, TH0 + s * TURNS + f.phase * s * s));
        if (prev) seg(prev, q, GREY, 0.58 - k * 0.09, 1.5);
        prev = q;
      }
    });

    /* ---- the prediction held to physics ------------------------------------ */
    prev = null;
    let head = null;
    for (let i = 0; i <= 140; i++) {
      const s = (i / 140) * p;
      const q = cam.project(...at(s, 1, TH0 + s * TURNS));
      if (prev) seg(prev, q, ACC, 1, big ? 3.3 : 2.9);
      prev = q; head = q;
    }
    if (head) ops.push({ d: head[2] - 0.02, k: 'head', p: head });

    /* ---- all the model is given -------------------------------------------- */
    for (const o of OBS) {
      const q = cam.project(...at((o.th - TH0) / TURNS, 1 + o.jx, o.th + o.jy));
      ops.push({ d: q[2] - 0.01, k: 'obs', p: q });
    }

    /* ---- axes -------------------------------------------------------------- */
    const O = [-L - 0.15, -1.2, 1.2];
    const ax = [
      { to: [L + 0.3, -1.2, 1.2], label: 'TIME' },
      { to: [-L - 0.15, 1.2, 1.2], label: 'RATE' },
      { to: [-L - 0.15, -1.2, -1.2], label: 'DISPLACEMENT' },
    ];
    const o2 = cam.project(...O);
    for (const A of ax) {
      const e2 = cam.project(...A.to);
      seg(o2, e2, GREY, 0.34, 1);
      ops.push({ d: e2[2] - 0.05, k: 't', p: e2, text: A.label });
    }

    /* ---- paint, far to near ------------------------------------------------ */
    ops.sort((a, b) => b.d - a.d);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.font = `600 ${big ? 10.5 : 9.5}px ui-monospace, monospace`;
    for (const o of ops) {
      switch (o.k) {
        case 'q':
          ctx.fillStyle = o.fill;
          ctx.beginPath();
          ctx.moveTo(o.p[0][0], o.p[0][1]);
          for (let i = 1; i < 4; i++) ctx.lineTo(o.p[i][0], o.p[i][1]);
          ctx.closePath(); ctx.fill();
          break;
        case 'ring':
          ctx.strokeStyle = rgba(GLASS, o.al * cue(o.d)); ctx.lineWidth = 1;
          ctx.beginPath();
          o.row.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
          ctx.closePath(); ctx.stroke();
          break;
        case 's':
          ctx.strokeStyle = rgba(o.col, Math.min(1, o.al * cue(o.d)));
          ctx.lineWidth = o.lw * clamp(sc(o.a[3]), 0.7, 1.45);
          ctx.beginPath(); ctx.moveTo(o.a[0], o.a[1]); ctx.lineTo(o.b[0], o.b[1]); ctx.stroke();
          break;
        case 'head': {
          const r = 15 * sc(o.p[3]);
          const g = ctx.createRadialGradient(o.p[0], o.p[1], 0, o.p[0], o.p[1], r);
          g.addColorStop(0, rgba(OBS_INK, 0.9)); g.addColorStop(1, rgba(ACC, 0));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(o.p[0], o.p[1], r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath(); ctx.arc(o.p[0], o.p[1], 3 * sc(o.p[3]), 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'obs': {
          const s = sc(o.p[3]), x = o.p[0], y = o.p[1];
          ctx.strokeStyle = rgba(OBS_INK, 0.92); ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.moveTo(x - 5.5 * s, y); ctx.lineTo(x + 5.5 * s, y);
          ctx.moveTo(x, y - 5.5 * s); ctx.lineTo(x, y + 5.5 * s);
          ctx.stroke();
          ctx.fillStyle = rgba(OBS_INK, 0.98);
          ctx.beginPath(); ctx.arc(x, y, 2.5 * s, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 't': {
          const tw = ctx.measureText(o.text).width;
          ctx.fillStyle = withAlpha(T.text3, 0.85 * Math.min(1, cue(o.d)));
          ctx.fillText(o.text, clamp(o.p[0] + 6, PAD, w - PAD - tw), clamp(o.p[1] + 3, PAD + 8, PAD + plotH));
          break;
        }
      }
    }

    /* ---------------------------------------------------------- legend -- */
    legend(ctx, w, h, KEY, PAD, big, [
      ['dash', withAlpha(T.text3, 0.7), 'GOVERNING PHYSICS'],
      ['line', withAlpha(T.text3, 0.55), 'UNCONSTRAINED FITS'],
      ['line', T.accent, 'PHYSICS-GUIDED'],
      ['mark', rgba(OBS_INK, 1), 'OBSERVED'],
    ]);
  }, { fps: coarse() ? 24 : 30 });

  /* one pass of the prediction takes ~6.9 s; the pairing hands over just
     before the trace would start again */
  return view(loop, 8.3, () => { t0 = tickNow(); }, v => { idle = v; });
}

/* ------------------------------------------------------------- legend -- */
/* four rows in the reserved band: nothing floats, nothing collides */
function legend(ctx, w, h, KEY, PAD, big, rows) {
  ctx.font = `600 ${big ? 11 : 10}px ui-monospace, monospace`;
  const colW = Math.max(...rows.map(r => ctx.measureText(r[2]).width)) + 34;
  const twoCol = w >= colW * 2 + PAD * 2;
  rows.forEach((r, i) => {
    const col = twoCol ? i % 2 : 0;
    const rowN = twoCol ? Math.floor(i / 2) : i;
    const x = PAD + col * colW;
    const y = h - KEY + 16 + rowN * (twoCol ? 20 : 15);
    ctx.strokeStyle = r[1]; ctx.fillStyle = r[1];
    ctx.lineWidth = r[0] === 'line' ? 2.2 : 1.4;
    ctx.save();
    if (r[0] === 'dash') ctx.setLineDash([4, 4]);
    if (r[0] === 'mark') {
      ctx.beginPath();
      ctx.moveTo(x + 9, y - 4); ctx.lineTo(x + 9, y + 2);
      ctx.moveTo(x + 6, y - 1); ctx.lineTo(x + 12, y - 1);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 9, y - 1, 1.8, 0, Math.PI * 2); ctx.fill();
    } else if (r[0] === 'dots') {
      ctx.beginPath(); ctx.arc(x + 4, y - 1, 2.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 13, y - 1, 2.1, 0, Math.PI * 2); ctx.fill();
    } else if (r[0] === 'ring') {
      ctx.beginPath(); ctx.arc(x + 9, y - 1, 4.6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 9, y - 1, 1.6, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y - 1); ctx.lineTo(x + 18, y - 1);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = r[1];
    ctx.fillText(r[2], x + 24, y + 2.5);
  });
}

/* A plot the pairing can hand over to: restart from the top when shown, stop
   drawing once hidden. Reduced motion never sleeps — both stills stay painted. */
function view(loop, duration, reset, setIdle) {
  return {
    duration,
    restart() { reset(); setIdle(false); loop.redraw(); },
    sleep() { if (!reduced()) setIdle(true); },
  };
}

/* --------------------------------------------------- the design search -- */
/* A two-variable design space, as a landscape. The surface IS the objective —
   a deep basin the constraint cuts off and a shallower one elsewhere — lit and
   drawn from the same function the search evaluates. The glass wall stands on
   the constraint; the greyed ground behind it is infeasible. A seeded evolution
   strategy searches it: a wide first generation, then generations drawn around
   the incumbent with a shrinking radius. Every sphere is an evaluation of the
   surface under it; nothing is placed by hand. The best feasible design it
   reaches sits on the constraint, within 0.001 of the true constrained optimum
   (0.66, 0.49), and the strip underneath is the best-so-far objective over the
   evaluations. Drag to turn it. */
function domainSearch(canvas) {
  if (!canvas) return null;
  const { ctx, size } = fitCanvas(canvas);
  const T = themeFor(canvas);
  let t0 = tickNow(), idle = false, loop = null;
  const ctl = orbit(canvas, { yaw: -0.5, pitch: 0.44, swing: 0.5, rate: 0.2, minPitch: 0.16, maxPitch: 1.0,
                              onChange: () => loop && loop.redraw() });

  const ACC = [84, 168, 255], HOT = [96, 214, 218], GREY = [150, 172, 198];
  const LOWC = [64, 162, 255], HIGHC = [46, 66, 96], DEAD = [58, 68, 86];

  const f = (x, y) => 1
    - 0.95 * Math.exp(-((x - .68) ** 2 / .045 + (y - .38) ** 2 / .06))
    - 0.52 * Math.exp(-((x - .24) ** 2 / .02 + (y - .72) ** 2 / .026))
    + 0.22 * ((x - .5) ** 2 + (y - .5) ** 2);
  const yb = x => .14 + .42 * x + .08 * Math.sin(Math.PI * x);
  const feasible = (x, y) => y >= yb(x);

  /* the search itself, run once: 7 generations of 10 */
  const R = rng(2219), GENS = 7, LAMBDA = 10, evals = [], gens = [];
  const normal = () => {
    const r = Math.sqrt(-2 * Math.log(Math.max(1e-9, R())));
    return r * Math.cos(2 * Math.PI * R());
  };
  let best = null;
  for (let g = 0; g < GENS; g++) {
    const sigma = .30 * Math.pow(.6, g);
    gens.push({ sigma, centre: best ? { x: best.x, y: best.y } : null });
    for (let k = 0; k < LAMBDA; k++) {
      let x, y;
      if (!best) { x = .04 + R() * .92; y = .04 + R() * .92; }
      else {
        x = best.x + sigma * normal();
        y = best.y + sigma * normal();
        x = clamp(x, .02, .98); y = clamp(y, .02, .98);
      }
      const e = { x, y, f: f(x, y), ok: feasible(x, y), g, n: evals.length, best: null };
      evals.push(e);
      if (e.ok && (!best || e.f < best.f)) best = e;
      e.best = best;
    }
  }
  const FINAL = best;
  const F_TOP = Math.max(...evals.map(e => e.f)), F_BOT = FINAL.f - .06;

  const T_GEN0 = .45, T_GEN = .72, T_EVAL = .045, FADE = .25;
  const tEval = e => T_GEN0 + e.g * T_GEN + (e.n - e.g * LAMBDA) * T_EVAL;
  const T_DONE = tEval(evals[evals.length - 1]) + .55;

  /* the landscape: one height field, sampled once */
  const NG = 30, SPAN = 2.0, FLOOR = -0.66, TOP = 0.7;
  const WX = x => (x - .5) * SPAN, WZ = y => (y - .5) * SPAN;
  const FV = [];
  let fmin = Infinity, fmax = -Infinity;
  for (let j = 0; j <= NG; j++) {
    const row = [];
    for (let i = 0; i <= NG; i++) {
      const v = f(i / NG, j / NG);
      row.push(v);
      if (v < fmin) fmin = v;
      if (v > fmax) fmax = v;
    }
    FV.push(row);
  }
  const hOf = v => (v - .62) * 0.95;
  const surf = (x, y, v) => [WX(x), hOf(v) + 0.02, WZ(y)];
  const QUADS = [];
  for (let j = 0; j < NG; j++) {
    for (let i = 0; i < NG; i++) {
      const v = (FV[j][i] + FV[j][i + 1] + FV[j + 1][i + 1] + FV[j + 1][i]) / 4;
      const dx = hOf(FV[j][i + 1]) - hOf(FV[j][i]), dz = hOf(FV[j + 1][i]) - hOf(FV[j][i]);
      const sx = SPAN / NG;                                 /* the slope the light sees */
      let n = [-dx * sx, sx * sx, -dz * sx];
      const m = Math.hypot(...n); n = n.map(c => c / m);
      const cx = (i + .5) / NG, cy = (j + .5) / NG;
      QUADS.push({ i, j, t: clamp((v - fmin) / (fmax - fmin), 0, 1), n, ok: feasible(cx, cy) });
    }
  }
  const SURF = (i, j) => [WX(i / NG), hOf(FV[j][i]), WZ(j / NG)];

  const geom = (w, h) => {
    const PAD = 12, KEY = 64, big = w >= 440;
    const top = PAD + 2, bottom = h - KEY - 4, avail = bottom - top;
    const dH = Math.round(avail * .68), gap = Math.round(avail * .05);
    const D = { x: PAD, y: top, w: w - PAD * 2, h: dH };
    const S = { x: D.x + 14, y: top + dH + gap, w: D.w - 14, h: avail - dH - gap - (big ? 16 : 14) };
    return { PAD, KEY, big, D, S };
  };

  /* what does not move is drawn once per size: the strip's axes and the legend */
  const layer = document.createElement('canvas'), lc = layer.getContext('2d');
  let layerKey = '';
  const drawLayer = (w, h, dpr) => {
    layer.width = Math.round(w * dpr); layer.height = Math.round(h * dpr);
    lc.setTransform(dpr, 0, 0, dpr, 0, 0);
    lc.clearRect(0, 0, w, h);
    const { PAD, KEY, big, S } = geom(w, h);
    lc.strokeStyle = withAlpha(T.text3, .26); lc.lineWidth = 1;
    lc.beginPath();
    lc.moveTo(S.x + .5, S.y); lc.lineTo(S.x + .5, S.y + S.h - .5); lc.lineTo(S.x + S.w, S.y + S.h - .5);
    lc.stroke();
    lc.save();
    lc.setLineDash([2, 4]); lc.strokeStyle = withAlpha(T.text3, .22);
    const yStar = S.y + 4 + (1 - clamp((FINAL.f - F_BOT) / (F_TOP - F_BOT), 0, 1)) * (S.h - 10);
    lc.beginPath(); lc.moveTo(S.x, yStar); lc.lineTo(S.x + S.w, yStar); lc.stroke();
    lc.restore();
    lc.font = `600 ${big ? 10.5 : 9.5}px ui-monospace, monospace`;
    lc.fillStyle = withAlpha(T.text3, .8);
    const li = 'ITERATION';
    lc.fillText(li, S.x + S.w - lc.measureText(li).width, S.y + S.h + (big ? 14 : 12));
    const lo = 'OBJECTIVE';
    lc.save(); lc.translate(S.x - 5, S.y + lc.measureText(lo).width); lc.rotate(-Math.PI / 2);
    lc.fillText(lo, 0, 0); lc.restore();
    legend(lc, w, h, KEY, PAD, big, [
      ['dash', withAlpha(T.text3, 0.7), 'CONSTRAINT'],
      ['dots', withAlpha(T.text2 || T.text3, 0.7), 'CANDIDATE DESIGNS'],
      ['line', T.accent, 'BEST SO FAR'],
      ['ring', rgba(HOT, 1), 'BEST FEASIBLE'],
    ]);
  };

  loop = sceneLoop(canvas, now => {
    if (idle) return;
    const { w, h, dpr } = size;
    if (!w) return;
    const key = `${w}x${h}x${dpr}`;
    if (key !== layerKey) { drawLayer(w, h, dpr); layerKey = key; }
    const t = reduced() ? 99 : now - t0;
    const { yaw, pitch } = ctl.pose(now);
    ctx.clearRect(0, 0, w, h);

    const { PAD, big, D, S } = geom(w, h);
    const cam = makeCamera({ w: D.w, h: D.h, yaw, pitch, dist: 6.4, zoom: 0.8,
                             cx: D.x + D.w / 2, cy: D.y + D.h / 2 + D.h * 0.02 });
    const sc = k => k / cam.k0;
    const near = cam.dist - 1.6, far = cam.dist + 1.6;
    const cue = d => clamp(1.12 - ((d - near) / (far - near)) * 0.6, 0.4, 1.12);
    const P = (x, y, z) => cam.project(x, y, z);
    const shown = evals.filter(e => t >= tEval(e));
    const last = shown[shown.length - 1];
    const gNow = last ? last.g : -1;
    const searching = t < T_DONE;
    const ops = [];
    const seg = (a, b, col, al, lw) => ops.push({ d: (a[2] + b[2]) / 2, k: 's', a, b, col, al, lw });

    /* ---- the floor: a reference grid and the search radius -------------------- */
    const H = SPAN / 2;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i++) {
      const u = -H + (SPAN * i) / 8;
      const a = P(u, FLOOR, -H), b = P(u, FLOOR, H), c = P(-H, FLOOR, u), d = P(H, FLOOR, u);
      ctx.strokeStyle = withAlpha(T.text3, i % 4 === 0 ? .20 : .09);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
      ctx.stroke();
    }
    const G = gNow >= 0 && gens[gNow].centre ? gens[gNow] : null;
    if (G && searching) {
      const a = clamp((t - (T_GEN0 + gNow * T_GEN)) / .3, 0, 1);
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = rgba(ACC, .5 * a); ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) {
        const th = (i / 48) * Math.PI * 2;
        const q = P(WX(G.centre.x) + Math.cos(th) * G.sigma * SPAN, FLOOR, WZ(G.centre.y) + Math.sin(th) * G.sigma * SPAN);
        i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    /* ---- the surface ------------------------------------------------------------ */
    const V = [];
    for (let j = 0; j <= NG; j++) {
      const row = [];
      for (let i = 0; i <= NG; i++) { const s = SURF(i, j); row.push(P(s[0], s[1], s[2])); }
      V.push(row);
    }
    for (const q of QUADS) {
      const { i, j } = q;
      const p = [V[j][i], V[j][i + 1], V[j + 1][i + 1], V[j + 1][i]];
      const lam = lambert(cam.view(q.n[0], q.n[1], q.n[2]));
      let c = mix(LOWC, HIGHC, Math.pow(q.t, 0.62));
      const shade = 0.4 + 0.85 * lam;
      c = [c[0] * shade, c[1] * shade, c[2] * shade];
      const glow = Math.max(0, .24 - q.t) / .24;
      c = [c[0] + glow * 8, c[1] + glow * 34, c[2] + glow * 60];
      if (!q.ok) c = mix(c, DEAD, 0.6).map(v => v * 0.82);
      ops.push({ d: (p[0][2] + p[1][2] + p[2][2] + p[3][2]) / 4, k: 'surf', p, c });
    }

    /* ---- the glass wall on the constraint -------------------------------------- */
    const WALL = 48;
    for (let i = 0; i < WALL; i++) {
      const x0 = i / WALL, x1 = (i + 1) / WALL;
      const a = P(WX(x0), FLOOR, WZ(yb(x0))), b = P(WX(x1), FLOOR, WZ(yb(x1)));
      const c = P(WX(x1), TOP, WZ(yb(x1))), d = P(WX(x0), TOP, WZ(yb(x0)));
      ops.push({ d: (a[2] + b[2] + c[2] + d[2]) / 4, k: 'wall', p: [a, b, c, d] });
      if (i % 2 === 0) seg(d, c, GREY, 0.7, 1.2);
    }

    /* ---- every evaluation, as a sphere resting on the surface under it ------------ */
    for (const e of shown) {
      const fresh = clamp((t - tEval(e)) / FADE, 0, 1);
      const current = searching && e.g === gNow;
      const s = surf(e.x, e.y, e.f);
      const top = P(s[0], s[1] + 0.06, s[2]), fl = P(s[0], FLOOR, s[2]);
      ops.push({ d: top[2] + 0.3, k: 'drop', a: top, b: fl, al: fresh * (current ? .28 : .11) });
      ops.push({ d: top[2] - 0.16, k: 'pt', p: top, ok: e.ok, a: fresh * (current ? 1 : .7), cur: current });
    }

    /* ---- the incumbent's path across the surface ---------------------------------- */
    const trail = [];
    for (const e of shown) if (e.best && trail[trail.length - 1] !== e.best) trail.push(e.best);
    const tp = trail.map(b => { const s = surf(b.x, b.y, b.f); return P(s[0], s[1] + 0.065, s[2]); });
    for (let i = 1; i < tp.length; i++) {
      const age = .3 + .7 * (i / (tp.length - 1));
      { const a = tp[i - 1], b = tp[i]; ops.push({ d: (a[2] + b[2]) / 2 - 0.18, k: 's', a, b, col: ACC, al: age, lw: (big ? 2.8 : 2.4) * (.7 + .3 * age) }); }
    }
    if (tp.length) ops.push({ d: tp[tp.length - 1][2] - .2, k: 'head', p: tp[tp.length - 1] });

    /* ---- the search has settled: mark the best feasible design -------------------- */
    let beam = null;
    if (!searching) {
      const a = clamp((t - T_DONE) / .5, 0, 1);
      const s = surf(FINAL.x, FINAL.y, FINAL.f);
      const ring = [];
      for (let i = 0; i <= 28; i++) {
        const th = (i / 28) * Math.PI * 2;
        ring.push(P(s[0] + Math.cos(th) * .1, s[1] + .05, s[2] + Math.sin(th) * .1));
      }
      ops.push({ d: P(s[0], s[1], s[2])[2] - .2, k: 'ring', ring, a });
      beam = { a, from: P(s[0], s[1] + .05, s[2]), to: P(s[0], TOP, s[2]) };
    }

    /* ---- paint, far to near -------------------------------------------------------- */
    ops.sort((p, q) => q.d - p.d);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const o of ops) {
      switch (o.k) {
        case 'surf':
          ctx.fillStyle = rgba(o.c, .94); ctx.strokeStyle = rgba(o.c, .94); ctx.lineWidth = .7;
          ctx.beginPath();
          ctx.moveTo(o.p[0][0], o.p[0][1]);
          for (let i = 1; i < 4; i++) ctx.lineTo(o.p[i][0], o.p[i][1]);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = 'rgba(190,225,255,.10)'; ctx.lineWidth = .6; ctx.stroke();
          break;
        case 'wall':
          ctx.fillStyle = withAlpha(T.text3, .075);
          ctx.beginPath();
          ctx.moveTo(o.p[0][0], o.p[0][1]);
          for (let i = 1; i < 4; i++) ctx.lineTo(o.p[i][0], o.p[i][1]);
          ctx.closePath(); ctx.fill();
          break;
        case 's':
          ctx.strokeStyle = rgba(o.col, Math.min(1, o.al * cue(o.d)));
          ctx.lineWidth = o.lw * clamp(sc(o.a[3]), 0.7, 1.4);
          ctx.beginPath(); ctx.moveTo(o.a[0], o.a[1]); ctx.lineTo(o.b[0], o.b[1]); ctx.stroke();
          break;
        case 'drop':
          ctx.strokeStyle = rgba(GREY, o.al); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(o.a[0], o.a[1]); ctx.lineTo(o.b[0], o.b[1]); ctx.stroke();
          break;
        case 'pt': {
          const r = (o.cur ? 4.6 : 3.8) * sc(o.p[3]) * (big ? 1.1 : 1);
          if (o.ok) {
            const g = ctx.createRadialGradient(o.p[0] - r * .35, o.p[1] - r * .4, 0, o.p[0], o.p[1], r);
            g.addColorStop(0, `rgba(238,246,255,${o.a})`); g.addColorStop(1, `rgba(120,160,205,${o.a * .9})`);
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(o.p[0], o.p[1], r, 0, Math.PI * 2); ctx.fill();
          } else {
            ctx.strokeStyle = withAlpha(T.text3, o.a * .9); ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(o.p[0] - r * .8, o.p[1] - r * .8); ctx.lineTo(o.p[0] + r * .8, o.p[1] + r * .8);
            ctx.moveTo(o.p[0] + r * .8, o.p[1] - r * .8); ctx.lineTo(o.p[0] - r * .8, o.p[1] + r * .8);
            ctx.stroke();
          }
          break;
        }
        case 'head': {
          const r = 15 * sc(o.p[3]);
          const g = ctx.createRadialGradient(o.p[0], o.p[1], 0, o.p[0], o.p[1], r);
          g.addColorStop(0, rgba(HOT, .9)); g.addColorStop(1, rgba(ACC, 0));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(o.p[0], o.p[1], r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath(); ctx.arc(o.p[0], o.p[1], 3 * sc(o.p[3]), 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'ring':
          ctx.strokeStyle = rgba(HOT, o.a); ctx.lineWidth = 1.8;
          ctx.beginPath();
          o.ring.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
          ctx.stroke();
          break;
      }
    }
    if (beam) {                                           /* a pillar of light on the optimum */
      const g = ctx.createLinearGradient(beam.from[0], beam.from[1], beam.to[0], beam.to[1]);
      g.addColorStop(0, rgba(HOT, .75 * beam.a)); g.addColorStop(1, rgba(HOT, 0));
      ctx.strokeStyle = g; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(beam.from[0], beam.from[1]); ctx.lineTo(beam.to[0], beam.to[1]); ctx.stroke();
    }

    /* ---- axis labels, kept inside the frame ------------------------------------------ */
    ctx.font = `600 ${big ? 10.5 : 9.5}px ui-monospace, monospace`;
    const label = (text, q, dx = 6, dy = 4, al = .8) => {
      const tw = ctx.measureText(text).width;
      ctx.fillStyle = withAlpha(T.text3, al);
      ctx.fillText(text, clamp(q[0] + dx, D.x + 2, D.x + D.w - tw - 2), clamp(q[1] + dy, D.y + 10, D.y + D.h - 2));
    };
    label('DESIGN VARIABLE 1', P(H + .06, FLOOR, -H));
    label('DESIGN VARIABLE 2', P(-H, FLOOR, H + .06));
    label('OBJECTIVE', P(-H, TOP, H), 6, -2, .7);
    const inf = surf(.84, .08, f(.84, .08));
    label('INFEASIBLE', P(inf[0], inf[1] + .02, inf[2]), -20, 14, .5);

    /* ---- the convergence strip: the same evaluations, plotted over iteration --------- */
    ctx.drawImage(layer, 0, 0, w, h);
    const SX = n => S.x + 8 + (n / (evals.length - 1)) * (S.w - 16);
    const SY = v => S.y + 4 + (1 - clamp((v - F_BOT) / (F_TOP - F_BOT), 0, 1)) * (S.h - 10);
    for (const e of shown) {
      const fresh = clamp((t - tEval(e)) / FADE, 0, 1);
      ctx.fillStyle = withAlpha(T.text3, fresh * .5);
      ctx.beginPath(); ctx.arc(SX(e.n), SY(e.f), 1.5, 0, Math.PI * 2); ctx.fill();
    }
    if (shown.length) {
      ctx.strokeStyle = T.accent; ctx.lineWidth = big ? 2.4 : 2;
      ctx.beginPath();
      let prevB = null;
      for (const e of shown) {
        if (!e.best) continue;
        if (!prevB) ctx.moveTo(SX(e.n), SY(e.best.f));
        else { ctx.lineTo(SX(e.n), SY(prevB.f)); ctx.lineTo(SX(e.n), SY(e.best.f)); }
        prevB = e.best;
      }
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(SX(last.n), SY(last.best ? last.best.f : F_TOP), 2.4, 0, Math.PI * 2); ctx.fill();
    }
  }, { fps: coarse() ? 24 : 30 });

  return view(loop, 8.6, () => { t0 = tickNow(); }, v => { idle = v; });
}

/* ---------------------------------------------------------- the pairing -- */
/* A two-slide slideshow in one frame: 01 plays, then 02, then round again.
   Picking a tab (or an arrow key) jumps to that slide and plays it from the
   start; the show then carries on from there. It advances only while the
   figure is on screen and the tab is visible, holds while a tab has keyboard
   focus, and reduced motion never auto-advances — the reader picks the slide. */
function pairViews(sec, views) {
  const tabs = $$('.about__view', sec);
  const canvases = [$('#aboutCanvas'), $('#aboutSearch')];
  const cap = $('#aboutCap'), fig = $('.about__fig', sec), list = $('.about__views', sec);
  if (tabs.length !== 2 || !fig || !list || views.some(v => !v) || canvases.some(c => !c)) return;
  const CAPS = [
    'Physics-guided learning <b>·</b> phase space <b>·</b> drag to rotate',
    'Design optimization <b>·</b> domain search <b>·</b> drag to rotate',
  ];
  const auto = !reduced();
  const SHIFT = 22;                                  /* px a slide travels in/out */
  let cur = 0, onScreen = false, held = false, timer = 0, sleeper = 0;

  const progress = () => {
    tabs.forEach((b, k) => {
      const bar = $('i', b);
      if (!bar) return;
      bar.style.transition = 'none';
      bar.style.transform = 'scaleX(0)';
      if (k !== cur || !auto || !onScreen || held || document.hidden) return;
      void bar.offsetWidth;                       /* restart the transition */
      bar.style.transition = `transform ${views[cur].duration}s linear`;
      bar.style.transform = 'scaleX(1)';
    });
  };
  const schedule = () => {
    clearTimeout(timer);
    progress();
    if (!auto || !onScreen || held || document.hidden) return;
    timer = setTimeout(() => show((cur + 1) % 2, 1), views[cur].duration * 1000);
  };
  /* dir: +1 slides the new plot in from the right, -1 from the left */
  function show(i, dir = 1) {
    const prev = cur;
    cur = i;
    if (prev !== i && auto) {
      const incoming = canvases[i], outgoing = canvases[prev];
      /* A slide picked again mid-fade just reverses from where it is. Only a
         slide fully at rest gets the start offset — and then only transform
         is held out of the transition, so no running fade is ever cancelled. */
      const busy = incoming.getAnimations ? incoming.getAnimations().length > 0 : false;
      if (!busy && getComputedStyle(incoming).opacity === '0') {
        incoming.style.transitionProperty = 'opacity';
        incoming.style.transform = `translateX(${dir * SHIFT}px)`;
        void incoming.offsetWidth;                   /* commit the start position */
        incoming.style.transitionProperty = '';
      }
      incoming.style.transform = '';
      outgoing.style.transform = `translateX(${-dir * SHIFT}px)`;
    }
    canvases.forEach((c, k) => {
      c.classList.toggle('is-active', k === i);
      c.setAttribute('aria-hidden', String(k !== i));
    });
    tabs.forEach((b, k) => {
      b.setAttribute('aria-selected', String(k === i));
      b.tabIndex = k === i ? 0 : -1;
    });
    if (cap) cap.innerHTML = CAPS[i];
    views[i].restart();
    clearTimeout(sleeper);
    sleeper = setTimeout(() => views.forEach((v, k) => { if (k !== cur) v.sleep(); }), 700);
    schedule();
  }

  tabs.forEach((b, k) => on(b, 'click', () => show(k, k >= cur ? 1 : -1)));
  on(list, 'keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    held = true;                                   /* arrow keys: a keyboard user is here */
    const k = (cur + 1) % 2;
    show(k, e.key === 'ArrowRight' ? 1 : -1);
    tabs[k].focus();
  });

  /* a keyboard user on the tabs holds the show; a mouse click does not */
  on(list, 'pointerdown', () => { held = false; });
  on(list, 'focusin', e => { held = !!(e.target.matches && e.target.matches(':focus-visible')); schedule(); });
  on(list, 'focusout', e => { if (!list.contains(e.relatedTarget)) { held = false; schedule(); } });

  views[1].sleep();
  new IntersectionObserver(es => {
    const was = onScreen;
    onScreen = es[0].isIntersecting;
    if (onScreen && !was) show(cur);              /* the current plot starts from the top */
    else if (!onScreen) { clearTimeout(timer); progress(); }
  }, { threshold: .25 }).observe(fig);
  on(document, 'visibilitychange', () => {
    if (document.hidden) { clearTimeout(timer); progress(); }
    else if (onScreen) show(cur);
  });
}
