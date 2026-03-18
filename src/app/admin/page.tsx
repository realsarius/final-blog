import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import styles from "./page.module.css";

export default async function AdminPage() {
  const [postCount, publishedCount, draftCount, latestPosts] =
    await Promise.all([
      prisma.post.count(),
      prisma.post.count({ where: { status: "PUBLISHED" } }),
      prisma.post.count({ where: { status: "DRAFT" } }),
      prisma.post.findMany({
        orderBy: [{ createdAt: "desc" }],
        take: 5,
      }),
    ]);

  const statusLabel = (status: string) =>
    status === "PUBLISHED" ? "Yayında" : "Taslak";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Genel Bakış</h1>
          <p>Blog akışını ve son yazıları buradan takip edebilirsin.</p>
        </div>
        <Link className={styles.primary} href="/admin/posts/new">
          Yeni yazı
        </Link>
      </header>

      <section className={styles.stats}>
        <div>
          <span>Toplam yazı</span>
          <strong>{postCount}</strong>
        </div>
        <div>
          <span>Yayınlanan</span>
          <strong>{publishedCount}</strong>
        </div>
        <div>
          <span>Taslak</span>
          <strong>{draftCount}</strong>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Son Eklenenler</h2>
          <Link className={styles.sectionLink} href="/admin/posts">
            Tüm yazılar
          </Link>
        </div>
        {latestPosts.length === 0 ? (
          <div className={styles.empty}>
            <p>Henüz yazı yok.</p>
            <p>Yeni yazı eklediğinde burada listelenecek.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {latestPosts.map((post) => (
              <div key={post.id} className={styles.row}>
                <div>
                  <p className={styles.title}>{post.title}</p>
                  <span className={styles.meta}>
                    {formatDate(post.createdAt, true)} · {statusLabel(post.status)}
                  </span>
                </div>
                <Link className={styles.sectionLink} href={`/admin/posts/${post.id}/edit`}>
                  Düzenle
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
