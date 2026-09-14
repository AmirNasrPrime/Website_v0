/* ============================================================================
   PRIME-CAE · hero start
   The page opens straight onto the simulation environment — no intro overlay.
   The film starts under the headline; film.js holds the poster if autoplay is
   refused, Data Saver is on, or the visitor prefers reduced motion.
   ========================================================================== */
import { $ } from '../core/dom.js';
import { HERO_SEQUENCE } from './media.js';
import { mountHeroFilm } from './film.js';

export function initHeroSequence() {
  const hero = $('#hero');
  if (!hero) return;

  const heroFilm = mountHeroFilm({
    hero,
    entry: HERO_SEQUENCE.find(e => e.kind === 'video'),
  });
  heroFilm.begin();
  document.documentElement.classList.add('hero-live');
}
