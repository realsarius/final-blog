"use client";

import { usePathname, useSearchParams } from "next/navigation";
import styles from "./LocaleSwitcher.module.css";

type LocaleSwitcherProps = {
  currentLocale: "tr" | "en";
};

function buildRedirectPath(pathname: string, searchParams: URLSearchParams) {
  const query = searchParams.toString();
  return query.length > 0 ? `${pathname}?${query}` : pathname;
}

export default function LocaleSwitcher({ currentLocale }: LocaleSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const redirectPath = buildRedirectPath(pathname, new URLSearchParams(searchParams.toString()));
  const ariaLabel = currentLocale === "en" ? "Language selector" : "Dil seçimi";

  return (
    <div className={styles.switcher} aria-label={ariaLabel}>
      <form method="post" action="/api/locale">
        <input type="hidden" name="locale" value="tr" />
        <input type="hidden" name="redirect" value={redirectPath} />
        <button
          type="submit"
          className={`${styles.link} ${currentLocale === "tr" ? styles.active : ""}`}
          aria-current={currentLocale === "tr" ? "true" : undefined}
        >
          TR
        </button>
      </form>
      <span>/</span>
      <form method="post" action="/api/locale">
        <input type="hidden" name="locale" value="en" />
        <input type="hidden" name="redirect" value={redirectPath} />
        <button
          type="submit"
          className={`${styles.link} ${currentLocale === "en" ? styles.active : ""}`}
          aria-current={currentLocale === "en" ? "true" : undefined}
        >
          EN
        </button>
      </form>
    </div>
  );
}
