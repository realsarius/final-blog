import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
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

async function requireAdmin() {
  const locale = await getServerLocale();
  const t = locale === "en"
    ? { sessionRequired: "Session required.", forbidden: "You are not authorized." }
    : { sessionRequired: "Oturum gerekli.", forbidden: "Yetkiniz yok." };
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: t.sessionRequired }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: t.forbidden }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  const authError = await requireAdmin();
  if (authError) {
    return authError;
  }

  const url = new URL(request.url);
  const query = normalizeQuery(url.searchParams.get("q"));
  const page = toPositiveInt(url.searchParams.get("page"), 1);
  const limit = normalizeLimit(url.searchParams.get("limit"));
  const skip = (page - 1) * limit;

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

  const [totalCount, items] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
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
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const safePage = Math.min(page, totalPages);

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
