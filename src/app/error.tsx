"use client";

import Link from "next/link";
import styles from "./error.module.css";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className={styles.page}>
      <div className="container">
        <h1>Bir sorun oluştu</h1>
        <p>{error.message || "Beklenmeyen bir hata oluştu."}</p>
        <div className={styles.actions}>
          <button onClick={reset}>Tekrar dene</button>
          <Link href="/">Ana sayfaya dön</Link>
        </div>
      </div>
    </div>
  );
}
