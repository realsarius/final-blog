"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import styles from "./LocaleSwitcher.module.css";

type LocaleSwitcherProps = {
  currentLocale: Locale;
};

function buildRedirectPath(pathname: string, searchParams: URLSearchParams) {
  const query = searchParams.toString();
  return query.length > 0 ? `${pathname}?${query}` : pathname;
}

export default function LocaleSwitcher({ currentLocale }: LocaleSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const redirectPath = buildRedirectPath(pathname, new URLSearchParams(searchParams.toString()));

  return (
    <div className={styles.switcher} aria-label="Dil seçimi">
      <Link
        href={`/api/locale?locale=tr&redirect=${encodeURIComponent(redirectPath)}`}
        className={`${styles.link} ${currentLocale === "tr" ? styles.active : ""}`}
      >
        TR
      </Link>
      <span>/</span>
      <Link
        href={`/api/locale?locale=en&redirect=${encodeURIComponent(redirectPath)}`}
        className={`${styles.link} ${currentLocale === "en" ? styles.active : ""}`}
      >
        EN
      </Link>
    </div>
  );
}
