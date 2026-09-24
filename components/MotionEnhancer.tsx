"use client";

import { useEffect } from "react";

export function MotionEnhancer() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.classList.add("motion-ready");
      return;
    }

    let cleanup = () => {};

    async function run() {
      const gsapModule = await import("gsap");
      const scrollTriggerModule = await import("gsap/ScrollTrigger");
      const gsap = gsapModule.gsap;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger;

      gsap.registerPlugin(ScrollTrigger);
      document.documentElement.classList.add("motion-ready");

      const revealItems = gsap.utils.toArray<HTMLElement>("[data-reveal]");
      revealItems.forEach((item) => {
        gsap.fromTo(
          item,
          { y: 28, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: {
              trigger: item,
              start: "top 88%",
              once: true
            }
          }
        );
      });

      gsap.utils.toArray<HTMLElement>("[data-image-motion]").forEach((item) => {
        gsap.fromTo(
          item,
          { scale: 0.96, opacity: 0.82 },
          {
            scale: 1,
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: item,
              start: "top 92%",
              end: "bottom 16%",
              scrub: true
            }
          }
        );
      });

      const scrubWords = gsap.utils.toArray<HTMLElement>("[data-scrub-word]");
      if (scrubWords.length) {
        gsap.fromTo(
          scrubWords,
          { opacity: 0.24 },
          {
            opacity: 1,
            stagger: 0.08,
            ease: "none",
            scrollTrigger: {
              trigger: "[data-scrub-copy]",
              start: "top 82%",
              end: "bottom 48%",
              scrub: true
            }
          }
        );
      }

      cleanup = () => {
        ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      };
    }

    run();

    return () => cleanup();
  }, []);

  return null;
}
