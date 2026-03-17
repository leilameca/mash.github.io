document.addEventListener("DOMContentLoaded", () => {
  const nav = document.getElementById("nav");
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");

  const syncNavState = () => {
    nav.classList.toggle("scrolled", window.scrollY > 24);
  };

  const closeMenu = () => {
    navLinks.classList.remove("is-open");
    navToggle.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };

  const openMenu = () => {
    navLinks.classList.add("is-open");
    navToggle.classList.add("is-open");
    navToggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  };

  syncNavState();
  window.addEventListener("scroll", syncNavState, { passive: true });

  navToggle?.addEventListener("click", () => {
    const isOpen = navLinks.classList.contains("is-open");
    if (isOpen) {
      closeMenu();
      return;
    }
    openMenu();
  });

  navLinks?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 820) {
      closeMenu();
    }
  });

  document.querySelectorAll(".gallery-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const track = document.getElementById(button.dataset.track);
      if (!track) return;

      const firstCard = track.querySelector(".product-card");
      const gap = 18;
      const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : track.clientWidth * 0.8;
      const direction = button.classList.contains("next") ? 1 : -1;
      const amount = direction * (cardWidth + gap);

      track.scrollBy({
        left: amount,
        behavior: "smooth"
      });
    });
  });

  const revealElements = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        currentObserver.unobserve(entry.target);
      });
    }, {
      threshold: 0.16
    });

    revealElements.forEach((element) => observer.observe(element));
  } else {
    revealElements.forEach((element) => element.classList.add("visible"));
  }
});
