const visual = document.querySelector('.contact__visual');
const animation = visual?.querySelector('.contact__welcome-animation');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (visual && animation && !reducedMotion && 'IntersectionObserver' in window) {
  visual.classList.add('animation-ready');
  let mediaPromise;
  let activeUrl;
  let inView = false;
  let generation = 0;

  function stop() {
    inView = false;
    generation += 1;
    visual.classList.remove('is-playing');
    animation.onload = null;
    animation.onerror = null;
    animation.removeAttribute('src');
    if (activeUrl) URL.revokeObjectURL(activeUrl);
    activeUrl = null;
  }

  const observer = new IntersectionObserver(async entries => {
    if (!entries[0].isIntersecting) {
      stop();
      return;
    }
    if (inView) return;
    inView = true;
    visual.classList.add('animation-ready');
    const thisGeneration = ++generation;
    try {
      mediaPromise ||= fetch(animation.dataset.src).then(response => {
        if (!response.ok) throw new Error(`Animation HTTP ${response.status}`);
        return response.blob();
      });
      const media = await mediaPromise;
      if (!inView || thisGeneration !== generation) return;
      activeUrl = URL.createObjectURL(media);
      animation.onload = () => visual.classList.add('is-playing');
      animation.onerror = () => {
        visual.classList.remove('is-playing');
        visual.classList.remove('animation-ready');
      };
      animation.src = activeUrl;
    } catch {
      mediaPromise = null;
      visual.classList.remove('animation-ready');
    }
  }, { threshold: 0.25 });

  observer.observe(visual);
  window.addEventListener('pagehide', stop);
}
