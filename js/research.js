import { initNav } from './sections/nav.js';
initNav();

const header = document.querySelector('#nav');
const film = document.querySelector('#gazette-film');
const toggle = document.querySelector('[data-gazette-toggle]');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const tabs = [...document.querySelectorAll('[data-gazette-tab]')];
const panels = [...document.querySelectorAll('[data-gazette-panel]')];
const categories = new Set(['demo', 'papers', 'manuals']);
let inView = true;
let userPaused = false;

function measureHeader() {
  document.documentElement.style.setProperty('--gazette-nav-h', `${Math.ceil(header.getBoundingClientRect().height)}px`);
}
measureHeader();
new ResizeObserver(measureHeader).observe(header);

function selectCategory() {
  const category = location.hash.slice(1);
  const selected = categories.has(category) ? category : 'demo';
  tabs.forEach(tab => tab.setAttribute('aria-current', String(tab.dataset.gazetteTab === selected)));
  panels.forEach(panel => { panel.hidden = panel.dataset.gazettePanel !== selected; });
  if (categories.has(category)) requestAnimationFrame(() => document.getElementById(selected)?.scrollIntoView({ block: 'start' }));
}
tabs.forEach(tab => tab.addEventListener('click', event => {
  event.preventDefault();
  event.stopPropagation();
  history.pushState(null, '', tab.getAttribute('href'));
  selectCategory();
}));
window.addEventListener('hashchange', selectCategory);
selectCategory();

function updatePlaybackLabel() {
  const playing = !film.paused;
  toggle.textContent = playing ? 'Pause animation' : 'Play animation';
  toggle.setAttribute('aria-label', toggle.textContent);
}
async function syncPlayback() {
  if (userPaused || motion.matches || !inView || document.hidden) {
    film.pause();
  } else {
    try { await film.play(); } catch { /* Poster and manual play remain available. */ }
  }
  updatePlaybackLabel();
}
toggle.addEventListener('click', async () => {
  if (film.paused) {
    userPaused = false;
    try { await film.play(); } catch { /* Browser may decline autoplay. */ }
  } else {
    userPaused = true;
    film.pause();
  }
  updatePlaybackLabel();
});
film.addEventListener('play', updatePlaybackLabel);
film.addEventListener('pause', updatePlaybackLabel);
document.addEventListener('visibilitychange', syncPlayback);
motion.addEventListener('change', syncPlayback);
new IntersectionObserver(([entry]) => {
  inView = entry.isIntersecting;
  syncPlayback();
}, { threshold: .05 }).observe(film);
syncPlayback();

// Keep the existing interactive dispersion demonstration sized to its content.
const frame = document.querySelector('.news-dispersion iframe');
if (frame) {
  window.addEventListener('message', event => {
    if (event.data?.type !== 'prime-dispersion-height' || event.source !== frame.contentWindow) return;
    const height = event.data.height;
    if (Number.isFinite(height) && height >= 100 && height < 20000 && innerWidth <= 700) {
      frame.style.height = `${Math.ceil(height) + 2}px`;
    }
  });
}
