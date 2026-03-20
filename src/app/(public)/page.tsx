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
import { getServerLocale } from "@/lib/i18n";
import { getSiteName } from "@/lib/seo";

type HeroTransitionDirection = "left" | "right";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return locale === "en"
    ? { title: "Home", description: "Stories inspired by nature, notes, and latest published posts." }
    : { title: "Ana Sayfa", description: "Doğadan ilham alan hikayeler, notlar ve son yayınlanan yazılar." };
}

export default async function HomePage() {
  const locale = await getServerLocale();
  const siteName = await getSiteName();
  const [brandFirst, ...brandRest] = siteName.split(" ");
  const brandSecond = brandRest.join(" ") || brandFirst;
  const t = locale === "en"
    ? { latest: "Latest Posts", noPosts: "No published post yet." }
    : { latest: "Son Yazılar", noPosts: "Henüz yayınlanmış bir yazı yok." };
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
  const featuredPostsPromise = prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      featured: true,
      coverImageUrl: { not: null },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 20,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImageUrl: true,
      featured: true,
    },
  });
  const fallbackHeroPostsPromise = prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      coverImageUrl: { not: null },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 10,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImageUrl: true,
      featured: true,
    },
  });

  const [session, posts, featuredPosts, fallbackHeroPosts] = await Promise.all([
    sessionPromise,
    postsPromise,
    featuredPostsPromise,
    fallbackHeroPostsPromise,
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

  const fallbackSlides = featuredPosts
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
      : fallbackHeroPosts.slice(0, 5).map((post) => ({
        imageUrl: post.coverImageUrl ?? "",
        postId: post.id,
        postTitle: post.title,
        postSlug: post.slug,
        postExcerpt: post.excerpt,
        postCoverImageUrl: post.coverImageUrl,
      })));
  const heroSettings = {
    autoplaySeconds: Math.min(60, Math.max(2, persistedHeroConfig?.autoplaySeconds ?? 10)),
    transitionDirection: (
      persistedHeroConfig?.transitionDirection === "RIGHT"
        || persistedHeroConfig?.transitionDirection === "right"
        ? "right"
        : "left"
    ) as HeroTransitionDirection,
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
          initialPostOptions={featuredPosts.slice(0, 12)}
          isAdmin={isAdmin}
          locale={locale}
        />
        <div className={styles.heroGhost} aria-hidden="true">
          {brandFirst}<br />{brandSecond}
        </div>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <div className={styles.heroClipped}>
              {brandFirst}<br />{brandSecond}
            </div>
          </div>
          {author && (
            <div
              className={styles.heroAuthor}
              data-author-location="hero"
              aria-hidden="false"
            >
              <AuthorCard author={author} isEditable={isAdmin} locale={locale} />
            </div>
          )}
        </div>
      </section>

      <CategoryNav />

      <div className="container">
        <HomeSearchProvider posts={explorerPosts} locale={locale}>
          <div className={styles.contentGrid}>
            <main className={styles.mainCol}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{t.latest}</h2>
              </div>
              {latestPosts.length === 0 ? (
                <div className={styles.empty}>
                  <p>{t.noPosts}</p>
                </div>
              ) : (
                <HomeArticleExplorer locale={locale} />
              )}
            </main>

            <aside className={styles.sidebar}>
              {author && (
                <div
                  className={styles.sidebarAuthor}
                  data-author-location="sidebar"
                  aria-hidden="true"
                >
                  <AuthorCard author={author} isEditable={isAdmin} enableFlip locale={locale} />
                </div>
              )}
              <div className={styles.sidebarStack}>
                {latestPosts.length > 0 ? <SidebarArticleSearch locale={locale} /> : null}
                <NewsletterWidget locale={locale} />
                <PopularSection posts={popularPosts} locale={locale} />
              </div>
            </aside>
          </div>
        </HomeSearchProvider>
      </div>
    </div>
  );
}
