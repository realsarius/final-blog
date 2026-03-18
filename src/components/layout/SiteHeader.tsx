import Link from "next/link";
import styles from "./SiteHeader.module.css";

export default function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.meta}>Est. 2026</div>
        <Link className={styles.brand} href="/">
          Berkan&apos;ın Notları
        </Link>
        <div className={styles.actions}>
          <Link href="/contact">İletişim</Link>
        </div>
      </div>
    </header>
  );
}
