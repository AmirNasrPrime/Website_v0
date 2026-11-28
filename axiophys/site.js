'use strict';
const toggle = document.querySelector('.menu');
const navigation = document.querySelector('#navigation');
function closeMenu() { navigation.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
toggle.addEventListener('click', () => { const open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(open)); navigation.classList.toggle('open', open); });
navigation.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && navigation.classList.contains('open')) { closeMenu(); toggle.focus(); } });
matchMedia('(min-width:701px)').addEventListener('change', closeMenu);
document.querySelector('#year').textContent = new Date().getFullYear();
const video = document.querySelector('video');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
function updateVideo() { if (motion.matches || document.hidden || navigator.connection?.saveData) video.pause(); else video.play().catch(() => {}); }
new IntersectionObserver(entries => { if (!entries[0].isIntersecting) video.pause(); else updateVideo(); }).observe(video);
document.addEventListener('visibilitychange', updateVideo);
motion.addEventListener('change', updateVideo);
updateVideo();
