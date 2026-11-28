import { initNav } from './sections/nav.js';
initNav();
if (location.pathname.endsWith('/news.html') && ['#publications','#guided-waves','#cube-video-title'].includes(location.hash)) {
  location.replace('research.html' + (location.hash === '#publications' ? '#demo' : location.hash));
}
