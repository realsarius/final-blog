import Link from "next/link";
import { requireAdminSession } from "@/lib/adminAuth";
import { getMessages, getServerLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";

function hasR2Config() {
  return Boolean(
    process.env.R2_ACCOUNT_ID
    && process.env.R2_ACCESS_KEY_ID
    && process.env.R2_SECRET_ACCESS_KEY
    && process.env.R2_BUCKET_NAME
    && process.env.R2_PUBLIC_BASE_URL,
  );
}

function resolveUploadProviderLabel(messages: {
  providerCloudflareR2: string;
  providerCloudflareR2Auto: string;
  providerLocal: string;
  providerLocalAuto: string;
}) {
  const provider = (process.env.UPLOAD_PROVIDER ?? "local").trim().toLowerCase();
  if (provider === "r2") {
    return messages.providerCloudflareR2;
  }
  if (provider === "auto") {
    return hasR2Config() ? messages.providerCloudflareR2Auto : messages.providerLocalAuto;
  }
  return messages.providerLocal;
}

export default async function AdminToolsPage() {
  await requireAdminSession("/admin/tools");
  const locale = await getServerLocale();
  const messages = await getMessages(locale);
  const t = messages.admin.tools;

  const [postCount, mediaCount] = await Promise.all([
    prisma.post.count(),
    prisma.post.count({
      where: {
        OR: [
          { coverImageUrl: { not: null } },
          { ogImageUrl: { not: null } },
        ],
      },
    }),
  ]);

  const uploadProvider = resolveUploadProviderLabel(t);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
      </header>

      <section className={styles.stats}>
        <div>
          <span>{t.statsTotalPosts}</span>
          <strong>{postCount}</strong>
        </div>
        <div>
          <span>{t.statsMediaPosts}</span>
          <strong>{mediaCount}</strong>
        </div>
        <div>
          <span>{t.statsUploadProvider}</span>
          <strong>{uploadProvider}</strong>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{t.sectionTitle}</h2>
        </div>
        <div className={styles.cards}>
          <article className={styles.card}>
            <h3>{t.siteHealthTitle}</h3>
            <p>{t.siteHealthDescription}</p>
            <Link className={styles.cardLink} href="/admin/tools/site-health">
              {t.siteHealthAction}
            </Link>
          </article>
          <article className={styles.card}>
            <h3>{t.notesTitle}</h3>
            <p>{t.notesDescription}</p>
            <Link className={styles.cardLink} href="/admin/notlar">
              {t.notesAction}
            </Link>
          </article>
          <article className={styles.card}>
            <h3>{t.calculatorTitle}</h3>
            <p>{t.calculatorDescription}</p>
            <Link className={styles.cardLink} href="/admin/hesap-makinesi">
              {t.calculatorAction}
            </Link>
          </article>
          <article className={styles.card}>
            <h3>{t.mediaLibraryTitle}</h3>
            <p>{t.mediaLibraryDescription}</p>
            <Link className={styles.cardLink} href="/admin/media">
              {t.mediaLibraryAction}
            </Link>
          </article>
        </div>
      </section>
    </div>
  );
}
