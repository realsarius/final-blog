import Link from "next/link";
import styles from "./error.module.css";

export default function NotFoundPage() {
  return (
    <div className={styles.page}>
      <div className="container">
        <h1>Sayfa bulunamadı</h1>
        <p>Aradığın sayfa taşınmış veya hiç var olmamış olabilir.</p>
        <div className={styles.actions}>
          <Link href="/">Ana sayfaya dön</Link>
          <Link href="/blog">Yazılara göz at</Link>
        </div>
      </div>
    </div>
  );
}
