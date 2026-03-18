"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import styles from "./page.module.css";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setIsSubmitting(false);

    if (result?.error) {
      if (result.error.startsWith("RATE_LIMIT:")) {
        const [, minutesRaw] = result.error.split(":");
        const minutes = Number(minutesRaw);
        const waitText = Number.isFinite(minutes) ? `${minutes} dakika` : "bir süre";
        const message = `Çok fazla deneme yapıldı. ${waitText} sonra tekrar deneyin.`;
        setError(message);
        toast.error(message);
        return;
      }
      const message = "Giriş başarısız. Bilgileri kontrol edin.";
      setError(message);
      toast.error(message);
      return;
    }

    toast.success("Giriş başarılı.");
    router.replace(callbackUrl);
  };

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <Link href="/" className={styles.backLink}>
          ← Anasayfaya dön
        </Link>
        <h1 className={styles.title}>Admin Girişi</h1>
        <form onSubmit={onSubmit} className={styles.form}>
          <label className={styles.field}>
            <span>E-posta</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={styles.input}
            />
          </label>
          <label className={styles.field}>
            <span>Parola</span>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={styles.input}
            />
          </label>
          {error ? <p className={styles.error}>{error}</p> : null}
          <button type="submit" disabled={isSubmitting} className={styles.button}>
            {isSubmitting ? "Giriş yapılıyor..." : "Giriş yap"}
          </button>
        </form>
      </section>
    </main>
  );
}
