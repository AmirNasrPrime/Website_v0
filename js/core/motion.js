/* ============================================================================
   PRIME-CAE · motion primitives
   ========================================================================== */
import { $$ } from './dom.js';

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
