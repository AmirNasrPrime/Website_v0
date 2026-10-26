/* ============================================================================
   PRIME-CAE · motion primitives
   ========================================================================== */
import { $$, clamp, lerp, reduced, coarse } from './dom.js';

export function initReveal() {
  const items = $$('[data-reveal]');
  if (!items.length) return;
  if (reduced()) { items.forEach(n => n.classList.add('in')); return; }

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      e.target.classList.add('in');
    });
  }, { rootMargin: '-5% 0px -4% 0px', threshold: 0 });   /* threshold 0: tall
       blocks must reveal on first contact, not at a ratio they never reach */

  items.forEach((n, i) => {
    n.style.transitionDelay = `${(i % 3) * 60}ms`;
    io.observe(n);
  });
}

/* softly reactive buttons — a small pull, never a bouncing toy */
export function initMagnetic() {
  if (reduced() || coarse()) return;
  $$('[data-magnetic]').forEach(node => {
    let raf = 0, tx = 0, ty = 0, cx = 0, cy = 0;
    const run = () => {
      cx = lerp(cx, tx, .18); cy = lerp(cy, ty, .18);
      node.style.transform = `translate3d(${cx.toFixed(2)}px,${cy.toFixed(2)}px,0)`;
      if (Math.abs(cx - tx) > .05 || Math.abs(cy - ty) > .05) raf = requestAnimationFrame(run);
      else { raf = 0; if (!tx && !ty) node.style.transform = ''; }
    };
    node.addEventListener('pointermove', e => {
      const r = node.getBoundingClientRect();
      tx = clamp((e.clientX - (r.left + r.width / 2)) * .20, -12, 12);
      ty = clamp((e.clientY - (r.top + r.height / 2)) * .28, -8, 8);
      node.style.setProperty('--mx', `${e.clientX - r.left}px`);
      node.style.setProperty('--my', `${e.clientY - r.top}px`);
      if (!raf) raf = requestAnimationFrame(run);
    });
    node.addEventListener('pointerleave', () => {
      tx = 0; ty = 0;
      if (!raf) raf = requestAnimationFrame(run);
    });
  });
}

/* Cards rest at an angle (a fan, set in CSS as --ry-base) and, under the pointer,
   come square, lift, and turn a few degrees toward it with light sliding across
   the face. Position is eased and the loop sleeps once the card is at rest;
   nothing starts on touch screens or for reduced motion, where the CSS resting
   angle simply stands. */
export function initTilt() {
  if (reduced() || coarse()) return;
  $$('[data-tilt]').forEach(node => {
    const max = parseFloat(node.dataset.tilt) || 6;
    const base = () => parseFloat(getComputedStyle(node).getPropertyValue('--ry-base')) || 0;
    let raf = 0, tx = base(), ty = 0, ly = 0, cx = tx, cy = 0, cl = 0, glare = 0, tg = 0;
    const run = () => {
      cx = lerp(cx, tx, .13); cy = lerp(cy, ty, .13); cl = lerp(cl, ly, .13); glare = lerp(glare, tg, .12);
      node.style.setProperty('--rx', `${cy.toFixed(2)}deg`);
      node.style.setProperty('--ry', `${cx.toFixed(2)}deg`);
      node.style.setProperty('--ty', `${cl.toFixed(2)}px`);
      node.style.setProperty('--glare', glare.toFixed(3));
      const moving = Math.abs(cx - tx) > .03 || Math.abs(cy - ty) > .03 || Math.abs(cl - ly) > .05 || Math.abs(glare - tg) > .01;
      if (moving) raf = requestAnimationFrame(run);
      else {
        raf = 0;
        if (!tg) ['--rx', '--ry', '--ty', '--glare'].forEach(k => node.style.removeProperty(k));
      }
    };
    node.addEventListener('pointermove', e => {
      const r = node.getBoundingClientRect();
      const u = clamp((e.clientX - r.left) / r.width, 0, 1);
      const v = clamp((e.clientY - r.top) / r.height, 0, 1);
      tx = (u - .5) * 2 * max;                 /* left/right edge -> rotateY */
      ty = (.5 - v) * 2 * max;                 /* top/bottom edge -> rotateX */
      ly = -12; tg = 1;
      node.style.setProperty('--gx', `${(u * 100).toFixed(1)}%`);
      node.style.setProperty('--gy', `${(v * 100).toFixed(1)}%`);
      if (!raf) raf = requestAnimationFrame(run);
    });
    node.addEventListener('pointerleave', () => {
      tx = base(); ty = 0; ly = 0; tg = 0;
      if (!raf) raf = requestAnimationFrame(run);
    });
  });
}

/* The film and the headline sit on different planes: as the pointer crosses the
   hero, one slides slightly past the other. Only runs where there is a pointer
   to follow. */
export function initHeroDepth() {
  const hero = $$('#hero')[0];
  if (!hero || reduced() || coarse()) return;
  hero.classList.add('depth-live');
  let raf = 0, tx = 0, ty = 0, cx = 0, cy = 0;
  const run = () => {
    cx = lerp(cx, tx, .07); cy = lerp(cy, ty, .07);
    hero.style.setProperty('--px', cx.toFixed(3));
    hero.style.setProperty('--py', cy.toFixed(3));
    if (Math.abs(cx - tx) > .002 || Math.abs(cy - ty) > .002) raf = requestAnimationFrame(run);
    else raf = 0;
  };
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    tx = clamp(((e.clientX - r.left) / r.width - .5) * 2, -1, 1);
    ty = clamp(((e.clientY - r.top) / r.height - .5) * 2, -1, 1);
    if (!raf) raf = requestAnimationFrame(run);
  });
  hero.addEventListener('pointerleave', () => {
    tx = 0; ty = 0;
    if (!raf) raf = requestAnimationFrame(run);
  });
}

export function paintRange(input) {
  const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
  input.style.setProperty('--pct', `${pct}%`);
}

export function initRanges() {
  $$('input.range').forEach(r => {
    paintRange(r);
    r.addEventListener('input', () => paintRange(r));
  });
}
