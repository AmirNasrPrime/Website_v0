export function initMissions() {
  const section = document.querySelector('#products.mission-section');
  if (!section) return;

  const slides = [...section.querySelectorAll('[data-mission-slide]')];
  const progress = [...section.querySelectorAll('.mission-progress i')];
  const images = [...section.querySelectorAll('.mission-slide__art img')];
  const visualTitle = section.querySelector('.mission-visual__title');
  const desktop = matchMedia('(min-width:1000px) and (min-height:600px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let revealObserver;
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => value * value * (3 - 2 * value);

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
    const animated = desktop.matches && !reduced.matches && slides.length > 1;
    document.documentElement.classList.toggle('mission-story-ready', animated);
    if (!animated) {
      visualTitle?.style.removeProperty('opacity');
      const revealStack = !desktop.matches && !reduced.matches && 'IntersectionObserver' in window;
      document.documentElement.classList.toggle('mission-stack-reveal', revealStack);
      if (revealStack && !revealObserver) {
        revealObserver = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-revealed');
            revealObserver.unobserve(entry.target);
          });
        }, { rootMargin: '0px 0px -30% 0px', threshold: .1 });
        slides.forEach(slide => revealObserver.observe(slide));
      } else if (!revealStack && revealObserver) {
        revealObserver.disconnect();
        revealObserver = undefined;
        slides.forEach(slide => slide.classList.remove('is-revealed'));
      }
      slides.forEach(slide => {
        slide.style.removeProperty('opacity');
        slide.style.removeProperty('visibility');
        slide.style.removeProperty('z-index');
        slide.querySelector('.mission-slide__copy')?.style.removeProperty('visibility');
      });
      progress.forEach(bar => bar.style.removeProperty('--mission-fill'));
      return;
    }
    document.documentElement.classList.remove('mission-stack-reveal');
    if (revealObserver) {
      revealObserver.disconnect();
      revealObserver = undefined;
      slides.forEach(slide => slide.classList.remove('is-revealed'));
    }

    const travel = Math.max(1, section.offsetHeight - window.innerHeight);
    const position = clamp(-section.getBoundingClientRect().top / travel);
    // Start with the introduction alone. Once it has had room to read, reveal
    // the first figure, then move through the remaining figures in short steps.
    const timeline = position * (slides.length - .3);
    const firstReveal = smooth(clamp((timeline - .1) / .45));
    if (visualTitle) visualTitle.style.opacity = String(smooth(clamp((timeline - .02) / .28)));
    const phase = Math.max(0, timeline - .55);
    const current = Math.min(slides.length - 1, Math.floor(phase));
    // Scroll position controls the crossfade directly. There is no timed fade
    // to lag behind the wheel, and reversing scroll immediately reverses it.
    const blend = smooth(clamp((phase - current - .25) / .5));
    slides.forEach((slide, index) => {
      const opacity = timeline < .55
        ? (index === 0 ? firstReveal : 0)
        : (index === current ? 1 - blend : index === current + 1 ? blend : 0);
      slide.style.opacity = String(opacity);
      slide.style.visibility = opacity > 0 ? 'visible' : 'hidden';
      slide.style.zIndex = index === current + 1 ? '2' : '1';
      // Keep the illustration blended, but show only one caption at a time.
      // Overlapping lines were illegible halfway through a crossfade.
      const caption = slide.querySelector('.mission-slide__copy');
      if (caption) caption.style.visibility =
        index === current && blend < .5 || index === current + 1 && blend >= .5
          ? 'visible' : 'hidden';
    });
    progress.forEach((bar, index) => {
      bar.style.setProperty('--mission-fill', String(index === 0 ? firstReveal : clamp(phase - index + 1)));
    });
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

  // Fonts and the earlier story sections can settle after the browser's first
  // fragment jump. Re-align a direct product link once the page has loaded.
  if (location.hash === '#products') {
    const alignDeepLink = () => requestAnimationFrame(() => {
      const top = section.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top, behavior: 'instant' });
      schedule();
    });
    document.readyState === 'complete'
      ? alignDeepLink()
      : window.addEventListener('load', alignDeepLink, { once: true });
  }
}
