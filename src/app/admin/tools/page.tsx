import Link from "next/link";
import { requireAdminSession } from "@/lib/adminAuth";
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

function resolveUploadProviderLabel() {
  const provider = (process.env.UPLOAD_PROVIDER ?? "local").trim().toLowerCase();
  if (provider === "r2") {
    return "Cloudflare R2";
  }
  if (provider === "auto") {
    return hasR2Config() ? "Cloudflare R2 (auto)" : "Local (auto)";
  }
  return "Local";
}

export default async function AdminToolsPage() {
  await requireAdminSession("/admin/tools");

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

  const uploadProvider = resolveUploadProviderLabel();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Araçlar</h1>
          <p>Site yönetimi ve bakım işlemleri için merkez araç paneli.</p>
        </div>
      </header>

      <section className={styles.stats}>
        <div>
          <span>Toplam yazı</span>
          <strong>{postCount}</strong>
        </div>
        <div>
          <span>Medya ilişkili yazı</span>
          <strong>{mediaCount}</strong>
        </div>
        <div>
          <span>Yükleme sağlayıcısı</span>
          <strong>{uploadProvider}</strong>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Kullanılabilir Araçlar</h2>
        </div>
        <div className={styles.cards}>
          <article className={styles.card}>
            <h3>Site Sağlığı</h3>
            <p>Veritabanı, R2 ve temel yapılandırma kontrollerini tek ekranda gör.</p>
            <Link className={styles.cardLink} href="/admin/tools/site-health">
              Site sağlığına git
            </Link>
          </article>
          <article className={styles.card}>
            <h3>Notlar</h3>
            <p>Yayın planları ve teknik notlar için hızlı not defteri.</p>
            <Link className={styles.cardLink} href="/admin/notlar">
              Notları aç
            </Link>
          </article>
          <article className={styles.card}>
            <h3>Hesap Makinesi</h3>
            <p>İçerik planlama ve hızlı metrik hesaplamaları için pratik araç.</p>
            <Link className={styles.cardLink} href="/admin/hesap-makinesi">
              Hesap makinesini aç
            </Link>
          </article>
          <article className={styles.card}>
            <h3>Medya Kütüphanesi</h3>
            <p>R2 üzerindeki görselleri listele, yükle, sil ve filtrele.</p>
            <Link className={styles.cardLink} href="/admin/media">
              Medya ekranına git
            </Link>
          </article>
        </div>
      </section>
    </div>
  );
}
