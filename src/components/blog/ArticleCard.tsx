import Link from "next/link";
import { formatDate } from "@/lib/format";
import styles from "./ArticleCard.module.css";

interface ArticleCardProps {
  post: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string;
    coverImageUrl: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    categories: Array<{ category: { name: string } }>;
  };
  isLatest?: boolean;
  commentCount?: number | null;
}

export default function ArticleCard({
  post,
  isLatest = false,
  commentCount = null,
}: ArticleCardProps) {
  const categoryName = post.categories[0]?.category.name ?? null;
  const hasImage = Boolean(post.coverImageUrl);
  const rawContent = post.content ?? "";
  const fallbackExcerpt = rawContent
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/[#>*_~\\-|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const excerptText =
    post.excerpt?.trim() ||
    (fallbackExcerpt.length > 0 ? fallbackExcerpt.slice(0, 240) : null);

  return (
    <article className={`${styles.card} ${hasImage ? styles.hasImage : styles.noImage}`}>
      {post.coverImageUrl && (
        <Link href={`/blog/${post.slug}`} className={styles.imageWrap}>
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className={styles.image}
          />
        </Link>
      )}
      <div className={styles.body}>
        {isLatest && <span className={styles.latest}>Son Yazı</span>}
        {categoryName && <span className={styles.category}>{categoryName}</span>}
        <h3 className={styles.title}>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>
        <div className={styles.meta}>
          <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
          {typeof commentCount === "number" ? (
            <span>{commentCount} Yorum</span>
          ) : null}
        </div>
        {excerptText ? <p className={styles.excerpt}>{excerptText}</p> : null}
        <Link href={`/blog/${post.slug}`} className={styles.readMore}>
          Devamını oku
        </Link>
      </div>
    </article>
  );
}
