import type { MetadataRoute } from "next";
import { captureException } from "@/lib/errorTracking";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await getSiteUrl();
  let posts: Array<{ slug: string; updatedAt: Date }> = [];
  try {
    posts = await prisma.post.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    });
  } catch (error) {
    captureException(error, { event: "sitemap_posts_fetch_failed" });
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: new URL("/", baseUrl).toString(),
      lastModified: new Date(),
    },
    {
      url: new URL("/blog", baseUrl).toString(),
      lastModified: new Date(),
    },
    {
      url: new URL("/about", baseUrl).toString(),
      lastModified: new Date(),
    },
    {
      url: new URL("/contact", baseUrl).toString(),
      lastModified: new Date(),
    },
    {
      url: new URL("/privacy", baseUrl).toString(),
      lastModified: new Date(),
    },
  ];

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: new URL(`/blog/${post.slug}`, baseUrl).toString(),
    lastModified: post.updatedAt,
  }));

  return [...staticRoutes, ...postRoutes];
}
