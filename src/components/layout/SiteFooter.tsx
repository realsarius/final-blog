import Link from "next/link";
import {
  getAdminEmail,
  getAdminFullName,
  getGithubUrl,
  getLinkedinUrl,
  getSiteDescription,
  getSiteName,
} from "@/lib/seo";
import styles from "./SiteFooter.module.css";

export default function SiteFooter() {
  const currentYear = new Date().getFullYear();
  const siteName = getSiteName();
  const siteDescription = getSiteDescription();
  const adminEmail = getAdminEmail();
  const adminFullName = getAdminFullName();
  const linkedinUrl = getLinkedinUrl();
  const githubUrl = getGithubUrl();

  return (
    <footer className={styles.footer}>
      <div className={styles.frame}>
        <div className={styles.panel}>
          <div className={styles.content}>
            <div className={styles.top}>
              <div className={styles.brandColumn}>
                <Link className={styles.brand} href="/">
                  {siteName}
                </Link>
                <p className={styles.description}>
                  {siteDescription}
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
              <p>© {currentYear} {adminFullName}. Tüm hakları saklıdır.</p>
              <div className={styles.legalLinks}>
                <Link href="/privacy">Gizlilik</Link>
                {linkedinUrl ? (
                  <a href={linkedinUrl} target="_blank" rel="noreferrer">
                    LinkedIn
                  </a>
                ) : null}
                {githubUrl ? (
                  <a href={githubUrl} target="_blank" rel="noreferrer">
                    GitHub
                  </a>
                ) : null}
                <a href={`mailto:${adminEmail}`}>{adminEmail}</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
