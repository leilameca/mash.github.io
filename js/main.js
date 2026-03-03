// ============================================
// MASH — Martinez Star Home | main.js
// ============================================

document.addEventListener('DOMContentLoaded', () => {

  /* ─── NAV: scroll state ─── */
  const nav = document.getElementById('nav');
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ─── NAV: mobile toggle ─── */
  const navToggle = document.getElementById('navToggle');
  const navLinks  = document.getElementById('navLinks');

  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  // Close on link click
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  /* ─── CAROUSEL: pause/resume + manual prev/next ─── */
  document.querySelectorAll('.car-btn').forEach(btn => {
    const trackId = btn.dataset.track;
    const track   = document.getElementById(trackId);
    if (!track) return;

    btn.addEventListener('click', () => {
      const slideW  = track.querySelector('.slide')?.offsetWidth || 0;
      const gap     = 20;
      const step    = slideW + gap;
      const dir     = btn.classList.contains('prev') ? -1 : 1;

      // Temporarily pause animation
      track.style.animationPlayState = 'paused';

      // Shift current offset
      const current = getComputedStyle(track).transform;
      const mat     = new DOMMatrix(current);
      let   newX    = mat.m41 + dir * -step;

      // Clamp: reset to 0 when reaching half (duplicated slides start)
      const half = track.scrollWidth / 2;
      if (newX < -half) newX = 0;
      if (newX > 0)     newX = -half + step;

      track.style.transform = `translateX(${newX}px)`;

      // Resume auto-scroll after a short delay
      clearTimeout(track._resumeTimer);
      track._resumeTimer = setTimeout(() => {
        track.style.transform = '';
        track.style.animationPlayState = 'running';
      }, 3500);
    });
  });

  /* ─── SCROLL REVEAL ─── */
  const reveals = document.querySelectorAll(
    '.section-intro, .material-card, .care-card, .yascari-content, .yascari-portrait, .materials-quote'
  );

  reveals.forEach(el => el.classList.add('reveal'));

  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 80);
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  reveals.forEach(el => revealObs.observe(el));

});