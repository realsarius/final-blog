import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";

type AdminApiMessages = {
  sessionRequired: string;
  forbidden: string;
};

const MESSAGES_BY_LOCALE: Record<Locale, AdminApiMessages> = {
  tr: {
    sessionRequired: "Oturum gerekli.",
    forbidden: "Yetkiniz yok.",
  },
  en: {
    sessionRequired: "Session required.",
    forbidden: "You are not authorized.",
  },
};

type AdminApiAuthResult =
  | {
    userId: string;
    userEmail: string | null;
    error: null;
  }
  | {
    userId: null;
    userEmail: null;
    error: NextResponse<unknown>;
  };

export async function requireAdminApiSession(locale: Locale = "tr"): Promise<AdminApiAuthResult> {
  const messages = MESSAGES_BY_LOCALE[locale] ?? MESSAGES_BY_LOCALE.tr;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      userId: null,
      userEmail: null,
      error: NextResponse.json({ ok: false, error: messages.sessionRequired }, { status: 401 }),
    };
  }

  if (session.user.role !== "ADMIN") {
    return {
      userId: null,
      userEmail: null,
      error: NextResponse.json({ ok: false, error: messages.forbidden }, { status: 403 }),
    };
  }

  return {
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    error: null,
  };
}
