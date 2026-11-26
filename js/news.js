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

const filters = document.querySelectorAll('[data-news-filter]');
const entries = [...document.querySelectorAll('.news-entry[data-news-category]')];
filters.forEach(button => {
  button.addEventListener('click', () => {
    const category = button.dataset.newsFilter;
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    entries.forEach(entry => {
      entry.hidden = category !== 'all' && entry.dataset.newsCategory !== category;
    });
    document.querySelectorAll('.news-wave-feature[data-news-category]').forEach(feature => {
      feature.hidden = category === 'news';
    });
    const visible = entries.filter(entry => !entry.hidden);
    const empty = document.querySelector('[data-news-empty]');
    if (empty) empty.hidden = visible.length !== 0;
    document.querySelector('[data-news-status]').textContent = `${visible.length} ${category === 'news' ? 'news updates' : category === 'publication' ? 'publications' : 'updates'}`;
    (visible[0] || empty)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
