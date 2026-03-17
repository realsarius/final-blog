import styles from "../../loading.module.css";

export default function AdminPostsLoading() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.title}>Yazılar yükleniyor...</p>
        <div className={styles.bar} />
        <div className={styles.bar} style={{ width: "65%" }} />
        <div className={styles.bar} style={{ width: "45%" }} />
      </div>
    </div>
  );
}
