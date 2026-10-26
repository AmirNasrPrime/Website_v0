/* ============================================================================
   PRIME-CAE · hero ground
   A rolling wireframe field receding to a horizon under the film — the
   coordinate field a solution lives on, seen in perspective. It sits inside the
   hero's media layer, beneath the grade, so the dark left side of the hero
   swallows it and only the open right-hand side shows it. Stops drawing when
   the hero is off screen; draws one still frame for reduced motion.
   ========================================================================== */
import { clamp, lerp, reduced, coarse } from '../core/dom.js';
import { fitCanvas, sceneLoop } from '../core/canvas.js';

export function mountHeroGround(canvas, hero) {
  if (!canvas) return null;
  const { ctx, size } = fitCanvas(canvas, 1.5);
  let px = 0, tx = 0;

  if (hero && !reduced() && !coarse()) {
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      tx = clamp(((e.clientX - r.left) / r.width - .5) * 2, -1, 1);
    });
    hero.addEventListener('pointerleave', () => { tx = 0; });
  }

  const ZN = 0.8, ZF = 26, STEP_X = 0.85, ROWS = 30, LINE = [96, 176, 255];
  const height = (x, z, t) =>
    -1.18
    + 0.30 * Math.sin(x * 0.55 + z * 0.30 - t * 0.55) * Math.min(1, z / 6)
    + 0.20 * Math.sin(z * 0.62 + x * 0.16 + t * 0.75) * Math.min(1, z / 5)
    + 0.10 * Math.sin(x * 1.1 - t * 0.9);

  return sceneLoop(canvas, now => {
    const { w, h } = size;
    if (!w) return;
    const t = reduced() ? 4 : now;
    px = lerp(px, tx, 0.06);
    ctx.clearRect(0, 0, w, h);

    const F = w * 0.6, Z0 = 1.2;
    const cx = w * 0.5 - px * 22, cy = h * 0.2;
    const proj = (x, y, z) => { const k = F / (z + Z0); return [cx + x * k, cy - y * k, k]; };
    const halfCols = Math.ceil(26 / STEP_X);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    /* rows: lines of constant depth, drawn near to far */
    for (let j = 0; j <= ROWS; j++) {
      const z = ZN + Math.pow(j / ROWS, 1.7) * (ZF - ZN);
      const a = clamp(1.05 - z / ZF, 0.04, 1) * 0.5;
      ctx.strokeStyle = `rgba(${LINE[0]},${LINE[1]},${LINE[2]},${a})`;
      ctx.lineWidth = z < 6 ? 1.15 : 0.8;
      ctx.beginPath();
      for (let i = -halfCols; i <= halfCols; i++) {
        const x = i * STEP_X, q = proj(x, height(x, z, t), z);
        i === -halfCols ? ctx.moveTo(q[0], q[1]) : ctx.lineTo(q[0], q[1]);
      }
      ctx.stroke();
    }
    /* columns: lines running away from the viewer */
    for (let i = -halfCols; i <= halfCols; i++) {
      const x = i * STEP_X;
      ctx.strokeStyle = `rgba(${LINE[0]},${LINE[1]},${LINE[2]},${i % 4 === 0 ? 0.30 : 0.16})`;
      ctx.lineWidth = i % 4 === 0 ? 1.1 : 0.75;
      ctx.beginPath();
      for (let j = 0; j <= ROWS; j++) {
        const z = ZN + Math.pow(j / ROWS, 1.7) * (ZF - ZN), q = proj(x, height(x, z, t), z);
        j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, { fps: coarse() ? 20 : 30 });
}
