/* ============================================================================
   PRIME-CAE · application entry
   Five moments, five modules. Every one is initialised behind a guard, so one
   failure cannot take the page down with it.
   ========================================================================== */
import { initRanges } from './core/motion.js';
import { initHeroSequence } from './hero/sequence.js';
import { initNav } from './sections/nav.js';
import { initStory } from './sections/story.js';
import { initAbout } from './sections/about.js';
import { initLayer } from './sections/layer.js';
import { initProducts } from './sections/products.js';
import { initAccess } from './sections/access.js';

const failed = [];
function safeInit(name, fn) {
  try { fn(); }
  catch (err) { failed.push(name); console.error(`[prime] ${name} failed to initialise`, err); }
}

function boot() {
  safeInit('hero', initHeroSequence);      /* starts the hero film */
  safeInit('nav', initNav);
  safeInit('story', initStory);
  safeInit('ranges', initRanges);

  safeInit('about', initAbout);
  safeInit('layer', initLayer);
  safeInit('products', initProducts);
  safeInit('contact', initAccess);

  document.documentElement.classList.add('prime-ready');
  if (failed.length) console.warn('[prime] degraded sections:', failed.join(', '));
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', boot)
  : boot();
