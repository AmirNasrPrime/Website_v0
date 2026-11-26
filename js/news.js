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
filters.forEach(button => {
  button.addEventListener('click', () => {
    const category = button.dataset.newsFilter;
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    document.querySelectorAll('[data-news-category]').forEach(entry => {
      entry.hidden = category !== 'all' && entry.dataset.newsCategory !== category;
    });
    const empty = document.querySelector('[data-news-empty]');
    if (empty) empty.hidden = category !== 'news';
    document.querySelector('[data-news-status]').textContent = category === 'news' ? 'No news announcements published yet.' : `${document.querySelectorAll('.news-entry[data-news-category]').length} publications`;
  });
});
