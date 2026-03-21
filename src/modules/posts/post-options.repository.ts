import { prisma } from "@/lib/prisma";

export function buildPublishedPostOptionsWhere(query: string) {
  return {
    status: "PUBLISHED" as const,
    ...(query
      ? {
        OR: [
          { title: { contains: query, mode: "insensitive" as const } },
          { excerpt: { contains: query, mode: "insensitive" as const } },
          { slug: { contains: query, mode: "insensitive" as const } },
        ],
      }
      : {}),
  };
}

export async function countPublishedPostOptions(where: ReturnType<typeof buildPublishedPostOptionsWhere>) {
  return prisma.post.count({ where });
}

export async function findPublishedPostOptions(params: {
  where: ReturnType<typeof buildPublishedPostOptionsWhere>;
  skip: number;
  limit: number;
}) {
  return prisma.post.findMany({
    where: params.where,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    skip: params.skip,
    take: params.limit,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImageUrl: true,
      featured: true,
    },
  });
}
