import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMessages, getServerLocale } from "@/lib/i18n";
import styles from "./SiteHeader.module.css";

export default async function SiteHeader() {
  const locale = await getServerLocale();
  const messages = await getMessages(locale);
  const session = await getServerSession(authOptions);
  const isAdmin = Boolean(session?.user?.id) && session?.user?.role === "ADMIN";

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.meta}>{messages.public.header.established}</div>
        <Link className={styles.brand} href="/">
          {messages.public.header.brand}
        </Link>
        <div className={styles.actions}>
          <Link href="/contact">{messages.public.header.contact}</Link>
          {isAdmin ? (
            <Link href="/admin">{messages.public.header.adminPanel}</Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
