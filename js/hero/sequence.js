/* ============================================================================
   PRIME-CAE · hero state machine
   Explicit phases, one timer table, one exit path. Every route out of the
   opening — natural end, skip, reduced motion, blocked autoplay, a missing
   asset, or the user simply scrolling — lands in the same terminal state.

        welcome ──▶ transition ──▶ simulation view ──▶ content
            └──────────── skip / fallback ───────────┘
   ========================================================================== */
import { $, $$, on, reduced } from '../core/dom.js';
import { HERO_SEQUENCE, pickSource } from './media.js';
import { mountWelcomeGround } from './welcome.js';
import { mountHeroFilm } from './film.js';

export function initHeroSequence() {
  const welcome = $('#welcome');
  const hero    = $('#hero');
  if (!hero) return;

  const state = {
    phase: 'welcome',
    skipped: false,
    reducedMotion: reduced(),
    videoReady: false,
    entry: HERO_SEQUENCE[0],
  };

  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.add(id); return id; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };

  /* ---------------------------------------------------------- scroll lock */
  let locked = false;
  const lock = () => {
    if (locked || !welcome) return;
    locked = true;
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);
  };
  const unlock = () => {                       /* idempotent by construction */
    if (!locked) return;
    locked = false;
    document.body.style.overflow = '';
  };

  /* ------------------------------------------------------- hero film ----- */
  const heroFilm = mountHeroFilm({
    hero,
    entry: HERO_SEQUENCE.find(e => e.kind === 'video'),
    onReady: () => { state.videoReady = true; },
  });

  /* ------------------------------------------------------------- terminal */
  function toContent() {
    if (state.phase === 'content') return;
    state.phase = 'content';
    clearTimers();
    ground && ground.dispose();
    if (welcome) {
      welcome.dataset.step = 'done';
      welcome.setAttribute('aria-hidden', 'true');
      /* remove from the tree so nothing can ever intercept a pointer again */
      later(() => { welcome.remove(); }, 1400);
    }
    unlock();
    heroFilm.begin();
    document.documentElement.classList.add('hero-live');
  }

  /* ------------------------------------------------------------ welcome UI */
  let ground = null;

  function runWelcome() {
    const cues = state.entry.cues;
    lock();
    ground = mountWelcomeGround($('#welcomeGrid'));

    const bar  = $('#welcomeBar');
    const sub  = $('#wlSub'), stmt = $('#wlStmt'), words = $('#wlWords');
    const total = state.entry.duration;

    const step = n => { if (welcome) welcome.dataset.step = String(n); };

    step(0);
    later(() => step(1), cues[1]);
    later(() => { step(2); sub && sub.classList.add('show'); }, cues[2]);
    later(() => { step(3); stmt && stmt.classList.add('show'); }, cues[3]);
    later(() => {
      step(4);
      words && words.classList.add('show');
      state.phase = 'transition';
      heroFilm.begin();                          /* fades up behind        */
    }, cues[4]);
    later(toContent, total);

    /* progress readout */
    const t0 = performance.now();
    const tick = () => {
      if (state.phase === 'content') return;
      const p = Math.min((performance.now() - t0) / total, 1);
      if (bar) bar.style.width = `${p * 100}%`;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* --------------------------------------------------------------- skip -- */
  function skip() {
    if (state.phase === 'content') return;
    state.skipped = true;
    clearTimers();
    toContent();
  }
  on($('#welcomeSkip'), 'click', skip);
  on(window, 'keydown', e => {
    if (e.key === 'Escape' && state.phase !== 'content') skip();
  });
  /* a deliberate scroll or wheel is a request to get on with it */
  on(window, 'wheel', () => { if (state.phase !== 'content') skip(); }, { passive: true });
  on(window, 'touchmove', () => { if (state.phase !== 'content') skip(); }, { passive: true });

  /* ------------------------------------------------------------- entry --- */
  if (!welcome || state.reducedMotion) {
    /* reduced motion: no cinema, straight to the physics */
    if (welcome) { welcome.dataset.step = 'done'; welcome.remove(); }
    heroFilm.begin();
    state.phase = 'content';
    document.documentElement.classList.add('hero-live');
  } else {
    runWelcome();
  }

  /* a stuck overlay is worse than a missing one */
  setTimeout(() => { if (state.phase !== 'content') toContent(); }, 12000);

  return { state, skip };
}
