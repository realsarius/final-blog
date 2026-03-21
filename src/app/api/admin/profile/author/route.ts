import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/adminApiAuth";
import { getServerLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function normalizeImageUrl(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("/") || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function clampFocus(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 50;
  }
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

export async function PUT(request: Request) {
  const locale = await getServerLocale();
  const auth = await requireAdminApiSession(locale);
  if (auth.error) {
    return auth.error;
  }
  if (!auth.userId) {
    return NextResponse.json({ ok: false, error: "Oturum gerekli." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Gecersiz istek govdesi." }, { status: 400 });
  }

  const data = payload && typeof payload === "object" ? payload as {
    avatarUrl?: unknown;
    avatarFocusX?: unknown;
    avatarFocusY?: unknown;
  } : {};

  const avatarUrl = normalizeImageUrl(data.avatarUrl);
  const avatarFocusX = clampFocus(data.avatarFocusX);
  const avatarFocusY = clampFocus(data.avatarFocusY);

  const updatePayload = {
    avatarUrl,
    avatarFocusX,
    avatarFocusY,
  };

  const selectPayload = {
    avatarUrl: true,
    avatarFocusX: true,
    avatarFocusY: true,
  };

  try {
    let updated: {
      avatarUrl: string | null;
      avatarFocusX: number;
      avatarFocusY: number;
    };

    try {
      updated = await prisma.user.update({
        where: { id: auth.userId },
        data: updatePayload,
        select: selectPayload,
      });
    } catch (errorById) {
      const maybeError = errorById as { code?: string };
      if (maybeError.code !== "P2025" || !auth.userEmail) {
        throw errorById;
      }
      updated = await prisma.user.update({
        where: { email: auth.userEmail },
        data: updatePayload,
        select: selectPayload,
      });
    }

    return NextResponse.json({ ok: true, author: updated });
  } catch (error) {
    const maybeError = error as { code?: string; message?: string };
    if (maybeError?.code === "P2025") {
      return NextResponse.json({ ok: false, error: "Yazar profili bulunamadi." }, { status: 404 });
    }

    console.error("[admin/profile/author] PUT failed", error);
    return NextResponse.json({ ok: false, error: "Profil kaydedilirken bir hata olustu." }, { status: 500 });
  }
}
