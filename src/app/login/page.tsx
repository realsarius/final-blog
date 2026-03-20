"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import styles from "./page.module.css";
import Link from "next/link";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locale, setLocale] = useState<"tr" | "en">("tr");

  useEffect(() => {
    const htmlLang = document.documentElement.lang;
    setLocale(htmlLang === "en" ? "en" : "tr");
  }, []);

  const t = locale === "en"
    ? {
      waitMinutes: "minutes",
      waitAWhile: "a while",
      tooMany: "Too many attempts. Please try again in {waitText}.",
      failed: "Login failed. Please check your credentials.",
      success: "Login successful.",
      backHome: "Back to home",
      title: "Admin Login",
      email: "Email",
      password: "Password",
      loggingIn: "Signing in...",
      login: "Sign in",
    }
    : {
      waitMinutes: "dakika",
      waitAWhile: "bir süre",
      tooMany: "Çok fazla deneme yapıldı. {waitText} sonra tekrar deneyin.",
      failed: "Giriş başarısız. Bilgileri kontrol edin.",
      success: "Giriş başarılı.",
      backHome: "Anasayfaya dön",
      title: "Admin Girişi",
      email: "E-posta",
      password: "Parola",
      loggingIn: "Giriş yapılıyor...",
      login: "Giriş yap",
    };

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
        const waitText = Number.isFinite(minutes) ? `${minutes} ${t.waitMinutes}` : t.waitAWhile;
        const message = t.tooMany.replace("{waitText}", waitText);
        setError(message);
        toast.error(message);
        return;
      }
      const message = t.failed;
      setError(message);
      toast.error(message);
      return;
    }

    toast.success(t.success);
    router.replace(callbackUrl);
  };

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <Link href="/" className={styles.backLink}>
          ← {t.backHome}
        </Link>
        <h1 className={styles.title}>{t.title}</h1>
        <form onSubmit={onSubmit} className={styles.form}>
          <label className={styles.field}>
            <span>{t.email}</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={styles.input}
            />
          </label>
          <label className={styles.field}>
            <span>{t.password}</span>
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
            {isSubmitting ? t.loggingIn : t.login}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
