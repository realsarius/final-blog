import Link from "next/link";
import { formatDate } from "@/lib/format";
import styles from "./PopularSection.module.css";

interface PopularPost {
  id: string;
  title: string;
  slug: string;
  publishedAt: Date | null;
  createdAt: Date;
}

interface PopularSectionProps {
  posts: PopularPost[];
  locale?: "tr" | "en";
}

export default function PopularSection({ posts, locale = "tr" }: PopularSectionProps) {
  if (posts.length === 0) return null;
  const t = locale === "en"
    ? { heading: "Popular Posts" }
    : { heading: "Popüler Yazılar" };

  return (
    <div className={styles.section}>
      <h4 className={styles.heading}>{t.heading}</h4>
      <ol className={styles.list}>
        {posts.map((post) => (
          <li key={post.id} className={styles.item}>
            <div className={styles.itemContent}>
              <Link href={`/blog/${post.slug}`} className={styles.title}>
                {post.title}
              </Link>
              <span className={styles.date}>
                {formatDate(post.publishedAt ?? post.createdAt, false, locale)}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
