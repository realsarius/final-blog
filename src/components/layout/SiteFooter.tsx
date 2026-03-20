import Link from "next/link";
import {
  getAdminEmail,
  getAdminFullName,
  getGithubUrl,
  getLinkedinUrl,
  getSiteDescription,
  getSiteName,
} from "@/lib/seo";
import { getServerLocale } from "@/lib/i18n";
import styles from "./SiteFooter.module.css";

export default async function SiteFooter() {
  const locale = await getServerLocale();
  const t = locale === "en"
    ? {
      navAria: "Site links",
      site: "Site",
      about: "About",
      posts: "Posts",
      contact: "Contact",
      newsletter: "Newsletter",
      newsletterText: "Get notified by email when new posts are published.",
      emailAria: "Email address",
      emailPlaceholder: "Your email address",
      subscribe: "Subscribe",
      rights: "All rights reserved.",
      privacy: "Privacy",
    }
    : {
      navAria: "Site bağlantıları",
      site: "Site",
      about: "Hakkımda",
      posts: "Yazılar",
      contact: "İletişim",
      newsletter: "Bülten",
      newsletterText: "Yeni yazılar yayınlandığında e-posta ile haberdar olun.",
      emailAria: "E-posta adresi",
      emailPlaceholder: "E-posta adresiniz",
      subscribe: "Abone Ol",
      rights: "Tüm hakları saklıdır.",
      privacy: "Gizlilik",
    };
  const currentYear = new Date().getFullYear();
  const siteName = await getSiteName();
  const siteDescription = await getSiteDescription();
  const adminEmail = await getAdminEmail();
  const adminFullName = await getAdminFullName();
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

              <nav className={styles.linkColumn} aria-label={t.navAria}>
                <p className={styles.columnTitle}>{t.site}</p>
                <Link href="/about">{t.about}</Link>
                <Link href="/blog">{t.posts}</Link>
                <Link href="/contact">{t.contact}</Link>
              </nav>

              <div className={styles.linkColumn}>
                <p className={styles.columnTitle}>{t.newsletter}</p>
                <p className={styles.newsText}>
                  {t.newsletterText}
                </p>
                <form
                  className={styles.subscribeRow}
                  action="/contact"
                  method="get"
                >
                  <input
                    aria-label={t.emailAria}
                    className={styles.input}
                    name="email"
                    type="email"
                    placeholder={t.emailPlaceholder}
                    required
                  />
                  <button className={styles.button} type="submit">
                    {t.subscribe}
                  </button>
                </form>
              </div>
            </div>

            <div className={styles.bottom}>
              <p>© {currentYear} {adminFullName}. {t.rights}</p>
              <div className={styles.legalLinks}>
                <Link href="/privacy">{t.privacy}</Link>
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
