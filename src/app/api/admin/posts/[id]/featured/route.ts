import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getServerLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

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

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const locale = await getServerLocale();
  const t = locale === "en"
    ? {
      missingId: "Post id is required.",
      invalidBody: "Invalid request body.",
      updateFailed: "Post could not be updated.",
    }
    : {
      missingId: "Post id gerekli.",
      invalidBody: "Gecersiz istek govdesi.",
      updateFailed: "Yazi guncellenemedi.",
    };
  const authError = await requireAdmin();
  if (authError) {
    return authError;
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ ok: false, error: t.missingId }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: t.invalidBody }, { status: 400 });
  }

  const featured = payload && typeof payload === "object" && "featured" in payload
    ? Boolean((payload as { featured?: unknown }).featured)
    : false;

  try {
    const post = await prisma.post.update({
      where: { id },
      data: { featured },
      select: { id: true, featured: true },
    });

    return NextResponse.json({ ok: true, post });
  } catch {
    return NextResponse.json({ ok: false, error: t.updateFailed }, { status: 404 });
  }
}
