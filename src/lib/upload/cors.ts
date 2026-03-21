import { NextResponse } from "next/server";
import { parseBoolean } from "@/lib/parsing";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "@/lib/requestId";
import { CORS_HEADERS, CORS_METHODS } from "@/lib/upload/constants";

function parseOrigin(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function parseAllowedOrigins(value: string | undefined): Set<string> {
  const origins = (value ?? "")
    .split(",")
    .map((item) => parseOrigin(item.trim()))
    .filter((item): item is string => Boolean(item));
  return new Set(origins);
}

function isPrivateNetworkOrigin(origin: string): boolean {
  return /^https?:\/\/(?:localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?::\d+)?$/i.test(origin);
}

export function resolveCorsHeaders(request: Request): HeadersInit {
  const requestOrigin = parseOrigin(request.headers.get("origin"));
  if (!requestOrigin) {
    return {};
  }

  const allowPrivateNetworkOrigins = parseBoolean(process.env.UPLOAD_CORS_ALLOW_PRIVATE_NETWORK, false);
  const allowedOrigins = parseAllowedOrigins(process.env.UPLOAD_CORS_ALLOWED_ORIGINS);
  const appOrigin = parseOrigin(process.env.NEXTAUTH_URL);
  const publicSiteOrigin = parseOrigin(process.env.NEXT_PUBLIC_SITE_URL);

  if (appOrigin) {
    allowedOrigins.add(appOrigin);
  }
  if (publicSiteOrigin) {
    allowedOrigins.add(publicSiteOrigin);
  }

  const isAllowed = allowedOrigins.has(requestOrigin)
    || (allowPrivateNetworkOrigins && isPrivateNetworkOrigin(requestOrigin));

  if (!isAllowed) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": requestOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": CORS_METHODS,
    "Access-Control-Allow-Headers": CORS_HEADERS,
    "Vary": "Origin",
  };
}

export function withCors(request: Request, response: NextResponse) {
  const corsHeaders = resolveCorsHeaders(request);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set(REQUEST_ID_HEADER, getOrCreateRequestId(request.headers));
  return response;
}

export function jsonWithCors(request: Request, body: unknown, init?: ResponseInit) {
  return withCors(request, NextResponse.json(body, init));
}
