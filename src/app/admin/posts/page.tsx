import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminAuth";
import { formatDate } from "@/lib/format";
import { getMessages, getServerLocale } from "@/lib/i18n";
import { interpolate } from "@/lib/interpolate";
import ConfirmDeleteForm from "@/components/admin/ConfirmDeleteForm";
import styles from "./page.module.css";

async function deletePost(formData: FormData) {
  "use server";
  await requireAdminSession("/admin/posts");
  const locale = await getServerLocale();
  const messages = await getMessages(locale);
  const m = messages.admin.posts;
  const id = formData.get("id")?.toString();
  if (!id) {
    return;
  }
  await prisma.postCategory.deleteMany({ where: { postId: id } });
  await prisma.postTag.deleteMany({ where: { postId: id } });
  await prisma.post.delete({ where: { id } });
  revalidatePath("/admin/posts");
  redirect(`/admin/posts?success=${encodeURIComponent(m.successDeleted)}`);
}

type SortField = "title" | "date";
type SortDirection = "asc" | "desc";
const POSTS_PAGE_SIZE = 20;

function normalizeParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function resolvePostDate(post: { publishedAt: Date | null; createdAt: Date }) {
  return post.publishedAt ?? post.createdAt;
}

function parseMonthRange(monthValue: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}$/.test(monthValue)) {
    return null;
  }

  const [yearRaw, monthRaw] = monthValue.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }

  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

function formatMonthLabel(monthValue: string, locale: "tr" | "en") {
  const range = parseMonthRange(monthValue);
  if (!range) {
    return monthValue;
  }
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(range.start);
}

function resolveSortState(
  searchParams: Record<string, string | string[] | undefined>,
): { sortField: SortField | null; sortDirection: SortDirection | null } {
  const sortRaw = normalizeParam(searchParams.sort);
  const dirRaw = normalizeParam(searchParams.dir);
  const sortField = sortRaw === "title" || sortRaw === "date" ? sortRaw : null;
  const sortDirection = dirRaw === "asc" || dirRaw === "desc" ? dirRaw : null;

  if (!sortField || !sortDirection) {
    return { sortField: null, sortDirection: null };
  }

  return { sortField, sortDirection };
}

function resolveOrderBy(
  sortField: SortField | null,
  sortDirection: SortDirection | null,
): Prisma.PostOrderByWithRelationInput[] {
  if (sortField === "title" && sortDirection) {
    return [{ title: sortDirection }, { createdAt: "desc" }];
  }
  if (sortField === "date" && sortDirection) {
    return [{ createdAt: sortDirection }];
  }
  return [{ createdAt: "desc" }];
}

function getNextSortDirection(
  activeField: SortField | null,
  activeDirection: SortDirection | null,
  clickedField: SortField,
): SortDirection | null {
  if (activeField !== clickedField || !activeDirection) {
    return "asc";
  }
  if (activeDirection === "asc") {
    return "desc";
  }
  return null;
}

function getSortLabel(
  field: SortField,
  activeField: SortField | null,
  activeDirection: SortDirection | null,
  labels: {
    titleAsc: string;
    titleDesc: string;
    dateAsc: string;
    dateDesc: string;
  },
) {
  if (activeField !== field || !activeDirection) {
    return "";
  }
  if (field === "title") {
    return activeDirection === "asc" ? labels.titleAsc : labels.titleDesc;
  }
  return activeDirection === "asc" ? labels.dateAsc : labels.dateDesc;
}

function buildSortHref(
  clickedField: SortField,
  activeSort: { sortField: SortField | null; sortDirection: SortDirection | null },
  activeFilters: { q: string; category: string; tag: string; date: string },
) {
  const nextDirection = getNextSortDirection(
    activeSort.sortField,
    activeSort.sortDirection,
    clickedField,
  );
  const params = new URLSearchParams();

  if (activeFilters.q) {
    params.set("q", activeFilters.q);
  }
  if (activeFilters.category !== "all") {
    params.set("category", activeFilters.category);
  }
  if (activeFilters.tag !== "all") {
    params.set("tag", activeFilters.tag);
  }
  if (activeFilters.date !== "all") {
    params.set("date", activeFilters.date);
  }
  if (nextDirection) {
    params.set("sort", clickedField);
    params.set("dir", nextDirection);
  }

  const query = params.toString();
  return query.length > 0 ? `/admin/posts?${query}` : "/admin/posts";
}

