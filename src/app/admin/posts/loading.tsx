import styles from "../../loading.module.css";
import { getMessages, getServerLocale } from "@/lib/i18n";

export default async function AdminPostsLoading() {
  const locale = await getServerLocale();
  const messages = await getMessages(locale);
  const m = messages.admin.posts;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.title}>{m.loading}</p>
        <div className={styles.bar} />
        <div className={styles.bar} style={{ width: "65%" }} />
        <div className={styles.bar} style={{ width: "45%" }} />
      </div>
    </div>
  );
}
