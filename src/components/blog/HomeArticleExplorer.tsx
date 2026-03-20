"use client";

import ArticleCard from "./ArticleCard";
import { useHomeSearch } from "./HomeSearchProvider";
import styles from "./HomeArticleExplorer.module.css";

export default function HomeArticleExplorer({ locale = "tr" }: { locale?: "tr" | "en" }) {
  const { posts } = useHomeSearch();

  return (
    <div className={styles.wrapper}>
      <div className={styles.articles}>
        {posts.map((post, index) => (
          <ArticleCard key={post.id} post={post} isLatest={index === 0} locale={locale} />
        ))}
      </div>
    </div>
  );
}
