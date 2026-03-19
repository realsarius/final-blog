"use client";

import { useEffect, useState } from "react";
import styles from "./BackToTopButton.module.css";

interface BackToTopButtonProps {
  threshold?: number;
}

export default function BackToTopButton({ threshold = 520 }: BackToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const sync = () => {
      setIsVisible(window.scrollY > threshold);
    };

    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, [threshold]);

  return (
    <button
      type="button"
      className={`${styles.button} ${isVisible ? styles.buttonVisible : ""}`}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Sayfanın başına dön"
    >
      ↑
    </button>
  );
}
