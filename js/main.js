// ============================================
// MASH — Martinez Star Home | main.js
// ============================================

document.addEventListener("DOMContentLoaded", () => {

  /* ───────── NAV SCROLL ───────── */
  const nav = document.getElementById("nav");

  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 40);
  }, { passive: true });



  /* ───────── NAV MOBILE ───────── */
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");

  navToggle.addEventListener("click", () => {

    const isOpen = navLinks.classList.toggle("is-open");

    navToggle.classList.toggle("is-open", isOpen);

    document.body.style.overflow = isOpen ? "hidden" : "";

  });

  navLinks.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => {
      navLinks.classList.remove("is-open");
      navToggle.classList.remove("is-open");
      document.body.style.overflow = "";
    });
  });

  navLinks.addEventListener("click", (e) => {
    if (e.target === navLinks) {
      navLinks.classList.remove("is-open");
      navToggle.classList.remove("is-open");
      document.body.style.overflow = "";
    }
  });



  /* ───────── CAROUSEL BUTTONS ───────── */

  const buttons = document.querySelectorAll(".car-btn");

  buttons.forEach(button => {

    const trackId = button.dataset.track;
    const track = document.getElementById(trackId);

    if (!track) return;

    button.addEventListener("click", () => {

      const slide = track.querySelector(".slide");

      if (!slide) return;

      const slideWidth = slide.offsetWidth + 20;

      const direction = button.classList.contains("next") ? -1 : 1;

      const currentTransform = getComputedStyle(track).transform;

      const matrix = new DOMMatrix(currentTransform);

      let newX = matrix.m41 + (direction * slideWidth);

      const limit = track.scrollWidth / 2;

      if (newX < -limit) newX = 0;

      if (newX > 0) newX = -limit + slideWidth;

      track.style.animationPlayState = "paused";

      track.style.transform = `translateX(${newX}px)`;

      clearTimeout(track._resume);

      track._resume = setTimeout(() => {

        track.style.transform = "";

        track.style.animationPlayState = "running";

      }, 3500);

    });

  });



  /* ───────── SCROLL REVEAL ───────── */

  const revealElements = document.querySelectorAll(
    ".section-intro, .material-card, .care-card, .yascari-content, .yascari-portrait, .materials-quote"
  );

  revealElements.forEach(el => el.classList.add("reveal"));

  const observer = new IntersectionObserver(entries => {

    entries.forEach(entry => {

      if (entry.isIntersecting) {

        entry.target.classList.add("visible");

      }

    });

  }, { threshold: 0.12 });

  document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

});