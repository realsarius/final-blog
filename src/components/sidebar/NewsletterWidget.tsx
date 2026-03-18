import Link from "next/link";
import styles from "./NewsletterWidget.module.css";

export default function NewsletterWidget() {
  return (
    <div className={styles.widget}>
      <p className={styles.label}>Bülten</p>
      <h3 className={styles.title}>Berkan&apos;ın{"\n"}Notları</h3>
      <p className={styles.description}>
        Yazılım, ürün ve öğrenme üzerine seçkin notlar.
      </p>
      <Link href="/contact" className={styles.button}>
        Bültene katıl →
      </Link>
    </div>
  );
}
