import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Metadata } from "next";
import styles from "./page.module.css";
import CategoryNav from "@/components/layout/CategoryNav";
import AuthorCard from "@/components/sidebar/AuthorCard";
import NewsletterWidget from "@/components/sidebar/NewsletterWidget";
import PopularSection from "@/components/sidebar/PopularSection";
import ScrollClassToggler from "@/components/layout/ScrollClassToggler";
import HomeArticleExplorer from "@/components/blog/HomeArticleExplorer";
import BackToTopButton from "@/components/layout/BackToTopButton";
import HomeSearchProvider, { type HomeSearchPost } from "@/components/blog/HomeSearchProvider";
import SidebarArticleSearch from "@/components/sidebar/SidebarArticleSearch";
import HomeHeroOverlay from "./HomeHeroOverlay";

type HeroTransitionDirection = "left" | "right";

export const metadata: Metadata = {
  title: "Ana Sayfa",
  description: "Doğadan ilham alan hikayeler, notlar ve son yayınlanan yazılar.",
};

export default async function HomePage() {
  const sessionPromise = getServerSession(authOptions);
  const postsPromise = prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 6,
    include: {
      author: true,
      categories: { include: { category: true } },
    },
  });
  const availablePostsPromise = prisma.post.findMany({
    where: {
      status: "PUBLISHED",
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 40,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImageUrl: true,
      featured: true,
    },
  });

  const [session, posts, availablePosts] = await Promise.all([
    sessionPromise,
    postsPromise,
    availablePostsPromise,
  ]);
  const isAdmin = session?.user?.role === "ADMIN";

  const latestPosts = posts.slice(0, 6);
  const popularPosts = posts.slice(0, 4);
  const author = posts[0]?.author ?? null;

  type HeroSlideRecord = {
    id: string;
    imageUrl: string;
    postId: string | null;
    titleColorLeft: string | null;
    titleColorRight: string | null;
    post: { id: string; title: string; slug: string; excerpt: string | null; coverImageUrl: string | null } | null;
  };
  type HeroConfigRecord = {
    autoplaySeconds: number;
    transitionDirection: string;
  };
  let persistedHeroSlides: HeroSlideRecord[] = [];
  let persistedHeroConfig: HeroConfigRecord | null = null;
  const heroSlideModel = (prisma as unknown as {
    heroSlide?: {
      findMany: (args: unknown) => Promise<HeroSlideRecord[]>;
    };
  }).heroSlide;
  const heroConfigModel = (prisma as unknown as {
    heroConfig?: {
      findUnique: (args: unknown) => Promise<HeroConfigRecord | null>;
    };
  }).heroConfig;
  const [heroSlidesResult, heroConfigResult] = await Promise.all([
    heroSlideModel?.findMany
      ? heroSlideModel.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          post: {
            select: {
              id: true,
              title: true,
              slug: true,
              excerpt: true,
              coverImageUrl: true,
            },
          },
        },
        take: 10,
      }).catch(() => [])
      : Promise.resolve<HeroSlideRecord[]>([]),
    heroConfigModel?.findUnique
      ? heroConfigModel.findUnique({
        where: { id: "default" },
        select: {
          autoplaySeconds: true,
          transitionDirection: true,
        },
      }).catch(() => null)
      : Promise.resolve<HeroConfigRecord | null>(null),
  ]);

  if (heroSlidesResult.length > 0) {
    persistedHeroSlides = heroSlidesResult;
  }
  persistedHeroConfig = heroConfigResult;

  const fallbackSlides = availablePosts
    .filter((post) => post.featured && post.coverImageUrl)
    .map((post) => ({
      imageUrl: post.coverImageUrl ?? "",
      postId: post.id,
      postTitle: post.title,
      postSlug: post.slug,
      postExcerpt: post.excerpt,
      postCoverImageUrl: post.coverImageUrl,
    }));

  const heroSlides = persistedHeroSlides.length > 0
    ? persistedHeroSlides.map((slide) => ({
      id: slide.id,
      imageUrl: slide.imageUrl,
      postId: slide.postId,
      titleColorLeft: slide.titleColorLeft,
      titleColorRight: slide.titleColorRight,
      postTitle: slide.post?.title ?? null,
      postSlug: slide.post?.slug ?? null,
      postExcerpt: slide.post?.excerpt ?? null,
      postCoverImageUrl: slide.post?.coverImageUrl ?? null,
    }))
    : (fallbackSlides.length > 0
      ? fallbackSlides
      : availablePosts.filter((post) => Boolean(post.coverImageUrl)).slice(0, 5).map((post) => ({
        imageUrl: post.coverImageUrl ?? "",
        postId: post.id,
        postTitle: post.title,
        postSlug: post.slug,
        postExcerpt: post.excerpt,
        postCoverImageUrl: post.coverImageUrl,
      })));
  const heroSettings = {
    autoplaySeconds: Math.min(60, Math.max(2, persistedHeroConfig?.autoplaySeconds ?? 10)),
    transitionDirection: (persistedHeroConfig?.transitionDirection === "right" ? "right" : "left") as HeroTransitionDirection,
  };
  const explorerPosts: HomeSearchPost[] = latestPosts.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    coverImageUrl: post.coverImageUrl,
    publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
    createdAt: post.createdAt.toISOString(),
    categories: post.categories,
  }));

  return (
    <div className={styles.page}>
      <ScrollClassToggler threshold={140} />
      <BackToTopButton />
      {/* Hero */}
      <section id="home-hero" className={styles.heroSection}>
        <HomeHeroOverlay
          initialSlides={heroSlides}
          initialSettings={heroSettings}
          availablePosts={availablePosts}
          isAdmin={isAdmin}
        />
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
              <AuthorCard author={author} isEditable={isAdmin} />
            </div>
          )}
        </div>
      </section>

      <CategoryNav />

      <div className="container">
        <HomeSearchProvider posts={explorerPosts}>
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
                <HomeArticleExplorer />
              )}
            </main>

            <aside className={styles.sidebar}>
              {author && (
                <div
                  className={styles.sidebarAuthor}
                  data-author-location="sidebar"
                  aria-hidden="true"
                >
                  <AuthorCard author={author} isEditable={isAdmin} />
                </div>
              )}
              <div className={styles.sidebarStack}>
                {latestPosts.length > 0 ? <SidebarArticleSearch /> : null}
                <NewsletterWidget />
                <PopularSection posts={popularPosts} />
              </div>
            </aside>
          </div>
        </HomeSearchProvider>
      </div>
    </div>
  );
}
