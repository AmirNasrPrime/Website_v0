/* ============================================================================
   PRIME-CAE · motion primitives
   ========================================================================== */
import { $$, reduced } from './dom.js';

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
