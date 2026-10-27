/* ============================================================================
   PRIME-CAE · hero start
   The page opens straight onto the simulation environment — no intro overlay.
   The film starts under the headline; film.js holds the poster if autoplay is
   refused, Data Saver is on, or the visitor prefers reduced motion.
   ========================================================================== */
import { $ } from '../core/dom.js';
import { HERO_SEQUENCE } from './media.js';
import { mountHeroFilm } from './film.js';
import { mountHeroGround } from './ground.js';

export function initHeroSequence() {
  const hero = $('#hero');
  if (!hero) return;

  const heroFilm = mountHeroFilm({
    hero,
    entry: HERO_SEQUENCE.find(e => e.kind === 'video'),
  });
  heroFilm.begin();
  /* the 3D floor is for screens with room for it; phones keep the plain film */
  if (window.matchMedia('(min-width: 720px)').matches) mountHeroGround($('#heroGround'), hero);
  else $('#heroGround') && $('#heroGround').remove();
}
