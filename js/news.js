import { initNav } from './sections/nav.js';
initNav();
// Fit the complete interactive document inside its full-width media canvas.
const viewerHeights = new WeakMap();
function fitViewer(frame) {
  const canvas = frame.parentElement;
  const height = viewerHeights.get(frame) || 1600;
  if (!canvas.clientWidth) return;
  const mobile = canvas.clientWidth - 2 <= 600;
  canvas.classList.toggle('news-html-canvas--mobile', mobile);
  if (mobile) {
    frame.style.width = '100%';
    frame.style.height = `${height}px`;
    frame.style.transform = '';
    frame.style.left = '';
    frame.style.top = '';
    return;
  }
  frame.style.width = '100%';
  frame.style.height = '100%';
  frame.style.transform = '';
  frame.style.left = '0';
  frame.style.top = '0';
}
const mediaObserver = new ResizeObserver(entries => {
  entries.forEach(entry => fitViewer(entry.target.querySelector('iframe')));
});
document.querySelectorAll('.news-html-canvas').forEach(canvas => mediaObserver.observe(canvas));
window.addEventListener('message', event => {
  if (event.data?.type !== 'prime-dispersion-height') return;
  const height = event.data.height;
  if (!Number.isFinite(height) || height < 100 || height > 20000) return;
  const frame = Array.from(document.querySelectorAll('.news-dispersion iframe'))
    .find(candidate => candidate.contentWindow === event.source);
  if (!frame) return;
  viewerHeights.set(frame, Math.ceil(height) + 2);
  fitViewer(frame);
});

const filters = [...document.querySelectorAll('[data-news-filter]')];
const groups = [...document.querySelectorAll('.news-category[data-news-category]')];
const status = document.querySelector('[data-news-status]');

function showCategory(category, scroll = false) {
  filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.newsFilter === category)));
  groups.forEach(group => { group.hidden = category !== 'all' && group.dataset.newsCategory !== category; });
  status.textContent = category === 'news' ? '2 news updates' : category === 'publication' ? '4 publications' : '6 updates';
  if (scroll) {
    const target = category === 'news' ? document.querySelector('#news-updates') : document.querySelector('#publications');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

filters.forEach(button => button.addEventListener('click', () => showCategory(button.dataset.newsFilter, true)));
showCategory(location.hash === '#news-updates' ? 'news' : 'publication');
if (location.hash === '#news-updates') requestAnimationFrame(() => document.querySelector('#news-updates')?.scrollIntoView({ block: 'start' }));
window.addEventListener('hashchange', () => {
  if (location.hash === '#news-updates') showCategory('news', true);
});
