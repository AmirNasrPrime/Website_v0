/* ============================================================================
   PRIME-CAE · navigation, scroll progress, anchor handling
   ========================================================================== */
import { $, $$, on, clamp, scrollToSection } from '../core/dom.js';

export function initNav() {
  const nav = $('#nav'), bar = $('#progressBar'), ind = $('#navInd');
  const links = $$('#navLinks .nav__a');
  const burger = $('#burger'), menu = $('#menu');

  const y = $('#year'); if (y) y.textContent = String(new Date().getFullYear());

  /* ------------------------------------------------------------- menu --- */
  if (burger && menu) {
    const set = open => {
      menu.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      /* the page must not scroll behind an open sheet, and must not lose its
         place when the sheet closes */
      document.body.style.overflow = open ? 'hidden' : '';
      document.documentElement.classList.toggle('menu-open', open);
      if (open) menu.scrollTop = 0;
    };
    on(burger, 'click', () => set(!menu.classList.contains('open')));
    /* close first, then let the anchor handler scroll — the lock has to be off
       before the scroll starts or the destination is computed against a frozen
       document */
    on(menu, 'click', e => { if (e.target.closest('a')) set(false); });
    on(window, 'keydown', e => { if (e.key === 'Escape') set(false); });
    on(window, 'resize', () => { if (window.innerWidth >= 1080) set(false); });
  }

  /* -------------------------------------------------------- indicator --- */
  const move = a => {
    if (!ind || !a) return;
    const p = a.parentElement.getBoundingClientRect(), r = a.getBoundingClientRect();
    ind.style.width = `${r.width - 26}px`;
    ind.style.transform = `translateX(${r.left - p.left + 13}px)`;
    ind.style.opacity = '1';
  };
  links.forEach(a => on(a, 'pointerenter', () => move(a)));
  on($('#navLinks'), 'pointerleave', () => {
    const active = links.find(a => a.classList.contains('active'));
    active ? move(active) : (ind && (ind.style.opacity = '0'));
  });

  /* ------------------------------------------------------------ scroll --- */
  const targets = links
    .map(a => ({ a, el: document.querySelector(a.getAttribute('href')) }))
    .filter(t => t.el);

  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const sy = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.width = `${clamp(sy / Math.max(max, 1), 0, 1) * 100}%`;
      /* The header carries one controlled dark surface so the light lockup is
         always valid. It is raised as soon as anything but the hero is under
         it — a scroll threshold alone left it transparent over a light
         environment, with pale text on ice. */
      if (nav) {
        const probe = document.elementFromPoint(window.innerWidth / 2, nav.offsetHeight + 6);
        const host = probe && probe.closest ? probe.closest('[data-env]') : null;
        const under = host ? host.dataset.env : 'navy';
        nav.dataset.under = under;
        nav.classList.toggle('stuck', sy > 60 || under !== 'navy');
      }

      let current = null;
      for (const t of targets) {
        if (t.el.getBoundingClientRect().top <= window.innerHeight * .4) current = t;
      }
      links.forEach(a => a.classList.remove('active'));
      if (current) {
        current.a.classList.add('active');
        const hovering = $('#navLinks') && $('#navLinks').matches(':hover');
        if (!hovering) move(current.a);
      } else if (ind) ind.style.opacity = '0';
    });
  };
  on(window, 'scroll', onScroll, { passive: true });
  on(window, 'resize', onScroll);
  /* rAF is paused in a background tab, so a scroll that happened while hidden
     would otherwise leave the header in a stale state when the tab returns */
  on(document, 'visibilitychange', () => { if (!document.hidden) onScroll(); });
  onScroll();

  /* ------------------------------------------- offset anchor scrolling --- */
  on(document, 'click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-open-access')) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const t = document.querySelector(id);
    if (!t) return;
    e.preventDefault();
    scrollToSection(t);
    history.replaceState(null, '', id);
  });
}
