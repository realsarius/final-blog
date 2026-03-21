import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/adminApiAuth";
import { getServerLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

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
  const auth = await requireAdminApiSession(locale);
  if (auth.error) {
    return auth.error;
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
