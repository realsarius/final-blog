import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import styles from "./page.module.css";

export default async function BlogPage() {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
  });

  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <h1>Yazılar</h1>
          <p>
            Teknik notlar, proje günlükleri ve düzenli güncellediğim kısa
            paylaşımlar.
          </p>
        </header>

        {posts.length === 0 ? (
          <div className={styles.empty}>
            <p>Henüz yayınlanmış bir yazı yok.</p>
            <p>Yakında burada ilk yazılar görünecek.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {posts.map((post) => {
              const categoryNames = post.categories
                .map((item) => item.category.name)
                .join(", ");
              const tagNames = post.tags.map((item) => item.tag.name).join(", ");

              return (
                <article key={post.id} className={styles.item}>
                  <div className={styles.meta}>
                    <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
                    {categoryNames ? <span>{categoryNames}</span> : null}
                  </div>
                  <h2 className={styles.title}>{post.title}</h2>
                  {post.excerpt ? (
                    <p className={styles.excerpt}>{post.excerpt}</p>
                  ) : null}
                  {tagNames ? (
                    <p className={styles.tags}>Etiketler: {tagNames}</p>
                  ) : null}
                  <Link className={styles.link} href={`/blog/${post.slug}`}>
                    Yazıyı oku
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
