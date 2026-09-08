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
