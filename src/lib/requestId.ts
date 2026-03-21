import { NextResponse } from "next/server";

export const REQUEST_ID_HEADER = "x-request-id";

function normalizeRequestId(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  return normalized.slice(0, 120);
}

export function getOrCreateRequestId(headers: Headers): string {
  const existing = normalizeRequestId(headers.get(REQUEST_ID_HEADER));
  return existing ?? crypto.randomUUID();
}

export function setRequestIdHeader(response: NextResponse, requestId: string): NextResponse {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}
