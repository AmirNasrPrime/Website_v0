/* ============================================================================
   PRIME-CAE · hero media registry
   The opening is data-driven: append an entry and it joins the sequence.
   The final entry with loop:true is the resting hero environment.
   ========================================================================== */
export const HERO_SEQUENCE = [
  {
    id: 'welcome',
    kind: 'welcome',
    /* cue -> ms from sequence start */
    cues: { 0: 0, 1: 320, 2: 1500, 3: 3200, 4: 4600 },
    handOver: 4600,          /* the film begins under the welcome here */
    duration: 6000,
  },
  {
    id: 'field',
    kind: 'video',
    loop: true,
    crossfade: 1.15,         /* seconds of overlap between loop passes      */
    sources: {
      wide:   'media/hero-field.mp4',
      narrow: 'media/hero-field-mobile.mp4',
    },
    poster: 'media/hero-field-poster.jpg',
    instrument: { view: 'SIMULATION VIEW', state: 'SOLVED' },
  },
];

export function pickSource(entry) {
  const small = window.matchMedia('(max-width: 900px)').matches;
  const save  = navigator.connection && navigator.connection.saveData;
  return (small || save) ? entry.sources.narrow : entry.sources.wide;
}
