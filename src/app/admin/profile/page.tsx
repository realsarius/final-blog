import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import styles from "./page.module.css";
import PasswordForm from "./PasswordForm";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Profil</h1>
        <p>Hesap bilgilerini burada görebilir, ileride güncelleyebilirsin.</p>
      </header>

      <section className={styles.card}>
        <div>
          <span>Ad Soyad</span>
          <strong>{session?.user?.name ?? "-"}</strong>
        </div>
        <div>
          <span>E-posta</span>
          <strong>{session?.user?.email ?? "-"}</strong>
        </div>
        <div>
          <span>Rol</span>
          <strong>{session?.user?.role ?? "-"}</strong>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Parola Güncelle</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
