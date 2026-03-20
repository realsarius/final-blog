import Link from "next/link";
import styles from "./NewsletterWidget.module.css";

export default function NewsletterWidget({ locale = "tr" }: { locale?: "tr" | "en" }) {
  const t = locale === "en"
    ? {
      label: "Newsletter",
      titleLeft: "Berkan's",
      titleRight: "Notes",
      description: "Curated notes on software, product, and learning.",
      cta: "Join newsletter",
    }
    : {
      label: "Bülten",
      titleLeft: "Berkan'ın",
      titleRight: "Notları",
      description: "Yazılım, ürün ve öğrenme üzerine seçkin notlar.",
      cta: "Bültene katıl",
    };

  return (
    <div className={styles.widget}>
      <p className={styles.label}>{t.label}</p>
      <h3 className={styles.title}>{t.titleLeft}{"\n"}{t.titleRight}</h3>
      <p className={styles.description}>
        {t.description}
      </p>
      <Link href="/contact" className={styles.button}>
        {t.cta} →
      </Link>
    </div>
  );
}
