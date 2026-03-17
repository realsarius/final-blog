import styles from "../../loading.module.css";

export default function BlogLoading() {
  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.card}>
          <p className={styles.title}>Yazılar yükleniyor...</p>
          <div className={styles.bar} />
          <div className={styles.bar} style={{ width: "70%" }} />
          <div className={styles.bar} style={{ width: "40%" }} />
        </div>
      </div>
    </div>
  );
}
