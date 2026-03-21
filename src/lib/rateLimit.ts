import { createClient } from "redis";
import { parseBoolean } from "@/lib/parsing";

const DEFAULT_WINDOW_SECONDS = Number(process.env.RATE_LIMIT_WINDOW_SEC ?? 900);
const DEFAULT_MAX_ATTEMPTS = Number(process.env.RATE_LIMIT_MAX ?? 5);

type MemoryEntry = { count: number; reset: number };

const globalForRateLimit = globalThis as unknown as {
  redisClient?: ReturnType<typeof createClient>;
  memoryStore?: Map<string, MemoryEntry>;
};

function getMemoryStore() {
  if (!globalForRateLimit.memoryStore) {
    globalForRateLimit.memoryStore = new Map();
  }
  return globalForRateLimit.memoryStore;
}

async function getRedisClient() {
  const url = process.env.REDIS_URL;
  if (!url) {
    return null;
  }

  if (globalForRateLimit.redisClient) {
    return globalForRateLimit.redisClient;
  }

  const client = createClient({ url });
  client.on("error", () => {});
  await client.connect();
  globalForRateLimit.redisClient = client;
  return client;
}

type RateLimitOptions = {
  windowSeconds?: number;
  maxAttempts?: number;
  namespace?: string;
};

function toPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export async function rateLimit(
  key: string,
  options: RateLimitOptions = {},
) {
  const windowSeconds = toPositiveInteger(options.windowSeconds, DEFAULT_WINDOW_SECONDS);
  const maxAttempts = toPositiveInteger(options.maxAttempts, DEFAULT_MAX_ATTEMPTS);
  const namespace = options.namespace?.trim() || "default";
  const scopedKey = `${namespace}:${key}`;
  const now = Date.now();
  const redis = await getRedisClient();

  if (redis) {
    const redisKey = `ratelimit:${scopedKey}`;
    const pipeline = redis.multi();
    pipeline.incr(redisKey);
    pipeline.ttl(redisKey);
    const results = await pipeline.exec();
    const count = Number(results?.[0] ?? 0);
    const ttl = Number(results?.[1] ?? -1);

    if (count === 1 || ttl === -1) {
      await redis.expire(redisKey, windowSeconds);
    }

    const remaining = Math.max(0, maxAttempts - count);
    return {
      allowed: count <= maxAttempts,
      remaining,
      reset: now + (ttl > 0 ? ttl * 1000 : windowSeconds * 1000),
    };
  }

  const store = getMemoryStore();
  const entry = store.get(scopedKey);
  if (!entry || entry.reset < now) {
    const newEntry = { count: 1, reset: now + windowSeconds * 1000 };
    store.set(scopedKey, newEntry);
    return { allowed: true, remaining: maxAttempts - 1, reset: newEntry.reset };
  }

  entry.count += 1;
  store.set(scopedKey, entry);

  return {
    allowed: entry.count <= maxAttempts,
    remaining: Math.max(0, maxAttempts - entry.count),
    reset: entry.reset,
  };
}

export function getClientIp(req?: { headers?: Headers | Record<string, string | string[]> }) {
  if (!req?.headers) {
    return "unknown";
  }

  const trustProxyHeaders = parseBoolean(
    process.env.RATE_LIMIT_TRUST_PROXY_HEADERS,
    process.env.NODE_ENV !== "production",
  );
  if (!trustProxyHeaders) {
    return "unknown";
  }

  const preferredHeader = (process.env.RATE_LIMIT_PREFERRED_IP_HEADER ?? "x-forwarded-for")
    .trim()
    .toLowerCase();

  const selectIp = (value: string | null | undefined) => value?.split(",")[0]?.trim() || "unknown";

  if (req.headers instanceof Headers) {
    const forwarded = selectIp(req.headers.get("x-forwarded-for"));
    const realIp = selectIp(req.headers.get("x-real-ip"));
    if (preferredHeader === "x-real-ip") {
      return realIp !== "unknown" ? realIp : forwarded;
    }
    return forwarded !== "unknown" ? forwarded : realIp;
  }

  const forwardedRaw = req.headers["x-forwarded-for"];
  const realIpRaw = req.headers["x-real-ip"];
  const forwarded = Array.isArray(forwardedRaw)
    ? selectIp(forwardedRaw[0])
    : typeof forwardedRaw === "string"
      ? selectIp(forwardedRaw)
      : "unknown";
  const realIp = Array.isArray(realIpRaw)
    ? selectIp(realIpRaw[0])
    : typeof realIpRaw === "string"
      ? selectIp(realIpRaw)
      : "unknown";
  if (preferredHeader === "x-real-ip") {
    return realIp !== "unknown" ? realIp : forwarded;
  }
  return forwarded !== "unknown" ? forwarded : realIp;
}
