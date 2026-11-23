import { $$, clamp, on, smooth } from '../core/dom.js';

export function initStory() {
  const root = document.documentElement;
  const header = document.querySelector('#nav');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const stacked = matchMedia('(max-width: 999px)');
  const singleColumnCards = matchMedia('(max-width: 719px), (max-width: 960px) and (max-height: 520px)');
  const canPin = CSS.supports('overflow', 'clip');
  const chapters = $$('[data-story]').map(scene => {
    const track = document.createElement('div');
    track.className = 'story-track';
    scene.before(track);
    track.append(scene);
    const copy = scene.querySelector('.story-copy');
    const intro = document.createElement('div');
    intro.className = 'story-intro';
    copy.before(intro);
    intro.append(copy);
    return {
      scene, track, copy, intro,
      detail: copy.querySelector('[data-story-copy="detail"]'),
      visual: scene.querySelector('[data-story-visual]'),
      notes: $$('[data-story-note]', scene),
      cards: $$('[data-story-card]', scene),
    };
  });
  if (!chapters.length) return;

  let frame = 0;
  let needsMeasure = true;

  function update() {
    frame = 0;
    const height = window.innerHeight;
    const introInset = (header?.offsetHeight ?? 0) + 14;
    const inFlow = stacked.matches;
    const still = motion.matches;
    const revealCards = singleColumnCards.matches && !still;

    // Measure every scene before writing reveal state or changing track height.
    const measurements = chapters.map(({ scene, track, copy, intro, detail, visual, notes, cards }) => {
      const sceneHeight = scene.offsetHeight;
      const copyHeight = copy.offsetHeight;
      return {
        scene, track, sceneHeight, visual, notes, cards, intro, copyHeight,
        top: track.getBoundingClientRect().top,
        travel: track.offsetHeight - sceneHeight,
        copyTop: copy.getBoundingClientRect().top,
        detailTop: inFlow ? detail.getBoundingClientRect().top : 0,
        introTop: inFlow ? intro.getBoundingClientRect().top : 0,
        introTravel: inFlow ? intro.offsetHeight - copyHeight : 0,
        visualTop: inFlow && visual ? visual.getBoundingClientRect().top : null,
        noteTops: notes.map(note => note.getBoundingClientRect().top),
        cardTops: revealCards ? cards.map(card => card.getBoundingClientRect().top) : [],
        fits: canPin && !inFlow && height >= sceneHeight - 2,
        fitsIntro: canPin && inFlow && scene.dataset.story !== 'flow'
          && copyHeight + introInset + 14 <= height,
      };
    });
    if (needsMeasure) {
      needsMeasure = false;
      root.style.setProperty('--story-intro-inset', introInset + 'px');
      for (const { sceneHeight, track, fits, intro, copyHeight, fitsIntro } of measurements) {
        track.style.setProperty('--story-height', sceneHeight + 'px');
        track.classList.toggle('story-track--pinned', fits && !still);
        intro.style.setProperty('--story-copy-height', copyHeight + 'px');
        intro.classList.toggle('story-intro--pinned', fitsIntro && !still);
      }
      schedule();
      return;
    }
    for (const { scene, top, travel, copyTop, detailTop, introTop, introTravel,
      visual, visualTop, notes, noteTops, cards, cardTops } of measurements) {
      const pinned = travel > 0;
      const entered = pinned
        ? clamp(-top / travel, 0, 1)
        : clamp((height * .95 - copyTop) / (height * .36), 0, 1);
      let lead = still ? 1 : smooth(.08, .46, entered);
      let detail = still ? 1 : smooth(.26, pinned ? 1 : .67, entered);
      if (inFlow && !still) {
        lead = smooth(height * .04, height * .28, height - copyTop);
        // Hold the copy while its paragraph comes in, then release into the plots.
        detail = introTravel > 0
          ? smooth(.04, 1, (introInset - introTop) / introTravel)
          : smooth(height * .1, height * .42, height - detailTop);
      }
      scene.style.setProperty('--story-lead', String(lead));
      scene.style.setProperty('--story-detail', String(detail));
      if (visual) {
        const opacity = still || visualTop === null ? 1 : smooth(0, height * .24, height * .92 - visualTop);
        visual.style.setProperty('--story-item', String(opacity));
        visual.classList.toggle('story-visual-hidden', opacity < .1);
      }
      notes.forEach((note, index) => {
        const opacity = still || pinned ? detail : smooth(0, height * .22, height * .97 - noteTops[index]);
        note.style.setProperty('--story-item', String(opacity));
      });
      if (revealCards) {
        const fadeDistance = Math.min(height * .22, 160);
        cards.forEach((card, index) => {
          const opacity = smooth(0, fadeDistance, height * .94 - cardTops[index]);
          card.style.setProperty('--story-item', String(opacity));
        });
      }
    }
    root.classList.add('story-active');
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  function measure() {
    needsMeasure = true;
    schedule();
  }

  if ('ResizeObserver' in window) {
    const resize = new ResizeObserver(measure);
    chapters.forEach(({ scene }) => resize.observe(scene));
  }
  on(window, 'resize', measure);
  on(window, 'scroll', schedule, { passive: true });
  on(window, 'pageshow', measure);
  on(motion, 'change', measure);
  measure();
}
