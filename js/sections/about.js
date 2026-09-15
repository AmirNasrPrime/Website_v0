/* ============================================================================
   PRIME-CAE · 01 · about
   The transition out of the hero, and the one claim the section makes, drawn.

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
import { $, $$, on, clamp, lerp, rng, reduced, coarse } from '../core/dom.js';
import { fitCanvas, sceneLoop } from '../core/canvas.js';
import { withAlpha } from '../core/color.js';
import { themeFor } from '../core/theme.js';

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
/* Phase portrait: displacement across, rate up. The dashed orbit is what the
   governing equation permits; the grey curves are what a model does without
   it. Everything is laid out inside a reserved box so no label can ever run
   off the canvas. */
function portrait(canvas) {
  if (!canvas) return;
  const { ctx, size } = fitCanvas(canvas);
  const T = themeFor(canvas);
  let t0 = performance.now() / 1000, idle = false;

  /* three fits that agree with the data and then part company with reality —
     one gaining amplitude, one losing it, one running ahead in phase */
  const FITS = [
    { gain:  0.42, phase:  0.00 },
    { gain: -0.42, phase:  0.18 },
    { gain:  0.26, phase: -0.34 },
  ];
  const MAXR = 1.42;                       /* the furthest any curve travels */
  /* the observations: a short arc of the orbit, and nothing else */
  const R = rng(5501);
  const OBS = Array.from({ length: 7 }, (_, i) => {
    const th = -0.62 + (i / 6) * 1.24;
    return { th, jx: (R() - 0.5) * 0.04, jy: (R() - 0.5) * 0.04 };
  });

  const loop = sceneLoop(canvas, now => {
    if (idle) return;
    const { w, h } = size;
    if (!w) return;
    const t = reduced() ? 9 : now - t0;
    ctx.clearRect(0, 0, w, h);

    const mono = px => `600 ${px}px ui-monospace, monospace`;
    const big = w >= 440;                  /* a roomier canvas gets roomier type */
    const KEY = 64;                        /* the band the legend owns       */
    const PAD = 12;
    const plotH = h - KEY - PAD;
    const cx = w / 2, cy = PAD + plotH / 2;
    const A = (w / 2 - PAD) / MAXR;
    const B = Math.min((plotH / 2 - PAD) / MAXR, A * 0.92);
    const P = (r, th) => [cx + A * r * Math.cos(th), cy - B * r * Math.sin(th)];

    /* ------------------------------------------------------------ axes -- */
    ctx.strokeStyle = withAlpha(T.text3, 0.26);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - A * MAXR, cy); ctx.lineTo(cx + A * MAXR, cy);
    ctx.moveTo(cx, cy - B * MAXR); ctx.lineTo(cx, cy + B * MAXR);
    ctx.stroke();
    for (let i = -2; i <= 2; i++) {
      if (!i) continue;
      ctx.beginPath();
      ctx.moveTo(cx + A * i * 0.5, cy - 3.5); ctx.lineTo(cx + A * i * 0.5, cy + 3.5);
      ctx.moveTo(cx - 3.5, cy + B * i * 0.5); ctx.lineTo(cx + 3.5, cy + B * i * 0.5);
      ctx.stroke();
    }
    ctx.font = mono(big ? 10.5 : 9.5);
    ctx.fillStyle = withAlpha(T.text3, 0.8);
    const xl = 'DISPLACEMENT';
    ctx.fillText(xl, Math.min(cx + A * MAXR - ctx.measureText(xl).width, w - PAD - ctx.measureText(xl).width), cy - 7);
    ctx.save();
    ctx.translate(cx - 7, cy - B * MAXR + ctx.measureText('RATE').width);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('RATE', 0, 0);
    ctx.restore();

    /* -------------------------------------- what the physics permits ---- */
    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = withAlpha(T.text3, 0.6);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const q = P(1, (i / 96) * Math.PI * 2);
      i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
    }
    ctx.closePath(); ctx.stroke();
    ctx.restore();

    const p = reduced() ? 1 : clamp((t * 0.145) % 1.24, 0, 1);
    const span = p * Math.PI * 2.4;

    /* ------------------------------------- fits with nothing holding -- */
    ctx.lineWidth = 1.5;
    FITS.forEach((f, k) => {
      ctx.strokeStyle = withAlpha(T.text3, 0.52 - k * 0.08);
      ctx.beginPath();
      for (let i = 0; i <= 140; i++) {
        const th = -0.62 + (i / 140) * span;
        const u = clamp((th + 0.62) / (Math.PI * 2.4), 0, 1);
        const q = P(1 + f.gain * u * u, th + f.phase * u * u);
        i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
      }
      ctx.stroke();
    });

    /* --------------------------------- the prediction held to physics -- */
    ctx.strokeStyle = T.accent;
    ctx.lineWidth = big ? 3.2 : 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 140; i++) {
      const q = P(1, -0.62 + (i / 140) * span);
      i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
    }
    ctx.stroke();

    const head = P(1, -0.62 + span);
    const g = ctx.createRadialGradient(head[0], head[1], 0, head[0], head[1], 14);
    g.addColorStop(0, withAlpha(T.accent2 || T.accent, 0.9));
    g.addColorStop(1, withAlpha(T.accent, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(head[0], head[1], 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(head[0], head[1], 3, 0, Math.PI * 2); ctx.fill();

    /* ---------------------------------------- all the model is given -- */
    const obsInk = T.accent2 || T.accent;
    for (const o of OBS) {
      const q = P(1 + o.jx, o.th + o.jy);
      ctx.strokeStyle = withAlpha(obsInk, 0.9);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(q[0] - 5, q[1]); ctx.lineTo(q[0] + 5, q[1]);
      ctx.moveTo(q[0], q[1] - 5); ctx.lineTo(q[0], q[1] + 5);
      ctx.stroke();
      ctx.fillStyle = withAlpha(obsInk, 0.95);
      ctx.beginPath(); ctx.arc(q[0], q[1], 2.4, 0, Math.PI * 2); ctx.fill();
    }

    /* --------------------------------------------------------- legend -- */
    legend(ctx, w, h, KEY, PAD, big, [
      ['dash', withAlpha(T.text3, 0.7), 'GOVERNING PHYSICS'],
      ['line', withAlpha(T.text3, 0.55), 'UNCONSTRAINED FITS'],
      ['line', T.accent, 'PHYSICS-GUIDED'],
      ['mark', obsInk, 'OBSERVED'],
    ]);
  }, { fps: coarse() ? 24 : 30 });

  /* one pass of the prediction takes ~6.9 s; the pairing hands over just
     before the trace would start again */
  return view(loop, 8.3, () => { t0 = performance.now() / 1000; }, v => { idle = v; });
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
/* A two-variable design domain. The contours are a real objective landscape —
   a deep basin the constraint cuts off and a shallower one elsewhere — and the
   hatched side of the dashed constraint is infeasible. A seeded evolution
   strategy searches it: a wide first generation, then generations drawn
   around the incumbent with a shrinking radius. Every dot is an evaluation of
   the same function the contours are drawn from; nothing is placed by hand.
   The best feasible design it reaches sits on the constraint, within 0.001 of
   the true constrained optimum (0.66, 0.49), and the strip underneath is the
   best-so-far objective over the evaluations. */
function domainSearch(canvas) {
  if (!canvas) return null;
  const { ctx, size } = fitCanvas(canvas);
  const T = themeFor(canvas);
  let t0 = performance.now() / 1000, idle = false;

  const f = (x, y) => 1
    - 0.95 * Math.exp(-((x - .68) ** 2 / .045 + (y - .38) ** 2 / .06))
    - 0.52 * Math.exp(-((x - .24) ** 2 / .02 + (y - .72) ** 2 / .026))
    + 0.22 * ((x - .5) ** 2 + (y - .5) ** 2);
  const yb = x => .14 + .42 * x + .08 * Math.sin(Math.PI * x);
  const feasible = (x, y) => y >= yb(x);

  /* the landscape, sampled once in unit coordinates and contoured (marching
     squares) so a resize only rescales it */
  const NG = 72, vals = new Float32Array((NG + 1) * (NG + 1));
  let fmin = Infinity, fmax = -Infinity;
  for (let j = 0; j <= NG; j++) for (let i = 0; i <= NG; i++) {
    const v = f(i / NG, j / NG);
    vals[j * (NG + 1) + i] = v;
    if (v < fmin) fmin = v;
    if (v > fmax) fmax = v;
  }
  const V = (i, j) => vals[j * (NG + 1) + i];
  const LEVELS = 11;
  const contours = Array.from({ length: LEVELS }, (_, k) => {
    const L = fmin + .03 + (k / (LEVELS - 1)) * (fmax - fmin - .09);
    const segs = [];
    for (let j = 0; j < NG; j++) for (let i = 0; i < NG; i++) {
      const c = [V(i, j), V(i + 1, j), V(i + 1, j + 1), V(i, j + 1)];
      const P = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
      const hit = [];
      for (let e = 0; e < 4; e++) {
        const a = c[e], b = c[(e + 1) % 4];
        if ((a < L) === (b < L)) continue;
        const u = (L - a) / (b - a), pa = P[e], pb = P[(e + 1) % 4];
        hit.push((pa[0] + (pb[0] - pa[0]) * u) / NG, (pa[1] + (pb[1] - pa[1]) * u) / NG);
      }
      if (hit.length >= 4) segs.push(...hit);
    }
    return segs;
  });

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

  const geom = (w, h) => {
    const PAD = 12, KEY = 64, big = w >= 440;
    const top = PAD + 2, bottom = h - KEY - 4, avail = bottom - top;
    const dH = Math.round(avail * .66), gap = Math.round(avail * .08);
    const D = { x: PAD + 14, y: top, w: w - PAD * 2 - 14, h: dH };
    const S = { x: D.x, y: top + dH + gap, w: D.w, h: avail - dH - gap - (big ? 16 : 14) };
    return { PAD, KEY, big, D, S };
  };

  /* everything that does not move is drawn once per size */
  const layer = document.createElement('canvas'), lc = layer.getContext('2d');
  let layerKey = '';
  const drawLayer = (w, h, dpr) => {
    layer.width = Math.round(w * dpr); layer.height = Math.round(h * dpr);
    lc.setTransform(dpr, 0, 0, dpr, 0, 0);
    lc.clearRect(0, 0, w, h);
    const { PAD, KEY, big, D, S } = geom(w, h);
    const X = x => D.x + x * D.w, Y = y => D.y + (1 - y) * D.h;
    const mono = px => `600 ${px}px ui-monospace, monospace`;

    lc.save();
    lc.beginPath(); lc.rect(D.x, D.y, D.w, D.h); lc.clip();
    /* the infeasible side of the constraint */
    lc.beginPath();
    lc.moveTo(X(0), Y(0));
    for (let i = 0; i <= 48; i++) lc.lineTo(X(i / 48), Y(yb(i / 48)));
    lc.lineTo(X(1), Y(0)); lc.closePath();
    lc.fillStyle = withAlpha(T.text3, .06); lc.fill();
    lc.save(); lc.clip();
    lc.strokeStyle = withAlpha(T.text3, .085); lc.lineWidth = 1;
    for (let s = -D.h; s < D.w; s += 7) {
      lc.beginPath(); lc.moveTo(D.x + s, D.y + D.h); lc.lineTo(D.x + s + D.h, D.y); lc.stroke();
    }
    lc.restore();
    /* the objective landscape: low levels in the accent, high ones in grey */
    contours.forEach((segs, k) => {
      lc.strokeStyle = k < 4 ? withAlpha(T.accent, .44 - k * .07) : withAlpha(T.text3, .24 - (k - 4) * .018);
      lc.lineWidth = k < 4 ? 1.15 : 1;
      lc.beginPath();
      for (let i = 0; i < segs.length; i += 4) {
        lc.moveTo(X(segs[i]), Y(segs[i + 1])); lc.lineTo(X(segs[i + 2]), Y(segs[i + 3]));
      }
      lc.stroke();
    });
    /* the constraint, drawn like the governing physics next door */
    lc.setLineDash([4, 6]);
    lc.strokeStyle = withAlpha(T.text3, .62); lc.lineWidth = 1.2;
    lc.beginPath();
    for (let i = 0; i <= 64; i++) {
      const x = i / 64;
      i ? lc.lineTo(X(x), Y(yb(x))) : lc.moveTo(X(x), Y(yb(x)));
    }
    lc.stroke();
    lc.setLineDash([]);
    lc.restore();

    /* frames and axes */
    lc.strokeStyle = withAlpha(T.text3, .26); lc.lineWidth = 1;
    lc.strokeRect(D.x + .5, D.y + .5, D.w - 1, D.h - 1);
    lc.beginPath();
    lc.moveTo(S.x + .5, S.y); lc.lineTo(S.x + .5, S.y + S.h - .5); lc.lineTo(S.x + S.w, S.y + S.h - .5);
    lc.stroke();
    lc.save();
    lc.setLineDash([2, 4]); lc.strokeStyle = withAlpha(T.text3, .22);
    const yStar = S.y + 4 + (1 - clamp((FINAL.f - F_BOT) / (F_TOP - F_BOT), 0, 1)) * (S.h - 10);
    lc.beginPath(); lc.moveTo(S.x, yStar); lc.lineTo(S.x + S.w, yStar); lc.stroke();
    lc.restore();

    lc.font = mono(big ? 10.5 : 9.5);
    lc.fillStyle = withAlpha(T.text3, .8);
    const lx = 'DESIGN VARIABLE 1';
    lc.fillText(lx, D.x + D.w - lc.measureText(lx).width, D.y + D.h + (big ? 14 : 12));
    const ly = 'DESIGN VARIABLE 2';
    lc.save(); lc.translate(D.x - 5, D.y + lc.measureText(ly).width + 4); lc.rotate(-Math.PI / 2);
    lc.fillText(ly, 0, 0); lc.restore();
    const li = 'ITERATION';
    lc.fillText(li, S.x + S.w - lc.measureText(li).width, S.y + S.h + (big ? 14 : 12));
    const lo = 'OBJECTIVE';
    lc.save(); lc.translate(S.x - 5, S.y + lc.measureText(lo).width); lc.rotate(-Math.PI / 2);
    lc.fillText(lo, 0, 0); lc.restore();
    lc.fillStyle = withAlpha(T.text3, .5);
    const ln = 'INFEASIBLE';
    lc.fillText(ln, X(.97) - lc.measureText(ln).width, Y(.07));

    legend(lc, w, h, KEY, PAD, big, [
      ['dash', withAlpha(T.text3, 0.7), 'CONSTRAINT'],
      ['dots', withAlpha(T.text2 || T.text3, 0.7), 'CANDIDATE DESIGNS'],
      ['line', T.accent, 'BEST SO FAR'],
      ['ring', T.accent2 || T.accent, 'BEST FEASIBLE'],
    ]);
  };

  const loop = sceneLoop(canvas, now => {
    if (idle) return;
    const { w, h, dpr } = size;
    if (!w) return;
    const key = `${w}x${h}x${dpr}`;
    if (key !== layerKey) { drawLayer(w, h, dpr); layerKey = key; }
    const t = reduced() ? 99 : now - t0;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(layer, 0, 0, w, h);

    const { big, D, S } = geom(w, h);
    const X = x => D.x + x * D.w, Y = y => D.y + (1 - y) * D.h;
    const SX = n => S.x + 8 + (n / (evals.length - 1)) * (S.w - 16);
    const SY = v => S.y + 4 + (1 - clamp((v - F_BOT) / (F_TOP - F_BOT), 0, 1)) * (S.h - 10);
    const hot = T.accent2 || T.accent;
    const shown = evals.filter(e => t >= tEval(e));
    const last = shown[shown.length - 1];
    const gNow = last ? last.g : -1;
    const searching = t < T_DONE;

    /* the radius the current generation is drawn from */
    if (last && searching && gens[gNow].centre) {
      const G = gens[gNow], a = clamp((t - (T_GEN0 + gNow * T_GEN)) / .3, 0, 1);
      ctx.save();
      ctx.beginPath(); ctx.rect(D.x, D.y, D.w, D.h); ctx.clip();
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = withAlpha(T.accent, .34 * a); ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(X(G.centre.x), Y(G.centre.y), G.sigma * D.w, G.sigma * D.h, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    /* every evaluation: feasible as dots, infeasible as crosses */
    for (const e of shown) {
      const fresh = clamp((t - tEval(e)) / FADE, 0, 1);
      const current = searching && e.g === gNow;
      const a = fresh * (current ? .95 : .4);
      const px = X(e.x), py = Y(e.y);
      if (e.ok) {
        ctx.fillStyle = withAlpha(T.text2 || T.text3, a);
        ctx.beginPath(); ctx.arc(px, py, current ? 2.6 : 2.1, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.strokeStyle = withAlpha(T.text3, a * .85); ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(px - 2.4, py - 2.4); ctx.lineTo(px + 2.4, py + 2.4);
        ctx.moveTo(px + 2.4, py - 2.4); ctx.lineTo(px - 2.4, py + 2.4);
        ctx.stroke();
      }
      /* the same evaluation in the convergence strip */
      ctx.fillStyle = withAlpha(T.text3, fresh * .5);
      ctx.beginPath(); ctx.arc(SX(e.n), SY(e.f), 1.5, 0, Math.PI * 2); ctx.fill();
    }

    /* the incumbent's path through the domain, and the best-so-far curve */
    const trail = [];
    for (const e of shown) if (e.best && trail[trail.length - 1] !== e.best) trail.push(e.best);
    if (trail.length) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const age = i => trail.length < 2 ? 1 : .22 + .78 * (i / (trail.length - 1));
      for (let i = 1; i < trail.length; i++) {
        ctx.strokeStyle = withAlpha(T.accent, age(i));
        ctx.lineWidth = (big ? 2.2 : 1.9) * (.7 + .3 * age(i));
        ctx.beginPath();
        ctx.moveTo(X(trail[i - 1].x), Y(trail[i - 1].y));
        ctx.lineTo(X(trail[i].x), Y(trail[i].y));
        ctx.stroke();
      }
      trail.forEach((b, i) => {
        ctx.fillStyle = withAlpha(T.accent, age(i));
        ctx.beginPath(); ctx.arc(X(b.x), Y(b.y), 2.2, 0, Math.PI * 2); ctx.fill();
      });
      ctx.strokeStyle = T.accent; ctx.lineWidth = big ? 2.4 : 2;

      ctx.beginPath();
      let prev = null;
      for (const e of shown) {
        if (!e.best) continue;
        if (!prev) ctx.moveTo(SX(e.n), SY(e.best.f));
        else { ctx.lineTo(SX(e.n), SY(prev.f)); ctx.lineTo(SX(e.n), SY(e.best.f)); }
        prev = e.best;
      }
      ctx.stroke();

      const head = trail[trail.length - 1];
      const hx = X(head.x), hy = Y(head.y);
      const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 14);
      g.addColorStop(0, withAlpha(hot, .9));
      g.addColorStop(1, withAlpha(T.accent, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(hx, hy, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(hx, hy, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(SX(last.n), SY(last.best ? last.best.f : F_TOP), 2.4, 0, Math.PI * 2); ctx.fill();
    }

    /* the search has settled: mark the best feasible design */
    if (!searching) {
      const a = clamp((t - T_DONE) / .5, 0, 1);
      const bx = X(FINAL.x), by = Y(FINAL.y);
      ctx.strokeStyle = withAlpha(hot, a); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(bx - 15, by); ctx.lineTo(bx - 11, by); ctx.moveTo(bx + 11, by); ctx.lineTo(bx + 15, by);
      ctx.moveTo(bx, by - 15); ctx.lineTo(bx, by - 11); ctx.moveTo(bx, by + 11); ctx.lineTo(bx, by + 15);
      ctx.stroke();
    }
  }, { fps: coarse() ? 24 : 30 });

  return view(loop, 8.6, () => { t0 = performance.now() / 1000; }, v => { idle = v; });
}

/* ---------------------------------------------------------- the pairing -- */
/* The two plots alternate in one frame. Auto-advance runs only while the
   figure is on screen and the tab is visible, and stops for good the moment
   the reader picks a view. Reduced motion never auto-advances. */
function pairViews(sec, views) {
  const tabs = $$('.about__view', sec);
  const canvases = [$('#aboutCanvas'), $('#aboutSearch')];
  const cap = $('#aboutCap'), fig = $('.about__fig', sec), list = $('.about__views', sec);
  if (tabs.length !== 2 || !fig || !list || views.some(v => !v) || canvases.some(c => !c)) return;
  const CAPS = [
    'Physics-guided learning <b>·</b> phase portrait',
    'Design optimization <b>·</b> domain search',
  ];
  let cur = 0, auto = !reduced(), onScreen = false, timer = 0, sleeper = 0;

  const progress = () => {
    tabs.forEach((b, k) => {
      const bar = $('i', b);
      if (!bar) return;
      bar.style.transition = 'none';
      bar.style.transform = 'scaleX(0)';
      if (k !== cur || !auto || !onScreen || document.hidden) return;
      void bar.offsetWidth;                       /* restart the transition */
      bar.style.transition = `transform ${views[cur].duration}s linear`;
      bar.style.transform = 'scaleX(1)';
    });
  };
  const schedule = () => {
    clearTimeout(timer);
    progress();
    if (!auto || !onScreen || document.hidden) return;
    timer = setTimeout(() => show(1 - cur), views[cur].duration * 1000);
  };
  function show(i) {
    const prev = cur;
    cur = i;
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
    if (prev !== i) sleeper = setTimeout(() => views[prev].sleep(), 700);
    schedule();
  }

  tabs.forEach((b, k) => on(b, 'click', () => { auto = false; show(k); }));
  on(list, 'keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    auto = false;
    const k = 1 - cur;
    show(k);
    tabs[k].focus();
  });

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
