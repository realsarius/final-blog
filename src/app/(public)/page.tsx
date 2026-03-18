import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";
import CategoryNav from "@/components/layout/CategoryNav";
import AuthorCard from "@/components/sidebar/AuthorCard";
import NewsletterWidget from "@/components/sidebar/NewsletterWidget";
import PopularSection from "@/components/sidebar/PopularSection";
import ArticleCard from "@/components/blog/ArticleCard";
import ScrollClassToggler from "@/components/layout/ScrollClassToggler";

export default async function HomePage() {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 6,
    include: {
      author: true,
      categories: { include: { category: true } },
    },
  });

  const latestPosts = posts.slice(0, 4);
  const popularPosts = posts.slice(0, 4);
  const author = posts[0]?.author ?? null;

  return (
    <div className={styles.page}>
      <ScrollClassToggler threshold={140} />
      {/* Hero */}
      <section className={styles.heroSection}>
        <div className={styles.heroGhost} aria-hidden="true">
          Berkan&apos;ın<br />Notları
        </div>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <div className={styles.heroClipped}>
              Berkan&apos;ın<br />Notları
            </div>
          </div>
          {author && (
            <div
              className={styles.heroAuthor}
              data-author-location="hero"
              aria-hidden="false"
            >
              <AuthorCard author={author} />
            </div>
          )}
        </div>
      </section>

      <CategoryNav />

      <div className="container">
        <div className={styles.contentGrid}>
          <main className={styles.mainCol}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Son Yazılar</h2>
            </div>
            {latestPosts.length === 0 ? (
              <div className={styles.empty}>
                <p>Henüz yayınlanmış bir yazı yok.</p>
              </div>
            ) : (
              <div className={styles.articles}>
                {latestPosts.map((post, index) => (
                  <ArticleCard
                    key={post.id}
                    post={post}
                    isLatest={index === 0}
                  />
                ))}
              </div>
            )}
          </main>

          <aside className={styles.sidebar}>
            {author && (
              <div
                className={styles.sidebarAuthor}
                data-author-location="sidebar"
                aria-hidden="true"
              >
                <AuthorCard author={author} />
              </div>
            )}
            <div className={styles.sidebarStack}>
              <NewsletterWidget />
              <PopularSection posts={popularPosts} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
