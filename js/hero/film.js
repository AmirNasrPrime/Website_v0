/* ============================================================================
   PRIME-CAE · hero film
   Two video elements share one source and hand over to each other before the
   end of a pass, so the loop crossfades instead of cutting to black.
   ========================================================================== */
import { $, on, reduced } from '../core/dom.js';
import { pickSource } from './media.js';

export function mountHeroFilm({ hero, entry, onReady }) {
  const a = $('#heroVidA'), b = $('#heroVidB');
  const poster = $('.hero__poster', hero);
  if (!a || !b || !entry) {
    return { begin() { hero && hero.setAttribute('data-autoplay', 'blocked'); } };
  }

  /* Data Saver means the visitor has asked not to be sent a film. Honour it:
     the poster is already a frame of the same solution, so the hero still
     reads — it simply does not move. */
  if (navigator.connection && navigator.connection.saveData) {
    hero.setAttribute('data-autoplay', 'poster');
    if (poster) poster.style.opacity = '1';
    return { begin() {} };
  }

  const src = pickSource(entry);
  const fade = entry.crossfade || 1.1;
  let front = a, back = b, started = false, handing = false;

  [a, b].forEach(v => {
    v.muted = true; v.playsInline = true; v.loop = false;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.preload = v === a ? 'auto' : 'metadata';
  });
  a.src = src;
  b.src = src;

  on(a, 'loadeddata', () => { onReady && onReady(); });
  on(a, 'error', fallback);
  on(b, 'error', fallback);

  function fallback() {
    hero.setAttribute('data-autoplay', 'blocked');
    hero.classList.remove('playing');
    if (poster) poster.style.opacity = '1';
  }

  /* ---------------------------------------------------- crossfade handover */
  function watch(v) {
    on(v, 'timeupdate', () => {
      if (v !== front || handing || !isFinite(v.duration)) return;
      if (v.duration - v.currentTime > fade) return;
      handing = true;
      back.currentTime = 0;
      const p = back.play();
      const swap = () => {
        back.classList.add('live');
        front.classList.remove('live');
        const old = front; front = back; back = old;
        setTimeout(() => { try { back.pause(); } catch (e) {} handing = false; }, fade * 1000);
      };
      p && p.then ? p.then(swap).catch(() => { handing = false; v.loop = true; }) : swap();
    });
    /* if a browser gives no duration, fall back to a plain loop */
    on(v, 'ended', () => {
      if (v !== front) return;
      v.currentTime = 0;
      v.play().catch(() => {});
    });
  }
  watch(a); watch(b);

  function begin() {
    if (started) return;
    started = true;
    if (reduced()) {
      /* honour the setting: hold a single solved frame instead of motion */
      a.classList.add('live');
      hero.classList.add('playing');
      a.pause();
      try { a.currentTime = 3.2; } catch (e) {}
      hero.setAttribute('data-autoplay', 'still');
      return;
    }
    const p = a.play();
    const ok = () => {
      a.classList.add('live');
      hero.classList.add('playing');
      hero.setAttribute('data-autoplay', 'playing');
    };
    if (p && p.then) p.then(ok).catch(() => fallback());
    else ok();
  }

  /* manual start when autoplay is refused */
  on($('#heroPlay'), 'click', () => {
    a.play().then(() => {
      a.classList.add('live');
      hero.classList.add('playing');
      hero.setAttribute('data-autoplay', 'playing');
    }).catch(() => {});
  });

  /* never burn frames on a hero nobody is looking at */
  const io = new IntersectionObserver(es => {
    if (!started || reduced()) return;
    if (es[0].isIntersecting) { front.play().catch(() => {}); }
    else { try { front.pause(); back.pause(); } catch (e) {} }
  }, { threshold: .02 });
  io.observe(hero);

  on(document, 'visibilitychange', () => {
    if (!started || reduced()) return;
    if (document.hidden) { try { front.pause(); } catch (e) {} }
    else front.play().catch(() => {});
  });

  /* frame counter in the instrument rail */
  const frameEl = $('#instFrame');
  if (frameEl) {
    setInterval(() => {
      if (!started || document.hidden) return;
      const n = Math.floor((front.currentTime || 0) * 24) % 999 + 1;
      frameEl.textContent = String(n).padStart(3, '0');
    }, 250);
  }

  return { begin };
}
