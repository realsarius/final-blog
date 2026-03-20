"use client";

import { useEffect, useState } from "react";
import styles from "./BackToTopButton.module.css";

interface BackToTopButtonProps {
  threshold?: number;
}

export default function BackToTopButton({ threshold = 520 }: BackToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [locale, setLocale] = useState<"tr" | "en">("tr");

  useEffect(() => {
    const sync = () => {
      setIsVisible(window.scrollY > threshold);
    };

    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, [threshold]);

  useEffect(() => {
    const htmlLang = document.documentElement.lang;
    setLocale(htmlLang === "en" ? "en" : "tr");
  }, []);

  return (
    <button
      type="button"
      className={`${styles.button} ${isVisible ? styles.buttonVisible : ""}`}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={locale === "en" ? "Back to top" : "Sayfanın başına dön"}
    >
      ↑
    </button>
  );
}
