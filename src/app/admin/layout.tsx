import Link from "next/link";
import styles from "./layout.module.css";
import SignOutButton from "@/components/admin/SignOutButton";
import AdminToasts from "@/components/admin/AdminToasts";

const navItems = [
  { href: "/admin", label: "Genel Bakış" },
  { href: "/admin/posts", label: "Yazılar" },
  { href: "/admin/categories", label: "Kategoriler" },
  { href: "/admin/tags", label: "Etiketler" },
  { href: "/admin/profile", label: "Profil" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>Blog Yönetimi</div>
        <nav className={styles.nav} aria-label="Admin">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </Link>
          ))}
        </nav>
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
