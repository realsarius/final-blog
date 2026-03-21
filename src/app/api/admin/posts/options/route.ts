import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/adminApiAuth";
import { prisma } from "@/lib/prisma";
import { getServerLocale } from "@/lib/i18n";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 12;
const MIN_LIMIT = 5;
const MAX_LIMIT = 40;

function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(1, Math.floor(parsed));
}

function normalizeLimit(value: string | null) {
  const parsed = toPositiveInt(value, DEFAULT_LIMIT);
  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, parsed));
}

function normalizeQuery(value: string | null) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, 120);
}

export async function GET(request: Request) {
  const locale = await getServerLocale();
  const auth = await requireAdminApiSession(locale);
  if (auth.error) {
    return auth.error;
  }

  const url = new URL(request.url);
  const query = normalizeQuery(url.searchParams.get("q"));
  const requestedPage = toPositiveInt(url.searchParams.get("page"), 1);
  const limit = normalizeLimit(url.searchParams.get("limit"));

  const where = {
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

  const totalCount = await prisma.post.count({ where });

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const safePage = Math.min(requestedPage, totalPages);
  const skip = (safePage - 1) * limit;

  const items = await prisma.post.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImageUrl: true,
      featured: true,
    },
  });

  return NextResponse.json({
    ok: true,
    items,
    page: safePage,
    limit,
    totalCount,
    totalPages,
    query,
  });
}
