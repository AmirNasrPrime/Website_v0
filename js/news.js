import { initNav } from './sections/nav.js';
initNav();
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
