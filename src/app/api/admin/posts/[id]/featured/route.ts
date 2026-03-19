import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

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

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin();
  if (authError) {
    return authError;
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Post id gerekli." }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Gecersiz istek govdesi." }, { status: 400 });
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
    return NextResponse.json({ ok: false, error: "Yazi guncellenemedi." }, { status: 404 });
  }
}
