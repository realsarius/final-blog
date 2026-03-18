"use client";

import { useEffect } from "react";

interface ScrollClassTogglerProps {
  threshold?: number;
}

export default function ScrollClassToggler({
  threshold = 120,
}: ScrollClassTogglerProps) {
  useEffect(() => {
    const root = document.documentElement;

    const sync = () => {
      const isScrolled = window.scrollY > threshold;
      root.classList.toggle("is-scrolled", isScrolled);

      const hero = document.querySelector<HTMLElement>(
        '[data-author-location="hero"]'
      );
      const sidebar = document.querySelector<HTMLElement>(
        '[data-author-location="sidebar"]'
      );

      if (hero) {
        hero.setAttribute("aria-hidden", isScrolled ? "true" : "false");
      }
      if (sidebar) {
        sidebar.setAttribute("aria-hidden", isScrolled ? "false" : "true");
      }
    };

    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);

    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [threshold]);

  return null;
}
