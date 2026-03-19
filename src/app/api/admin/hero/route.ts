import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type HeroSlidePayload = {
  imageUrl?: unknown;
  postId?: unknown;
};

type HeroSettingsPayload = {
  autoplaySeconds?: unknown;
  transitionDirection?: unknown;
};

const DEFAULT_AUTOPLAY_SECONDS = 10;
const MIN_AUTOPLAY_SECONDS = 2;
const MAX_AUTOPLAY_SECONDS = 60;

function normalizeImageUrl(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("/") || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return "";
}

function normalizePostId(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeAutoplaySeconds(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_AUTOPLAY_SECONDS;
  }
  return Math.min(MAX_AUTOPLAY_SECONDS, Math.max(MIN_AUTOPLAY_SECONDS, Math.round(value)));
}

function normalizeTransitionDirection(value: unknown): "left" | "right" {
  return value === "right" ? "right" : "left";
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Oturum gerekli." }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Yetkiniz yok." }, { status: 403 });
  }
  return null;
}

function getHeroSlideModel() {
  return (prisma as unknown as {
    heroSlide?: {
      findMany: (args: unknown) => Promise<unknown[]>;
      updateMany: (args: unknown) => Promise<unknown>;
      deleteMany: (args?: unknown) => Promise<unknown>;
      createMany: (args: unknown) => Promise<unknown>;
    };
  }).heroSlide;
}

function getHeroConfigModel() {
  return (prisma as unknown as {
    heroConfig?: {
      findUnique: (args: unknown) => Promise<{ autoplaySeconds: number; transitionDirection: string } | null>;
      upsert: (args: unknown) => Promise<unknown>;
    };
  }).heroConfig;
}

export async function GET() {
  const authError = await requireAdmin();
  if (authError) {
    return authError;
  }
  const heroSlideModel = getHeroSlideModel();
  const heroConfigModel = getHeroConfigModel();
  if (!heroSlideModel?.findMany) {
    return NextResponse.json({
      ok: true,
      slides: [],
      settings: {
        autoplaySeconds: DEFAULT_AUTOPLAY_SECONDS,
        transitionDirection: "left",
      },
    });
  }

  const slides = await heroSlideModel.findMany({
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
          status: true,
        },
      },
    },
  });

  let settings = {
    autoplaySeconds: DEFAULT_AUTOPLAY_SECONDS,
    transitionDirection: "left" as const,
  };
  if (heroConfigModel?.findUnique) {
    try {
      const config = await heroConfigModel.findUnique({
        where: { id: "default" },
        select: {
          autoplaySeconds: true,
          transitionDirection: true,
        },
      });
      if (config) {
        settings = {
          autoplaySeconds: normalizeAutoplaySeconds(config.autoplaySeconds),
          transitionDirection: normalizeTransitionDirection(config.transitionDirection),
        };
      }
    } catch {
      settings = {
        autoplaySeconds: DEFAULT_AUTOPLAY_SECONDS,
        transitionDirection: "left",
      };
    }
  }

  return NextResponse.json({ ok: true, slides, settings });
}

export async function PUT(request: Request) {
  const authError = await requireAdmin();
  if (authError) {
    return authError;
  }
  const heroSlideModel = getHeroSlideModel();
  const heroConfigModel = getHeroConfigModel();
  if (!heroSlideModel) {
    return NextResponse.json(
      {
        ok: false,
        error: "Hero altyapısı henüz hazır değil. Prisma generate/migration sonrası geliştirme sunucusunu yeniden başlatın.",
      },
      { status: 503 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const rawSlides = payload && typeof payload === "object" && "slides" in payload
    ? (payload as { slides?: unknown }).slides
    : null;
  const rawSettings = payload && typeof payload === "object" && "settings" in payload
    ? (payload as { settings?: unknown }).settings
    : null;

  if (!Array.isArray(rawSlides)) {
    return NextResponse.json({ ok: false, error: "slides dizisi zorunlu." }, { status: 400 });
  }

  const slides = rawSlides
    .map((item) => {
      const typed = item as HeroSlidePayload;
      return {
        imageUrl: normalizeImageUrl(typed.imageUrl),
        postId: normalizePostId(typed.postId),
      };
    })
    .filter((item) => item.imageUrl);
  const settingsPayload = (rawSettings && typeof rawSettings === "object" ? rawSettings : {}) as HeroSettingsPayload;
  const settings = {
    autoplaySeconds: normalizeAutoplaySeconds(settingsPayload.autoplaySeconds),
    transitionDirection: normalizeTransitionDirection(settingsPayload.transitionDirection),
  };

  if (slides.length === 0) {
    await heroSlideModel.updateMany({ data: { isActive: false } });
    if (heroConfigModel?.upsert) {
      await heroConfigModel.upsert({
        where: { id: "default" },
        update: settings,
        create: {
          id: "default",
          ...settings,
        },
      });
    }
    return NextResponse.json({ ok: true, slides: [], settings });
  }

  const postIds = Array.from(new Set(slides.map((item) => item.postId).filter((value): value is string => Boolean(value))));
  if (postIds.length > 0) {
    const count = await prisma.post.count({
      where: {
        id: { in: postIds },
        status: "PUBLISHED",
      },
    });

    if (count !== postIds.length) {
      return NextResponse.json({ ok: false, error: "Seçilen yazılardan biri geçersiz." }, { status: 400 });
    }
  }

  await prisma.$transaction(async (tx) => {
    const txHeroSlide = (tx as unknown as {
      heroSlide: {
        deleteMany: (args?: unknown) => Promise<unknown>;
        createMany: (args: unknown) => Promise<unknown>;
        create: (args: unknown) => Promise<unknown>;
      };
    }).heroSlide;
    const txHeroConfig = (tx as unknown as {
      heroConfig?: {
        upsert: (args: unknown) => Promise<unknown>;
      };
    }).heroConfig;

    await txHeroSlide.deleteMany();
    const data = slides.slice(0, 10).map((item, index) => ({
      imageUrl: item.imageUrl,
      postId: item.postId,
      sortOrder: index,
      isActive: true,
    }));

    if (typeof txHeroSlide.createMany === "function") {
      await txHeroSlide.createMany({ data });
      return;
    }

    for (const item of data) {
      await txHeroSlide.create({ data: item });
    }

    if (txHeroConfig?.upsert) {
      await txHeroConfig.upsert({
        where: { id: "default" },
        update: settings,
        create: {
          id: "default",
          ...settings,
        },
      });
    }
  });

  const fresh = await heroSlideModel.findMany({
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
  });

  return NextResponse.json({ ok: true, slides: fresh, settings });
}
