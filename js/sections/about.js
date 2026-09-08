/* ============================================================================
   PRIME-CAE · 01 · about
   The transition out of the hero, and the one claim the section makes, drawn.

   The figure is a phase portrait of an oscillating system. Sparse observations
   are all any model is given; several unconstrained fits pass straight through
   them and then drift off, each one a different answer. The physics-guided
   prediction is held on the orbit the governing equation allows, and stays on
   it all the way round. That is the whole argument for physics-guided learning
   in one picture: data alone admits many answers, physics admits one.

   Nothing here animates for its own sake — the field drifts, the two
   predictions trace once, and reduced motion draws the settled state.
   ========================================================================== */
import { $, clamp, lerp, rng, reduced, coarse } from '../core/dom.js';
import { fitCanvas, sceneLoop } from '../core/canvas.js';
import { withAlpha } from '../core/color.js';
import { themeFor } from '../core/theme.js';

export function initAbout() {
  const sec = $('#about');
  if (!sec) return;

  field($('#aboutField'));
  portrait($('#aboutCanvas'));
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
  const t0 = performance.now() / 1000;

  /* three fits that agree with the data and then part company with reality —
     one gaining amplitude, one losing it, one running ahead in phase */
  const FITS = [
    { gain:  0.74, phase:  0.00 },
    { gain: -0.42, phase:  0.18 },
    { gain:  0.26, phase: -0.34 },
  ];
  const MAXR = 1.74;                       /* the furthest any curve travels */
  /* the observations: a short arc of the orbit, and nothing else */
  const R = rng(5501);
  const OBS = Array.from({ length: 7 }, (_, i) => {
    const th = -0.62 + (i / 6) * 1.24;
    return { th, jx: (R() - 0.5) * 0.04, jy: (R() - 0.5) * 0.04 };
  });

  sceneLoop(canvas, now => {
    const { w, h } = size;
    if (!w) return;
    const t = reduced() ? 9 : now - t0;
    ctx.clearRect(0, 0, w, h);

    const mono = px => `600 ${px}px ui-monospace, monospace`;
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
    ctx.font = mono(9.5);
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
    ctx.lineWidth = 2.8;
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
    /* four rows in the reserved band: nothing floats, nothing collides */
    ctx.font = mono(10);
    const rows = [
      ['dash', withAlpha(T.text3, 0.7), 'GOVERNING PHYSICS'],
      ['line', withAlpha(T.text3, 0.55), 'UNCONSTRAINED FITS'],
      ['line', T.accent, 'PHYSICS-GUIDED'],
      ['mark', obsInk, 'OBSERVED'],
    ];
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
      } else {
        ctx.beginPath();
        ctx.moveTo(x, y - 1); ctx.lineTo(x + 18, y - 1);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = r[1];
      ctx.fillText(r[2], x + 24, y + 2.5);
    });
  }, { fps: coarse() ? 24 : 30 });
}
