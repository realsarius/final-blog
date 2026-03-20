import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { formatReadingTime } from "@/lib/readingTime";
import { getServerLocale } from "@/lib/i18n";
import styles from "./page.module.css";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return locale === "en"
    ? { title: "Posts", description: "Published blog posts and notes." }
    : { title: "Yazılar", description: "Yayınlanan blog yazıları ve notlar." };
}

const PAGE_SIZE = 9;
const copy = {
  tr: {
    title: "Yazılar",
    subtitle: "Teknik notlar, proje günlükleri ve düzenli güncellediğim kısa paylaşımlar.",
    viewAria: "Görünüm seçimi",
    list: "Liste",
    grid: "Grid",
    emptyTitle: "Henüz yayınlanmış bir yazı yok.",
    emptyText: "Yakında burada ilk yazılar görünecek.",
    tagsPrefix: "Etiketler:",
    readMore: "Yazıyı oku",
    paginationAria: "Blog sayfalama",
    previous: "Önceki",
    next: "Sonraki",
    filteredByTag: "Etiket filtresi:",
    clearTag: "Temizle",
  },
  en: {
    title: "Posts",
    subtitle: "Technical notes, project logs, and concise updates I publish regularly.",
    viewAria: "View selection",
    list: "List",
    grid: "Grid",
    emptyTitle: "No published post yet.",
    emptyText: "The first posts will appear here soon.",
    tagsPrefix: "Tags:",
    readMore: "Read post",
    paginationAria: "Blog pagination",
    previous: "Previous",
    next: "Next",
    filteredByTag: "Tag filter:",
    clearTag: "Clear",
  },
} as const;

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

function parseTag(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return "";
  }
  const normalized = raw.trim().toLowerCase();
  return /^[a-z0-9-]+$/.test(normalized) ? normalized : "";
}

function buildBlogUrl(page: number, view: "list" | "grid", tagSlug?: string) {
  const params = new URLSearchParams();
  if (page > 1) {
    params.set("page", String(page));
  }
  if (view === "grid") {
    params.set("view", "grid");
  }
  if (tagSlug) {
    params.set("tag", tagSlug);
  }
  const query = params.toString();
  return query ? `/blog?${query}` : "/blog";
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getServerLocale();
  const t = copy[locale];
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedPage = parsePage(resolvedSearchParams.page);
  const view = parseView(resolvedSearchParams.view);
  const selectedTagSlug = parseTag(resolvedSearchParams.tag);
  const postWhere = {
    status: "PUBLISHED" as const,
    ...(selectedTagSlug
      ? {
          tags: {
            some: {
              tag: {
                slug: selectedTagSlug,
              },
            },
          },
        }
      : {}),
  };

  const [totalPosts, selectedTag] = await Promise.all([
    prisma.post.count({
      where: postWhere,
    }),
    selectedTagSlug
      ? prisma.tag.findUnique({
          where: { slug: selectedTagSlug },
          select: { name: true, slug: true },
        })
      : Promise.resolve(null),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalPosts / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const posts = await prisma.post.findMany({
    where: postWhere,
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
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>
          <div className={styles.viewSwitch} aria-label={t.viewAria}>
            <Link
              href={buildBlogUrl(currentPage, "list", selectedTagSlug || undefined)}
              className={`${styles.viewButton} ${view === "list" ? styles.viewButtonActive : ""}`}
            >
              {t.list}
            </Link>
            <Link
              href={buildBlogUrl(currentPage, "grid", selectedTagSlug || undefined)}
              className={`${styles.viewButton} ${view === "grid" ? styles.viewButtonActive : ""}`}
            >
              {t.grid}
            </Link>
          </div>
        </header>
        {selectedTag ? (
          <div className={styles.activeTagFilter}>
            <span>{t.filteredByTag} <strong>{selectedTag.name}</strong></span>
            <Link href={buildBlogUrl(1, view)} className={styles.clearTagLink}>
              {t.clearTag}
            </Link>
          </div>
        ) : null}

        {posts.length === 0 ? (
          <div className={styles.empty}>
            <p>{t.emptyTitle}</p>
            <p>{t.emptyText}</p>
          </div>
        ) : (
          <>
            <div className={`${styles.list} ${view === "grid" ? styles.listGrid : ""}`}>
            {posts.map((post) => {
              const categoryNames = post.categories
                .map((item) => item.category.name)
                .join(", ");
              const tags = post.tags.map((item) => item.tag);
              const readingTime = formatReadingTime(post.content ?? "");

              return (
                <article
                  key={post.id}
                  className={`${styles.item} ${view === "grid" ? styles.itemGrid : ""}`}
                >
                  <div className={styles.meta}>
                    <span>{formatDate(post.publishedAt ?? post.createdAt, false, locale)}</span>
                    {categoryNames ? <span>{categoryNames}</span> : null}
                    {readingTime ? <span>{readingTime}</span> : null}
                  </div>
                  <h2 className={styles.title}>{post.title}</h2>
                  {post.excerpt ? (
                    <p className={styles.excerpt}>{post.excerpt}</p>
                  ) : null}
                  {tags.length > 0 ? (
                    <p className={styles.tags}>
                      <span>{t.tagsPrefix}</span>{" "}
                      {tags.map((tag, index) => (
                        <span key={tag.id}>
                          <Link href={buildBlogUrl(1, view, tag.slug)} className={styles.tagLink}>
                            {tag.name}
                          </Link>
                          {index < tags.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </p>
                  ) : null}
                  <Link className={styles.link} href={`/blog/${post.slug}`}>
                    {t.readMore}
                  </Link>
                </article>
              );
            })}
            </div>

            {totalPages > 1 ? (
              <nav className={styles.pagination} aria-label={t.paginationAria}>
                <Link
                  href={buildBlogUrl(Math.max(1, currentPage - 1), view, selectedTagSlug || undefined)}
                  className={`${styles.pageLink} ${currentPage === 1 ? styles.pageDisabled : ""}`}
                  aria-disabled={currentPage === 1}
                  tabIndex={currentPage === 1 ? -1 : undefined}
                >
                  {t.previous}
                </Link>

                <div className={styles.pageNumbers}>
                  {Array.from({ length: totalPages }, (_, index) => {
                    const page = index + 1;
                    return (
                      <Link
                        key={page}
                        href={buildBlogUrl(page, view, selectedTagSlug || undefined)}
                        className={`${styles.pageLink} ${page === currentPage ? styles.pageActive : ""}`}
                        aria-current={page === currentPage ? "page" : undefined}
                      >
                        {page}
                      </Link>
                    );
                  })}
                </div>

                <Link
                  href={buildBlogUrl(Math.min(totalPages, currentPage + 1), view, selectedTagSlug || undefined)}
                  className={`${styles.pageLink} ${currentPage === totalPages ? styles.pageDisabled : ""}`}
                  aria-disabled={currentPage === totalPages}
                  tabIndex={currentPage === totalPages ? -1 : undefined}
                >
                  {t.next}
                </Link>
              </nav>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
