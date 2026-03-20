import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import styles from "./layout.module.css";
import SignOutButton from "@/components/admin/SignOutButton";
import AdminToasts from "@/components/admin/AdminToasts";
import AdminSidebarNav from "@/components/admin/AdminSidebarNav";
import { getMessages, getServerLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getServerLocale();
  const messages = await getMessages(locale);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>{messages.admin.layout.sidebarHeader}</div>
        <AdminSidebarNav navGroups={messages.admin.nav.groups} />

        <div className={styles.sidebarFooter}>
          <Link href="/" className={styles.backToSiteLink}>
            <span className={styles.backArrow} aria-hidden>
              ←
            </span>
            <span>{messages.admin.layout.backToSite}</span>
          </Link>
        </div>
      </aside>
      <div className={styles.mainArea}>
        <Suspense fallback={null}>
          <AdminToasts />
        </Suspense>
        <header className={styles.topbar}>
          <span>{messages.admin.layout.panelTitle}</span>
          <div className={styles.topbarActions}>
            <SignOutButton className={styles.signOut} label={messages.admin.layout.signOut} />
          </div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
