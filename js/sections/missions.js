export function initMissions() {
  const section = document.querySelector('#products.mission-section');
  if (!section) return;

  const slides = [...section.querySelectorAll('[data-mission-slide]')];
  const progress = [...section.querySelectorAll('.mission-progress i')];
  const images = [...section.querySelectorAll('.mission-slide__art img')];
  const desktop = matchMedia('(min-width:1000px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let motionTimer = 0;

  if ('IntersectionObserver' in window) {
    const preload = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      images.forEach(image => { image.loading = 'eager'; });
      preload.disconnect();
    }, { rootMargin: '1200px' });
    preload.observe(section);
  }

  function update() {
    frame = 0;
    const animated = desktop.matches && !reduced.matches;
    document.documentElement.classList.toggle('mission-story-ready', animated);
    if (!animated) {
      document.documentElement.classList.remove('mission-story-animate');
      clearTimeout(motionTimer);
      motionTimer = 0;
      return;
    }

    const nav = document.querySelector('.nav');
    const navHeight = nav ? nav.getBoundingClientRect().height : 0;
    const travel = Math.max(1, section.offsetHeight - window.innerHeight);
    const position = Math.max(0, Math.min(.9999,
      (navHeight - section.getBoundingClientRect().top) / travel));
    const active = Math.min(slides.length - 1, Math.floor(position * slides.length));
    slides.forEach((slide, index) => slide.classList.toggle('is-active', index === active));
    progress.forEach((bar, index) => bar.classList.toggle('is-active', index === active));
    if (!document.documentElement.classList.contains('mission-story-animate') && !motionTimer) {
      motionTimer = window.setTimeout(() => {
        document.documentElement.classList.add('mission-story-animate');
        motionTimer = 0;
      }, 80);
    }
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  desktop.addEventListener('change', schedule);
  reduced.addEventListener('change', schedule);
  update();
}
