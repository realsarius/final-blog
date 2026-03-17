import Link from "next/link";
import styles from "./SiteHeader.module.css";

const links = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/blog", label: "Yazılar" },
  { href: "/about", label: "Hakkımda" },
  { href: "/contact", label: "İletişim" },
  { href: "/privacy", label: "Gizlilik" },
];

export default function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link className={styles.brand} href="/">
          Berkan’ın Notları
        </Link>
        <nav className={styles.nav} aria-label="Site">
          {links.map((link) => (
            <Link key={link.href} className={styles.link} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
