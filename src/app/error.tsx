"use client";

import Link from "next/link";
import { useDocumentLocale } from "@/lib/client/useDocumentLocale";
import styles from "./error.module.css";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const locale = useDocumentLocale();

  const t = locale === "en"
    ? {
      title: "Something went wrong",
      fallback: "An unexpected error occurred.",
      retry: "Try again",
      home: "Back to home",
    }
    : {
      title: "Bir sorun oluştu",
      fallback: "Beklenmeyen bir hata oluştu.",
      retry: "Tekrar dene",
      home: "Ana sayfaya dön",
    };

  return (
    <div className={styles.page}>
      <div className="container">
        <h1>{t.title}</h1>
        <p>{error.message || t.fallback}</p>
        <div className={styles.actions}>
          <button onClick={reset}>{t.retry}</button>
          <Link href="/">{t.home}</Link>
        </div>
      </div>
    </div>
  );
}
