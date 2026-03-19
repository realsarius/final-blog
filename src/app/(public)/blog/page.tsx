import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { formatReadingTime } from "@/lib/readingTime";
import styles from "./page.module.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yazılar",
  description: "Yayınlanan blog yazıları ve notlar.",
};

const PAGE_SIZE = 9;

function parsePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

function parseView(value: string | string[] | undefined): "list" | "grid" {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "grid" ? "grid" : "list";
}

function buildBlogUrl(page: number, view: "list" | "grid") {
  const params = new URLSearchParams();
  if (page > 1) {
    params.set("page", String(page));
  }
  if (view === "grid") {
    params.set("view", "grid");
  }
  const query = params.toString();
  return query ? `/blog?${query}` : "/blog";
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedPage = parsePage(resolvedSearchParams.page);
  const view = parseView(resolvedSearchParams.view);

  const totalPosts = await prisma.post.count({
    where: { status: "PUBLISHED" },
  });
  const totalPages = Math.max(1, Math.ceil(totalPosts / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    skip,
    take: PAGE_SIZE,
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
  });

  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <div>
            <h1>Yazılar</h1>
            <p>
              Teknik notlar, proje günlükleri ve düzenli güncellediğim kısa
              paylaşımlar.
            </p>
          </div>
          <div className={styles.viewSwitch} aria-label="Gorunum secimi">
            <Link
              href={buildBlogUrl(currentPage, "list")}
              className={`${styles.viewButton} ${view === "list" ? styles.viewButtonActive : ""}`}
            >
              Liste
            </Link>
            <Link
              href={buildBlogUrl(currentPage, "grid")}
              className={`${styles.viewButton} ${view === "grid" ? styles.viewButtonActive : ""}`}
            >
              Grid
            </Link>
          </div>
        </header>

        {posts.length === 0 ? (
          <div className={styles.empty}>
            <p>Henüz yayınlanmış bir yazı yok.</p>
            <p>Yakında burada ilk yazılar görünecek.</p>
          </div>
        ) : (
          <>
            <div className={`${styles.list} ${view === "grid" ? styles.listGrid : ""}`}>
            {posts.map((post) => {
              const categoryNames = post.categories
                .map((item) => item.category.name)
                .join(", ");
              const tagNames = post.tags.map((item) => item.tag.name).join(", ");
              const readingTime = formatReadingTime(post.content ?? "");

              return (
                <article
                  key={post.id}
                  className={`${styles.item} ${view === "grid" ? styles.itemGrid : ""}`}
                >
                  <div className={styles.meta}>
                    <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
                    {categoryNames ? <span>{categoryNames}</span> : null}
                    {readingTime ? <span>{readingTime}</span> : null}
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

            {totalPages > 1 ? (
              <nav className={styles.pagination} aria-label="Blog sayfalama">
                <Link
                  href={buildBlogUrl(Math.max(1, currentPage - 1), view)}
                  className={`${styles.pageLink} ${currentPage === 1 ? styles.pageDisabled : ""}`}
                  aria-disabled={currentPage === 1}
                  tabIndex={currentPage === 1 ? -1 : undefined}
                >
                  Önceki
                </Link>

                <div className={styles.pageNumbers}>
                  {Array.from({ length: totalPages }, (_, index) => {
                    const page = index + 1;
                    return (
                      <Link
                        key={page}
                        href={buildBlogUrl(page, view)}
                        className={`${styles.pageLink} ${page === currentPage ? styles.pageActive : ""}`}
                        aria-current={page === currentPage ? "page" : undefined}
                      >
                        {page}
                      </Link>
                    );
                  })}
                </div>

                <Link
                  href={buildBlogUrl(Math.min(totalPages, currentPage + 1), view)}
                  className={`${styles.pageLink} ${currentPage === totalPages ? styles.pageDisabled : ""}`}
                  aria-disabled={currentPage === totalPages}
                  tabIndex={currentPage === totalPages ? -1 : undefined}
                >
                  Sonraki
                </Link>
              </nav>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
