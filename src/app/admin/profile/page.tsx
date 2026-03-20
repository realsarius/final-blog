import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMessages, getServerLocale } from "@/lib/i18n";
import styles from "./page.module.css";
import PasswordForm from "./PasswordForm";

export default async function ProfilePage() {
  const locale = await getServerLocale();
  const messages = await getMessages(locale);
  const m = messages.admin.profile;
  const session = await getServerSession(authOptions);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{m.title}</h1>
        <p>{m.subtitle}</p>
      </header>

      <section className={styles.card}>
        <div>
          <span>{m.fullName}</span>
          <strong>{session?.user?.name ?? "-"}</strong>
        </div>
        <div>
          <span>{m.email}</span>
          <strong>{session?.user?.email ?? "-"}</strong>
        </div>
        <div>
          <span>{m.role}</span>
          <strong>{session?.user?.role ?? "-"}</strong>
        </div>
      </section>

      <section className={styles.section}>
        <h2>{m.passwordTitle}</h2>
        <PasswordForm messages={m} />
      </section>
    </div>
  );
}
