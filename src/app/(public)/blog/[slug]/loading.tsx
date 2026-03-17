import styles from "../../../loading.module.css";

export default function BlogDetailLoading() {
  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.card}>
          <p className={styles.title}>Yazı yükleniyor...</p>
          <div className={styles.bar} />
          <div className={styles.bar} style={{ width: "80%" }} />
          <div className={styles.bar} style={{ width: "60%" }} />
        </div>
      </div>
    </div>
  );
}
