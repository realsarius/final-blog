import { createClient } from "redis";

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

  if (req.headers instanceof Headers) {
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    return forwarded?.split(",")[0]?.trim() || realIp || "unknown";
  }

  const forwarded = req.headers["x-forwarded-for"];
  if (Array.isArray(forwarded)) {
    return forwarded[0]?.split(",")[0]?.trim() || "unknown";
  }
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  const realIp = req.headers["x-real-ip"];
  if (Array.isArray(realIp)) {
    return realIp[0] ?? "unknown";
  }
  if (typeof realIp === "string") {
    return realIp || "unknown";
  }

  return "unknown";
}
