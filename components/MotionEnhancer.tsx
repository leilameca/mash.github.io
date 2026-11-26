"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function MotionEnhancer() {
  const path = usePathname();

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          entry.target.animate(
            [
              { transform: "translateY(8px)", opacity: 0.86 },
              { transform: "translateY(0)", opacity: 1 },
            ],
            { duration: 360, easing: "ease-out" },
          );
        }
      },
      { threshold: 0.12 },
    );
    document
      .querySelectorAll(
        ".mash-public [data-reveal]:not(.hero-copy, .hero-showroom)",
      )
      .forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [path]);

  return null;
}
