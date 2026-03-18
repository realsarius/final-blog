import Link from "next/link";
import styles from "./SiteFooter.module.css";

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.frame}>
        <div className={styles.panel}>
          <div className={styles.content}>
            <div className={styles.top}>
              <div className={styles.brandColumn}>
                <Link className={styles.brand} href="/">
                  Berkan&apos;ın Notları
                </Link>
                <p className={styles.description}>
                  Yazılım, üretkenlik ve dijital ürün geliştirme notlarını sade
                  bir dille paylaşan kişisel yayın.
                </p>
              </div>

              <nav className={styles.linkColumn} aria-label="Site bağlantıları">
                <p className={styles.columnTitle}>Site</p>
                <Link href="/about">Hakkımda</Link>
                <Link href="/blog">Yazılar</Link>
                <Link href="/contact">İletişim</Link>
              </nav>

              <div className={styles.linkColumn}>
                <p className={styles.columnTitle}>Bülten</p>
                <p className={styles.newsText}>
                  Yeni yazılar yayınlandığında e-posta ile haberdar olun.
                </p>
                <form
                  className={styles.subscribeRow}
                  action="/contact"
                  method="get"
                >
                  <input
                    aria-label="E-posta adresi"
                    className={styles.input}
                    name="email"
                    type="email"
                    placeholder="E-posta adresiniz"
                    required
                  />
                  <button className={styles.button} type="submit">
                    Abone Ol
                  </button>
                </form>
              </div>
            </div>

            <div className={styles.bottom}>
              <p>© 2026 Berkan Sozer. Tüm hakları saklıdır.</p>
              <div className={styles.legalLinks}>
                <Link href="/privacy">Gizlilik</Link>
                <a href="mailto:hello@berkansozer.com">hello@berkansozer.com</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
