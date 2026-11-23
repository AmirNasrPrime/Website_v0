import { $$, clamp, on, smooth } from '../core/dom.js';

export function initStory() {
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const stacked = matchMedia('(max-width: 999px)');
  const chapters = $$('[data-story]').map(scene => {
    const track = document.createElement('div');
    track.className = 'story-track';
    scene.before(track);
    track.append(scene);
    return {
      scene, track,
      copy: scene.querySelector('.story-copy'),
      visual: scene.querySelector('[data-story-visual]'),
      notes: $$('[data-story-note]', scene),
    };
  });
  if (!chapters.length) return;

  let frame = 0;
  let needsMeasure = true;

  function update() {
    frame = 0;
    const height = window.innerHeight;
    const inFlow = stacked.matches;
    const still = motion.matches;

    // Measure every scene before writing reveal state or changing track height.
    const measurements = chapters.map(({ scene, track, copy, visual, notes }) => {
      const sceneHeight = scene.offsetHeight;
      return {
        scene, track, sceneHeight, visual, notes,
        top: track.getBoundingClientRect().top,
        travel: track.offsetHeight - sceneHeight,
        copyTop: copy.getBoundingClientRect().top,
        visualTop: inFlow && visual ? visual.getBoundingClientRect().top : null,
        noteTops: notes.map(note => note.getBoundingClientRect().top),
        fits: !inFlow && height >= sceneHeight - 2,
      };
    });
    if (needsMeasure) {
      needsMeasure = false;
      for (const { sceneHeight, track, fits } of measurements) {
        track.style.setProperty('--story-height', sceneHeight + 'px');
        track.classList.toggle('story-track--pinned', fits && !still);
      }
      schedule();
      return;
    }
    for (const { scene, top, travel, copyTop, visual, visualTop, notes, noteTops } of measurements) {
      const pinned = travel > 0;
      const entered = pinned
        ? clamp(-top / travel, 0, 1)
        : clamp((height * .95 - copyTop) / (height * .36), 0, 1);
      const lead = still ? 1 : smooth(.08, .46, entered);
      const detail = still ? 1 : smooth(.26, pinned ? 1 : .67, entered);
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
