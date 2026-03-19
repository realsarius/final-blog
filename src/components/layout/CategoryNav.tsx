import Link from "next/link";
import styles from "./CategoryNav.module.css";

const navLinks = [
  { href: "/blog", label: "Son Yazılar" },
  { href: "/blog?sort=popular", label: "Popüler" },
  { href: "/about", label: "Hakkımda" },
  { href: "/contact", label: "İletişim" },
  // { href: "/privacy", label: "Gizlilik" },
];

export default function CategoryNav() {
  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="Kategoriler">
        <div className={`container ${styles.navInner}`}>
          <div className={styles.inner}>
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={styles.link}>
                {link.label}
              </Link>
            ))}
          </div>
          <div className={styles.right}>Arşiv</div>
        </div>
      </nav>
    </div>
  );
}
