import Link from "next/link";
import { getServerLocale } from "@/lib/i18n";
import styles from "./CategoryNav.module.css";

export default async function CategoryNav() {
  const locale = await getServerLocale();
  const navLinks = locale === "en"
    ? [
      { href: "/blog", label: "Latest Posts" },
      { href: "/blog?sort=popular", label: "Popular" },
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ]
    : [
      { href: "/blog", label: "Son Yazılar" },
      { href: "/blog?sort=popular", label: "Popüler" },
      { href: "/about", label: "Hakkımda" },
      { href: "/contact", label: "İletişim" },
    ];
  const t = locale === "en"
    ? { aria: "Categories", archive: "Archive" }
    : { aria: "Kategoriler", archive: "Arşiv" };

  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label={t.aria}>
        <div className={`container ${styles.navInner}`}>
          <div className={styles.inner}>
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={styles.link}>
                {link.label}
              </Link>
            ))}
          </div>
          <div className={styles.right}>{t.archive}</div>
        </div>
      </nav>
    </div>
  );
}
