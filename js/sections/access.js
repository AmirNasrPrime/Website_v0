/* ============================================================================
   PRIME-CAE · contact
   The section is an address and nothing else — no form, no endpoint, no
   submission, no state. All that remains is the affordance that brings a
   visitor to it: every "Contact PRIME-CAE" control on the page lands on the
   section, under the header, with its content at the top of the frame.
   ========================================================================== */
import { $, $$, on, scrollToSection } from '../core/dom.js';

export function initAccess() {
  $$('[data-open-access]').forEach(b => on(b, 'click', e => {
    e.preventDefault();
    scrollToSection($('#access'));
  }));
}
