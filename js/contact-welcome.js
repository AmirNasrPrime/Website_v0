const visual = document.querySelector('.contact__visual');
const video = visual?.querySelector('video');
if (visual && video && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let started = false;
  const observer = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting || started) return;
    started = true;
    observer.disconnect();
    video.load();
    video.addEventListener('playing', () => visual.classList.add('is-playing'), { once: true });
    video.addEventListener('ended', () => visual.classList.remove('is-playing'), { once: true });
    video.play().catch(() => visual.classList.remove('is-playing'));
  }, { threshold: 0.25 });
  observer.observe(visual);
}
