import { $$, on, smooth } from '../core/dom.js';

export function initStory() {
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const copies = $$('[data-story] .story-copy');
  const visuals = $$('[data-story-visual], [data-story-card]');
  if (!copies.length) return;

  let frame = 0;
  function update() {
    frame = 0;
    if (motion.matches) return;

    const height = window.innerHeight;
    const copyDistance = Math.min(height * .12, 96);
    const visualDistance = Math.min(height * .20, 160);

    // Finish the copy before the lower edge of the viewport starts revealing artwork.
    const copyProgress = copies.map(copy =>
      smooth(0, copyDistance, height * .98 - copy.getBoundingClientRect().top));
    const visualProgress = visuals.map(visual =>
      smooth(0, visualDistance, height * .84 - visual.getBoundingClientRect().top));

    copies.forEach((copy, i) => copy.style.setProperty('--story-opacity', copyProgress[i]));
    visuals.forEach((visual, i) => {
      const opacity = visualProgress[i];
      visual.style.setProperty('--story-opacity', opacity);
      visual.classList.toggle('story-visual-hidden', opacity < .1);
    });
    root.classList.add('story-active');
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  if ('ResizeObserver' in window) {
    const resize = new ResizeObserver(schedule);
    $$('[data-story]').forEach(scene => resize.observe(scene));
  }
  on(window, 'scroll', schedule, { passive: true });
  on(window, 'resize', schedule);
  on(window, 'pageshow', schedule);
  on(motion, 'change', schedule);
  schedule();
}
