import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { getMessages, getServerLocale } from "@/lib/i18n";
import styles from "./page.module.css";

export default async function AdminPage() {
  const locale = await getServerLocale();
  const messages = await getMessages(locale);
  const m = messages.admin.overview;

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
    status === "PUBLISHED" ? m.statusPublished : m.statusDraft;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>{m.title}</h1>
          <p>{m.subtitle}</p>
        </div>
        <Link className={styles.primary} href="/admin/posts/new">
          {m.newPost}
        </Link>
      </header>

      <section className={styles.stats}>
        <div>
          <span>{m.totalPosts}</span>
          <strong>{postCount}</strong>
        </div>
        <div>
          <span>{m.published}</span>
          <strong>{publishedCount}</strong>
        </div>
        <div>
          <span>{m.draft}</span>
          <strong>{draftCount}</strong>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{m.latest}</h2>
          <Link className={styles.sectionLink} href="/admin/posts">
            {m.allPosts}
          </Link>
        </div>
        {latestPosts.length === 0 ? (
          <div className={styles.empty}>
            <p>{m.emptyTitle}</p>
            <p>{m.emptyText}</p>
          </div>
        ) : (
          <div className={styles.list}>
            {latestPosts.map((post) => (
              <div key={post.id} className={styles.row}>
                <div>
                  <p className={styles.title}>{post.title}</p>
                  <span className={styles.meta}>
                    {formatDate(post.createdAt, true, locale)} · {statusLabel(post.status)}
                  </span>
                </div>
                <Link className={styles.sectionLink} href={`/admin/posts/${post.id}/edit`}>
                  {m.edit}
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
