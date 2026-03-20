import Link from "next/link";
import { getServerLocale } from "@/lib/i18n";
import styles from "./error.module.css";

export default async function NotFoundPage() {
  const locale = await getServerLocale();
  const t = locale === "en"
    ? {
      title: "Page not found",
      text: "The page you are looking for may have moved or never existed.",
      home: "Back to home",
      blog: "Browse posts",
    }
    : {
      title: "Sayfa bulunamadı",
      text: "Aradığın sayfa taşınmış veya hiç var olmamış olabilir.",
      home: "Ana sayfaya dön",
      blog: "Yazılara göz at",
    };

  return (
    <div className={styles.page}>
      <div className="container">
        <h1>{t.title}</h1>
        <p>{t.text}</p>
        <div className={styles.actions}>
          <Link href="/">{t.home}</Link>
          <Link href="/blog">{t.blog}</Link>
        </div>
      </div>
    </div>
  );
}
