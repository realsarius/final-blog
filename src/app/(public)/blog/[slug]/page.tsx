import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import styles from "./page.module.css";

interface PageProps {
  params: { slug: string };
}

export default async function BlogDetailPage({ params }: PageProps) {
  const post = await prisma.post.findUnique({
    where: { slug: params.slug },
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
  const paragraphs = post.content
    ? post.content.split(/\n\n+/).map((block) => block.trim())
    : [];

  return (
    <article className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <h1>{post.title}</h1>
          <div className={styles.meta}>
            <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
            <span>{post.author.firstName} {post.author.lastName}</span>
            {categories ? <span>{categories}</span> : null}
          </div>
          {post.excerpt ? <p className={styles.excerpt}>{post.excerpt}</p> : null}
        </header>

        <section className={styles.content}>
          {paragraphs.length === 0 ? (
            <p>İçerik yakında eklenecek.</p>
          ) : (
            paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))
          )}
        </section>

        {tags ? (
          <footer className={styles.footer}>
            <span>Etiketler:</span>
            <span>{tags}</span>
          </footer>
        ) : null}
      </div>
    </article>
  );
}
