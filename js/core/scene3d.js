/* ============================================================================
   PRIME-CAE · a small 3D toolkit for canvas figures
   No WebGL and no library: a perspective camera, one fixed key light, and a
   drag-to-orbit controller. Figures project their own geometry through the
   camera, sort it back to front and fill it on a 2D canvas, which is plenty for
   the handful of surfaces and curves they draw — and keeps the page light, with
   no extra downloads and nothing to fail if a GPU context is unavailable.
   ========================================================================== */
import { clamp, reduced, tickNow } from './dom.js';

/* View space: +x right, +y up, +z AWAY from the viewer. A surface facing the
   camera therefore has a normal with z < 0. */
const LIGHT = (() => {
  const v = [-0.38, 0.62, -0.69], n = Math.hypot(...v);
  return v.map(c => c / n);
})();

/** Diffuse term for a view-space normal, two-sided (a back face lights like a front one). */
export function lambert(n) {
  const s = n[2] > 0 ? -1 : 1;                 /* flip a back face to face the camera */
  return Math.max(0, s * (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]));
}

/** 0 for a face seen head-on, 1 for one seen edge-on: the rim of a glass surface. */
export const rim = n => 1 - Math.min(1, Math.abs(n[2]) / (Math.hypot(n[0], n[1], n[2]) || 1));

/**
 * A perspective camera orbiting the origin.
 *   yaw   turns the scene about the vertical axis, pitch tips it toward the viewer
 *   dist  distance from the origin — smaller is stronger perspective
 *   zoom  how much of the shorter canvas side a unit-radius object fills
 * project() returns [screenX, screenY, depth, scale]; depth is larger when farther,
 * and scale/k0 is how much bigger than "at the origin" the point is drawn.
 */
export function makeCamera({ w, h, yaw, pitch, dist = 6, zoom = 1, cx = w / 2, cy = h / 2 }) {
  const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const k0 = Math.min(w, h) * zoom * 0.5;
  const f = k0 * dist;
  const view = (x, y, z) => {
    const x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw;
    return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
  };
  return {
    k0,
    dist,
    view,
    project(x, y, z) {
      const v = view(x, y, z), d = dist + v[2], k = f / d;
      return [cx + v[0] * k, cy - v[1] * k, d, k];
    },
  };
}

/** Linear colour mix on [r,g,b] triples. */
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

/**
 * Drag-to-orbit with a slow idle swing (or a steady spin). A reader's drag offsets the view and,
 * once they let go, it drifts back to the swing so the figure never sits at an
 * awkward angle. Vertical scrolling on touch screens is left alone.
 */
export function orbit(canvas, { yaw = 0.6, pitch = 0.4, swing = 0.4, rate = 0.22, spin = 0,
                                minPitch = 0.08, maxPitch = 1.25, hold = 2.2, onChange } = {}) {
  let uy = 0, up = 0, dragging = false, released = 0, last = -1, lx = 0, ly = 0, turn = 0;
  canvas.style.touchAction = 'pan-y';

  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true; lx = e.clientX; ly = e.clientY;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
    canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    uy += (e.clientX - lx) * 0.0085;
    up = clamp(up + (e.clientY - ly) * 0.0060, minPitch - pitch, maxPitch - pitch);
    lx = e.clientX; ly = e.clientY;
    onChange && onChange();
  });
  const end = () => {
    if (!dragging) return;
    dragging = false; released = tickNow();
    canvas.classList.remove('is-dragging');
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  return {
    /** the pose at time `now` (seconds) */
    pose(now) {
      const dt = last < 0 ? 0 : clamp(now - last, 0, 0.1);
      last = now;
      if (!dragging && released && now - released > hold) {
        const k = Math.exp(-dt * 1.3);
        uy *= k; up *= k;
      }
      /* spin: a steady turn (rad/s) that holds still while the reader has hold of it;
         otherwise a slow swing back and forth */
      if (spin && !dragging && !reduced()) turn += dt * spin;
      const auto = reduced() ? 0 : (spin ? turn : Math.sin(now * rate) * swing);
      return { yaw: yaw + auto + uy, pitch: clamp(pitch + up, minPitch, maxPitch) };
    },
  };
}
