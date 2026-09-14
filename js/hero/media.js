/* ============================================================================
   PRIME-CAE · hero media registry
   The hero environment is data-driven: the video entry below is what plays
   behind the headline.
   ========================================================================== */
export const HERO_SEQUENCE = [
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
