document.addEventListener("DOMContentLoaded", () => {
  const nav = document.getElementById("nav");
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");
  const collectionsRoot = document.getElementById("collections-root");

  const escapeHtml = (value = "") =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const removeNodeAndAdjacentDivider = (node) => {
    if (!node) return;

    const previous = node.previousElementSibling;
    const next = node.nextElementSibling;

    node.remove();

    if (previous?.classList.contains("divider-ornament")) {
      previous.remove();
      return;
    }

    if (next?.classList.contains("divider-ornament")) {
      next.remove();
    }
  };

  const removeLegacyCollections = () => {
    const featuredAnchor = document.getElementById("destacado");
    const featuredSection = featuredAnchor?.nextElementSibling?.classList.contains("section")
      ? featuredAnchor.nextElementSibling
      : null;

    removeNodeAndAdjacentDivider(document.getElementById("momentos"));
    removeNodeAndAdjacentDivider(document.getElementById("cenas"));
    removeNodeAndAdjacentDivider(document.getElementById("oasis"));
    removeNodeAndAdjacentDivider(featuredSection);
    removeNodeAndAdjacentDivider(featuredAnchor);
  };

  const createProductCard = (product, featured) => `
    <article class="product-card${featured ? " product-card-full" : ""}">
      <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.alt || product.name)}" loading="lazy" decoding="async">
      <div class="product-copy">
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description)}</p>
      </div>
    </article>
  `;

  const createCollectionSection = (collection, isLast) => {
    const sectionClasses = ["section"];

    if (collection.style === "alt") {
      sectionClasses.push("section-alt");
    }

    const trackId = `track-${collection.id}`;
    const products = collection.products.map((product) => createProductCard(product, collection.featured)).join("");
    const controls = collection.featured || collection.products.length < 2
      ? ""
      : `
        <div class="gallery-controls">
          <button class="gallery-btn prev" type="button" data-track="${trackId}" aria-label="Anterior">&#8592;</button>
          <button class="gallery-btn next" type="button" data-track="${trackId}" aria-label="Siguiente">&#8594;</button>
        </div>
      `;

    return `
      <section id="${escapeHtml(collection.id)}" class="${sectionClasses.join(" ")}">
        <div class="section-top reveal">
          <div class="section-intro">
            <div class="section-label"><span></span>${escapeHtml(collection.label)}</div>
            <h2 class="section-title">${collection.title}</h2>
            <p class="section-desc">${escapeHtml(collection.description)}</p>
          </div>
          <div class="section-note">
            <span>${escapeHtml(collection.note_label)}</span>
            <strong>${escapeHtml(collection.note_text)}</strong>
          </div>
        </div>
        <div class="gallery-shell reveal">
          <div class="gallery-header">
            <div class="gallery-meta">
              <span class="gallery-badge">${escapeHtml(collection.badge)}</span>
              <p>${escapeHtml(collection.meta_text)}</p>
            </div>
            ${controls}
          </div>
          <div class="gallery-track${collection.featured ? " gallery-track-featured" : ""}" id="${trackId}">
            ${products}
          </div>
        </div>
      </section>
      ${isLast ? "" : '<div class="divider-ornament"><span>&#9670;</span></div>'}
    `;
  };

  const initReveal = () => {
    const revealElements = document.querySelectorAll(".reveal:not(.visible)");

    if (!("IntersectionObserver" in window)) {
      revealElements.forEach((element) => element.classList.add("visible"));
      return;
    }

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
  };

  const renderCollections = (collections) => {
    if (!collectionsRoot) return;

    removeLegacyCollections();
    collectionsRoot.innerHTML = collections
      .map((collection, index) => createCollectionSection(collection, index === collections.length - 1))
      .join("");

    initReveal();
  };

  const renderCollectionsError = () => {
    if (!collectionsRoot) return;

    collectionsRoot.innerHTML = `
      <section class="section">
        <div class="section-intro reveal visible">
          <div class="section-label"><span></span>Colecciones</div>
          <h2 class="section-title">No pudimos cargar el <em>catalogo</em></h2>
          <p class="section-desc">Revisa que exista el archivo <code>data/colecciones.json</code> y vuelve a intentar.</p>
        </div>
      </section>
    `;
  };

  const loadCollections = async () => {
    if (!collectionsRoot) return;

    try {
      const response = await fetch("data/colecciones.json", { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`No se pudo cargar el catalogo: ${response.status}`);
      }

      const data = await response.json();
      renderCollections(Array.isArray(data.collections) ? data.collections : []);
    } catch (error) {
      console.error(error);
      renderCollectionsError();
    }
  };

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

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".gallery-btn");
    if (!button) return;

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

  initReveal();
  loadCollections();
});
