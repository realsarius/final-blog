import Link from "next/link";
import styles from "./layout.module.css";
import SignOutButton from "@/components/admin/SignOutButton";
import AdminToasts from "@/components/admin/AdminToasts";

const blogNavItems = [
  { href: "/admin", label: "Genel Bakış" },
  { href: "/admin/posts", label: "Yazılar" },
  { href: "/admin/categories", label: "Kategoriler" },
  { href: "/admin/tags", label: "Etiketler" },
  { href: "/admin/profile", label: "Profil" },
];

const toolNavItems = [
  { href: "/admin/notlar", label: "Notlar" },
  { href: "/admin/hesap-makinesi", label: "Hesap Makinesi" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>Yönetim Menüsü</div>

        <div className={styles.navGroup}>
          <p className={styles.navGroupTitle}>Blog Yönetimi</p>
          <nav className={styles.nav} aria-label="Blog yönetimi">
            {blogNavItems.map((item) => (
              <Link key={item.href} href={item.href} className={styles.navLink}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className={styles.navGroup}>
          <p className={styles.navGroupTitle}>Araçlar</p>
          <nav className={styles.nav} aria-label="Araçlar">
            {toolNavItems.map((item) => (
              <Link key={item.href} href={item.href} className={styles.navLink}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          <Link href="/" className={styles.backToSiteLink}>
            <span className={styles.backArrow} aria-hidden>
              ←
            </span>
            <span>Siteye geri dön</span>
          </Link>
        </div>
      </aside>
      <div className={styles.mainArea}>
        <AdminToasts />
        <header className={styles.topbar}>
          <span>Yönetim Paneli</span>
          <SignOutButton className={styles.signOut} />
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
