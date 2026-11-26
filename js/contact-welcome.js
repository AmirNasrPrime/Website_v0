const visual = document.querySelector('.contact__visual');
const animation = visual?.querySelector('.contact__welcome-animation');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (visual && animation && !reducedMotion && 'IntersectionObserver' in window) {
  visual.classList.add('animation-ready');
  const observer = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    observer.disconnect();
    animation.addEventListener('load', () => visual.classList.add('is-playing'), { once: true });
    animation.addEventListener('error', () => visual.classList.remove('animation-ready'), { once: true });
    animation.src = animation.dataset.src;
  }, { threshold: 0.25 });
  observer.observe(visual);
}
