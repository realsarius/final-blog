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

export function validatePostOptionsQuery(searchParams: URLSearchParams) {
  const query = normalizeQuery(searchParams.get("q"));
  const requestedPage = toPositiveInt(searchParams.get("page"), 1);
  const limit = normalizeLimit(searchParams.get("limit"));
  return { query, requestedPage, limit };
}
