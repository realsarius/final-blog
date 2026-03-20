import styles from "../../../loading.module.css";
import { getServerLocale } from "@/lib/i18n";

export default async function BlogDetailLoading() {
  const locale = await getServerLocale();
  const title = locale === "en" ? "Loading post..." : "Yazı yükleniyor...";

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.card}>
          <p className={styles.title}>{title}</p>
          <div className={styles.bar} />
          <div className={styles.bar} style={{ width: "80%" }} />
          <div className={styles.bar} style={{ width: "60%" }} />
        </div>
      </div>
    </div>
  );
}
