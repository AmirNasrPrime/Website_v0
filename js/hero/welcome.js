/* ============================================================================
   PRIME-CAE · welcome ground — coordinate field and technical marks
   Deliberately quiet: it should read as an engineering environment waking up,
   not as a particle effect.
   ========================================================================== */
import { fitCanvas } from '../core/canvas.js';
import { addTicker, rng, reduced, clamp } from '../core/dom.js';

export function mountWelcomeGround(canvas) {
  if (!canvas) return { dispose() {} };
  const { ctx, size } = fitCanvas(canvas, 1.75);
  const R = rng(1907);
  const marks = Array.from({ length: 26 }, () => ({
    x: R(), y: R(), r: R() * Math.PI, s: .4 + R() * .8, d: R(),
  }));
  const motes = Array.from({ length: reduced() ? 0 : 46 }, () => ({
    x: R(), y: R(), v: .004 + R() * .012, a: .1 + R() * .3, s: .6 + R() * 1.1,
  }));

  const t0 = performance.now() / 1000;
  const stop = addTicker(now => {
    const { w, h } = size;
    if (!w) return;
    const t = now - t0;
    const rise = clamp(t / 2.2, 0, 1);
    ctx.clearRect(0, 0, w, h);

    /* coordinate field, drawn from the centre outward */
    const step = Math.max(72, Math.min(w, h) / 9);
    const cx = w / 2, cy = h / 2;
    const reach = Math.hypot(w, h) * .55 * rise;
    ctx.lineWidth = 1.25;
    for (let x = cx % step; x < w; x += step) {
      const d = Math.abs(x - cx);
      if (d > reach) continue;
      ctx.strokeStyle = `rgba(168,206,244,${.055 * (1 - d / reach)})`;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = cy % step; y < h; y += step) {
      const d = Math.abs(y - cy);
      if (d > reach) continue;
      ctx.strokeStyle = `rgba(168,206,244,${.055 * (1 - d / reach)})`;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    /* survey marks */
    ctx.strokeStyle = 'rgba(140,190,240,.42)';
    for (const m of marks) {
      const k = clamp((t - .5 - m.d * 1.6) / .8, 0, 1);
      if (k <= 0) continue;
      const x = m.x * w, y = m.y * h, s = 3.4 * m.s * k;
      ctx.globalAlpha = k * .8;
      ctx.beginPath();
      ctx.moveTo(x - s, y); ctx.lineTo(x + s, y);
      ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /* slow drift, barely there */
    for (const p of motes) {
      p.y -= p.v * .01;
      if (p.y < -.02) p.y = 1.02;
      ctx.fillStyle = `rgba(150,195,245,${p.a * .5 * rise})`;
      ctx.fillRect(p.x * w, p.y * h, p.s, p.s);
    }
  });

  return { dispose: stop };
}
