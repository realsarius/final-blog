import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import styles from "./page.module.css";

export default async function HomePage() {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 3,
  });

  return (
    <div className={styles.page}>
      <section className={styles.intro}>
        <div className="container">
          <h1 className={styles.title}>
            Teknik yazılar, öğrenme notları ve küçük deneyler.
          </h1>
          <p className={styles.lead}>
            Bu blogu sade ve üretken kalmak için tasarladım. Yazılar kısa,
            içerikler net; okuyan için hızlıca değere ulaşan bir akış hedefliyor.
          </p>
          <ul className={styles.topics}>
            <li>Yazılım</li>
            <li>Ürün</li>
            <li>Deneyim</li>
            <li>Notlar</li>
          </ul>
        </div>
      </section>

      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2>Son Yazılar</h2>
            <Link className={styles.sectionLink} href="/blog">
              Tüm yazılar
            </Link>
          </div>

          {posts.length === 0 ? (
            <div className={styles.empty}>
              <p>Henüz yayınlanmış bir yazı yok.</p>
              <p>İlk yazı geldiğinde burada görünecek.</p>
            </div>
          ) : (
            <div className={styles.postGrid}>
              {posts.map((post) => (
                <article key={post.id} className={styles.card}>
                  <div className={styles.cardMeta}>
                    {formatDate(post.publishedAt ?? post.createdAt)}
                  </div>
                  <h3 className={styles.cardTitle}>{post.title}</h3>
                  {post.excerpt ? (
                    <p className={styles.cardExcerpt}>{post.excerpt}</p>
                  ) : null}
                  <Link className={styles.cardLink} href={`/blog/${post.slug}`}>
                    Yazıya git
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
