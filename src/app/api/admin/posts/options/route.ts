import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/adminApiAuth";
import { getServerLocale } from "@/lib/i18n";
import { getPublishedPostOptions } from "@/modules/posts/post-options.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const locale = await getServerLocale();
  const auth = await requireAdminApiSession(locale);
  if (auth.error) {
    return auth.error;
  }

  const url = new URL(request.url);
  const result = await getPublishedPostOptions(url.searchParams);

  return NextResponse.json({
    ok: true,
    items: result.items,
    page: result.page,
    limit: result.limit,
    totalCount: result.totalCount,
    totalPages: result.totalPages,
    query: result.query,
  });
}
