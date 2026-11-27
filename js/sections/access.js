/* ============================================================================
   PRIME-CAE · contact
   Header contact controls bring visitors to the form under the header.
   ========================================================================== */
import { $, $$, on, scrollToSection } from '../core/dom.js';

export function initAccess() {
  $$('[data-open-access]').forEach(b => on(b, 'click', e => {
    e.preventDefault();
    scrollToSection($('#access'));
  }));
}
