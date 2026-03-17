import styles from "./SiteFooter.module.css";

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <p>© 2026 Berkan Sozer. Tüm hakları saklıdır.</p>
        <p>İletişim: hello@berkansozer.com</p>
      </div>
    </footer>
  );
}