function buildPageHref(
  targetPage: number,
  activeSort: { sortField: SortField | null; sortDirection: SortDirection | null },
  activeFilters: { q: string; category: string; tag: string; date: string },
) {
  const params = new URLSearchParams();

  if (activeSort.sortField && activeSort.sortDirection) {
    params.set("sort", activeSort.sortField);
    params.set("dir", activeSort.sortDirection);
  }
  if (activeFilters.q) {
    params.set("q", activeFilters.q);
  }
  if (activeFilters.category !== "all") {
    params.set("category", activeFilters.category);
  }
  if (activeFilters.tag !== "all") {
    params.set("tag", activeFilters.tag);
  }
  if (activeFilters.date !== "all") {
    params.set("date", activeFilters.date);
  }
  if (targetPage > 1) {
    params.set("page", String(targetPage));
  }

  const query = params.toString();
  return query.length > 0 ? `/admin/posts?${query}` : "/admin/posts";
}

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession("/admin/posts");
  const locale = await getServerLocale();
  const messages = await getMessages(locale);
  const m = messages.admin.posts;

  const resolvedSearchParams = (await searchParams) ?? {};
  const { sortField, sortDirection } = resolveSortState(resolvedSearchParams);
  const query = (normalizeParam(resolvedSearchParams.q) ?? "").trim();
  const selectedCategory = normalizeParam(resolvedSearchParams.category) ?? "all";
  const selectedTag = normalizeParam(resolvedSearchParams.tag) ?? "all";
  const selectedDate = normalizeParam(resolvedSearchParams.date) ?? "all";
  const requestedPageRaw = Number(normalizeParam(resolvedSearchParams.page));
  const requestedPage = Number.isFinite(requestedPageRaw) && requestedPageRaw > 0
    ? Math.floor(requestedPageRaw)
    : 1;
  const monthRange = selectedDate !== "all" ? parseMonthRange(selectedDate) : null;

  const whereClauses: Prisma.PostWhereInput[] = [];
  if (query.length > 0) {
    whereClauses.push({
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { excerpt: { contains: query, mode: "insensitive" } },
      ],
    });
  }

  if (selectedCategory !== "all") {
    whereClauses.push({
      categories: {
        some: {
          categoryId: selectedCategory,
        },
      },
    });
  }

  if (selectedTag !== "all") {
    whereClauses.push({
      tags: {
        some: {
          tagId: selectedTag,
        },
      },
    });
  }

  if (monthRange) {
    whereClauses.push({
      OR: [
        {
          publishedAt: {
            gte: monthRange.start,
            lt: monthRange.end,
          },
        },
        {
          publishedAt: null,
          createdAt: {
            gte: monthRange.start,
            lt: monthRange.end,
          },
        },
      ],
    });
  }

  const where: Prisma.PostWhereInput | undefined = whereClauses.length > 0
    ? { AND: whereClauses }
    : undefined;

  const totalCount = await prisma.post.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / POSTS_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const skip = (currentPage - 1) * POSTS_PAGE_SIZE;

  const [posts, categories, tags, allPostDates] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: resolveOrderBy(sortField, sortDirection),
      skip,
      take: POSTS_PAGE_SIZE,
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            views: true,
          },
        },
      },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.tag.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.post.findMany({
      select: {
        createdAt: true,
        publishedAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const monthOptions = Array.from(
    new Set(
      allPostDates.map((post) => {
        const date = resolvePostDate(post);
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      }),
    ),
  );

  const statusLabel = (status: string) => (status === "PUBLISHED" ? m.statusPublished : m.statusDraft);
  const sortLabels = {
    titleAsc: m.sortTitleAsc,
    titleDesc: m.sortTitleDesc,
    dateAsc: m.sortDateAsc,
    dateDesc: m.sortDateDesc,
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>{m.title}</h1>
          <Link className={styles.addPost} href="/admin/posts/new">
            {m.newPost}
          </Link>
        </div>
        <p className={styles.subtext}>{m.subtitle}</p>
      </header>

      {posts.length === 0 ? (
        <div className={styles.empty}>
          <p>{m.emptyTitle}</p>
          <p>{m.emptyText}</p>
        </div>
      ) : (
        <section className={styles.listArea} aria-label={m.listAria}>
          <div className={styles.toolbar}>
            <form className={styles.toolbarLeft} method="get">
              {sortField && sortDirection ? (
                <>
                  <input type="hidden" name="sort" value={sortField} />
                  <input type="hidden" name="dir" value={sortDirection} />
                </>
              ) : null}
              {query ? <input type="hidden" name="q" value={query} /> : null}
              <select className={styles.control} defaultValue="bulk">
                <option value="bulk">{m.bulkActions}</option>
                <option value="publish">{m.publish}</option>
                <option value="draft">{m.draft}</option>
                <option value="delete">{m.delete}</option>
              </select>
              <button type="button" className={styles.ghostBtn}>
                {m.apply}
              </button>
              <select className={styles.control} name="date" defaultValue={selectedDate}>
                <option value="all">{m.allDates}</option>
                {monthOptions.map((monthOption) => (
                  <option key={monthOption} value={monthOption}>
                    {formatMonthLabel(monthOption, locale)}
                  </option>
                ))}
              </select>
              <select className={styles.control} name="category" defaultValue={selectedCategory}>
                <option value="all">{m.allCategories}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select className={styles.control} name="tag" defaultValue={selectedTag}>
                <option value="all">{m.allTags}</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
              <button type="submit" className={styles.ghostBtn}>
                {m.filter}
              </button>
            </form>
            <form className={styles.searchArea} method="get">
              {sortField && sortDirection ? (
                <>
                  <input type="hidden" name="sort" value={sortField} />
                  <input type="hidden" name="dir" value={sortDirection} />
                </>
              ) : null}
              {selectedCategory !== "all" ? (
                <input type="hidden" name="category" value={selectedCategory} />
              ) : null}
              {selectedTag !== "all" ? (
                <input type="hidden" name="tag" value={selectedTag} />
              ) : null}
              {selectedDate !== "all" ? (
                <input type="hidden" name="date" value={selectedDate} />
              ) : null}
              <input
                type="search"
                name="q"
                className={styles.searchInput}
                placeholder={m.searchPlaceholder}
                aria-label={m.searchAria}
                defaultValue={query}
              />
              <button type="submit" className={styles.ghostBtn}>
                {m.searchButton}
              </button>
            </form>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.checkboxCol} aria-label={m.checkboxSelect} />
                  <th>
                    <Link
                      href={buildSortHref(
                        "title",
                        { sortField, sortDirection },
                        { q: query, category: selectedCategory, tag: selectedTag, date: selectedDate },
                      )}
                      className={styles.sortLink}
                    >
                      {m.headerTitle}{getSortLabel("title", sortField, sortDirection, sortLabels)}
                    </Link>
                  </th>
                  <th>{m.headerAuthor}</th>
                  <th>{m.headerStats}</th>
                  <th>
                    <Link
                      href={buildSortHref(
                        "date",
                        { sortField, sortDirection },
                        { q: query, category: selectedCategory, tag: selectedTag, date: selectedDate },
                      )}
                      className={styles.sortLink}
                    >
                      {m.headerDate}{getSortLabel("date", sortField, sortDirection, sortLabels)}
                    </Link>
                  </th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td className={styles.checkboxCol}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        aria-label={`${post.title} ${m.selectSuffix}`}
                      />
                    </td>
                    <td>
                      <div className={styles.titleCell}>
                        <p className={styles.title}>{post.title}</p>
                        <div className={styles.rowActions}>
                          <Link className={styles.actionLink} href={`/admin/posts/${post.id}/edit`}>
                            {m.edit}
                          </Link>
                          <span className={styles.rowDot}>•</span>
                          <ConfirmDeleteForm
                            action={deletePost}
                            idValue={post.id}
                            className={styles.danger}
                            confirmMessage={m.confirmDelete}
                            buttonLabel={m.delete}
                          />
                          <span className={styles.rowDot}>•</span>
                          <Link
                            className={styles.actionLink}
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {m.goToPost}
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td>{`${post.author.firstName} ${post.author.lastName}`}</td>
                    <td>
                      <span className={styles.views}>👁 {post._count.views}</span>
                    </td>
                    <td>
                      <div className={styles.dateCell}>
                        <span>{statusLabel(post.status)}</span>
                        <time dateTime={post.createdAt.toISOString()}>
                          {formatDate(resolvePostDate(post), true, locale)}
                        </time>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.toolbarBottom}>
            <select className={styles.control} defaultValue="bulk-bottom">
              <option value="bulk-bottom">{m.bulkActions}</option>
              <option value="publish-bottom">{m.publish}</option>
              <option value="draft-bottom">{m.draft}</option>
              <option value="delete-bottom">{m.delete}</option>
            </select>
            <button type="button" className={styles.ghostBtn}>
              {m.apply}
            </button>
            <span className={styles.itemCount}>{totalCount} {m.records}</span>
          </div>
          <div className={styles.pagination}>
            <Link
              className={`${styles.ghostBtn} ${currentPage <= 1 ? styles.ghostBtnDisabled : ""}`}
              href={buildPageHref(
                Math.max(1, currentPage - 1),
                { sortField, sortDirection },
                { q: query, category: selectedCategory, tag: selectedTag, date: selectedDate },
              )}
              aria-disabled={currentPage <= 1}
              tabIndex={currentPage <= 1 ? -1 : undefined}
            >
              {m.prevPage}
            </Link>
            <span className={styles.pageInfo}>
              {interpolate(m.pageInfo, { page: currentPage, total: totalPages })}
            </span>
            <Link
              className={`${styles.ghostBtn} ${currentPage >= totalPages ? styles.ghostBtnDisabled : ""}`}
              href={buildPageHref(
                Math.min(totalPages, currentPage + 1),
                { sortField, sortDirection },
                { q: query, category: selectedCategory, tag: selectedTag, date: selectedDate },
              )}
              aria-disabled={currentPage >= totalPages}
              tabIndex={currentPage >= totalPages ? -1 : undefined}
            >
              {m.nextPage}
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
