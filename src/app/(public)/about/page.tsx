import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getServerLocale } from "@/lib/i18n";
import { getAboutContent } from "@/lib/aboutContent";
import EditorRenderer from "@/components/EditorRenderer";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return locale === "en"
    ? { title: "About", description: "My hiking notes, route experiences, and blogging approach." }
    : { title: "Hakkımda", description: "Doğa yürüyüşü notları, rota deneyimleri ve blog yaklaşımım." };
}

export default async function AboutPage() {
  const locale = await getServerLocale();
  const session = await getServerSession(authOptions);
  const content = await getAboutContent(locale);
  const isAdmin = session?.user?.role === "ADMIN";
  const t = locale === "en" ? { edit: "Edit" } : { edit: "Düzenle" };

  return (
    <div className={styles.page}>
      <div className="container">
        {isAdmin ? (
          <div className={styles.adminActions}>
            <Link href={`/admin/pages/about?target=${locale}`} className={styles.editLink} aria-label={t.edit}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 20h4l10.5-10.5a1.414 1.414 0 0 0 0-2L16.5 5.5a1.414 1.414 0 0 0-2 0L4 16v4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="m13.5 8.5 2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        ) : null}

        <section className={styles.content}>
          <EditorRenderer content={content} locale={locale} />
        </section>
      </div>
    </div>
  );
}
