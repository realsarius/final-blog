import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/format";
import { getContentText } from "@/lib/content";
import { formatReadingTime } from "@/lib/readingTime";
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
  locale?: "tr" | "en";
}

export default function ArticleCard({
  post,
  isLatest = false,
  commentCount = null,
  locale = "tr",
}: ArticleCardProps) {
  const t = locale === "en"
    ? { latest: "Latest", comments: "Comments", readMore: "Read more" }
    : { latest: "Son Yazı", comments: "Yorum", readMore: "Devamını oku" };
  const categoryName = post.categories[0]?.category.name ?? null;
  const hasImage = Boolean(post.coverImageUrl);
  const fallbackExcerpt = getContentText(post.content ?? "");
  const manualExcerpt = getContentText(post.excerpt ?? "");
  const excerptSource = manualExcerpt || fallbackExcerpt;
  const excerptText = excerptSource.length > 0 ? `${excerptSource.slice(0, 240).trim()}...` : null;
  const readingTime = formatReadingTime(post.content ?? "");

  return (
    <article className={`${styles.card} ${hasImage ? styles.hasImage : styles.noImage}`}>
      {post.coverImageUrl && (
        <Link href={`/blog/${post.slug}`} className={styles.imageWrap}>
          <Image
            src={post.coverImageUrl}
            alt={post.title}
            fill
            sizes="(max-width: 600px) 100vw, 220px"
            className={styles.image}
          />
        </Link>
      )}
      <div className={styles.body}>
        {isLatest && <span className={styles.latest}>{t.latest}</span>}
        {categoryName && <span className={styles.category}>{categoryName}</span>}
        <h3 className={styles.title}>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>
        <div className={styles.meta}>
          <span>{formatDate(post.publishedAt ?? post.createdAt, false, locale)}</span>
          {readingTime ? <span>{readingTime}</span> : null}
          {typeof commentCount === "number" ? (
            <span>{commentCount} {t.comments}</span>
          ) : null}
        </div>
        {excerptText ? <p className={styles.excerpt}>{excerptText}</p> : null}
        <Link href={`/blog/${post.slug}`} className={styles.readMore}>
          {t.readMore}
        </Link>
      </div>
    </article>
  );
}
