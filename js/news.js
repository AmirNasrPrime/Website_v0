import { initNav } from './sections/nav.js';
initNav();
// Size each embedded dispersion viewer to its full document height.
window.addEventListener('message', event => {
  if (event.data?.type !== 'prime-dispersion-height') return;
  const height = event.data.height;
  if (!Number.isFinite(height) || height < 100 || height > 20000) return;
  const frame = Array.from(document.querySelectorAll('.news-dispersion iframe'))
    .find(candidate => candidate.contentWindow === event.source);
  if (frame) frame.style.height = `${Math.ceil(height) + 2}px`;
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
