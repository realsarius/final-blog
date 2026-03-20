import Link from "next/link";
import { getMessages, getServerLocale } from "@/lib/i18n";
import LocaleSwitcher from "@/components/layout/LocaleSwitcher";
import styles from "./SiteHeader.module.css";

export default async function SiteHeader() {
  const locale = await getServerLocale();
  const messages = await getMessages(locale);

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.meta}>{messages.public.header.established}</div>
        <Link className={styles.brand} href="/">
          {messages.public.header.brand}
        </Link>
        <div className={styles.actions}>
          <Link href="/contact">{messages.public.header.contact}</Link>
          <LocaleSwitcher currentLocale={locale} />
        </div>
      </div>
    </header>
  );
}
