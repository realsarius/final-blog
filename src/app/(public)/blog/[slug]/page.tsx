import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { formatReadingTime } from "@/lib/readingTime";
import { getServerLocale } from "@/lib/i18n";
import EditorRenderer from "@/components/EditorRenderer";
import styles from "./page.module.css";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await getServerLocale();
  const { slug } = await params;
  const post = await prisma.post.findUnique({
    where: { slug },
    select: { title: true, excerpt: true, status: true },
  });

  if (!post || post.status !== "PUBLISHED") {
    return { title: locale === "en" ? "Post not found" : "Yazı bulunamadı" };
  }

  return {
    title: post.title,
    description: post.excerpt ?? (locale === "en" ? "Blog post" : "Blog yazısı"),
  };
}

export default async function BlogDetailPage({ params }: PageProps) {
  const locale = await getServerLocale();
  const t = locale === "en"
    ? { edit: "Edit", tags: "Tags:" }
    : { edit: "Düzenle", tags: "Etiketler:" };
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      author: true,
    },
  });

  if (!post || post.status !== "PUBLISHED") {
    notFound();
  }

  const categories = post.categories.map((item) => item.category.name).join(", ");
  const tags = post.tags.map((item) => item.tag.name).join(", ");
  const readingTime = formatReadingTime(post.content);

  return (
    <article className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <h1>{post.title}</h1>
            {session && (
              <Link href={`/admin/posts/${post.id}/edit`} className={styles.editLink}>
                {t.edit}
              </Link>
            )}
          </div>
          <div className={styles.meta}>
            <span>{formatDate(post.publishedAt ?? post.createdAt, false, locale)}</span>
            <span>{post.author.firstName} {post.author.lastName}</span>
            {categories ? <span>{categories}</span> : null}
            {readingTime ? <span>{readingTime}</span> : null}
          </div>
          {post.excerpt ? <p className={styles.excerpt}>{post.excerpt}</p> : null}
        </header>

        <section className={styles.content}>
          <EditorRenderer content={post.content} locale={locale} />
        </section>

        {tags ? (
          <footer className={styles.footer}>
            <span>{t.tags}</span>
            <span>{tags}</span>
          </footer>
        ) : null}
      </div>
    </article>
  );
}
