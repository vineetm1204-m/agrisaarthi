// ──────────────────────────────────────────────
// Redis Client – caching + rate limiting
// ──────────────────────────────────────────────

import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL || "redis://localhost:6379";

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null; // Stop retrying
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  client.on("error", (err) => {
    if (process.env.NODE_ENV === "development") {
      // Silently fail in dev – we'll use in-memory fallback
    }
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

// ── In-memory fallback for when Redis is unavailable ──
const memoryCache = new Map<string, { value: string; expiry: number }>();

export async function cacheGet(key: string): Promise<string | null> {
  try {
    const result = await redis.get(key);
    if (result) return result;
  } catch {
    // Fall back to memory cache
    const entry = memoryCache.get(key);
    if (entry && Date.now() < entry.expiry) return entry.value;
    if (entry) memoryCache.delete(key);
  }
  return null;
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<void> {
  try {
    await redis.set(key, value, "EX", ttlSeconds);
  } catch {
    // Fall back to memory cache
    memoryCache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {
    memoryCache.delete(key);
  }
}

// ── Rate Limiter ──
export async function checkRateLimit(
  identifier: string,
  maxRequests = 100,
  windowSeconds = 60
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `ratelimit:${identifier}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSeconds;

  try {
    // Use sorted set for sliding window
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, now, `${now}:${Math.random()}`);
    pipeline.zcard(key);
    pipeline.expire(key, windowSeconds);
    const results = await pipeline.exec();

    const count = (results?.[2]?.[1] as number) || 0;
    const allowed = count <= maxRequests;
    const remaining = Math.max(0, maxRequests - count);

    return { allowed, remaining, resetAt: now + windowSeconds };
  } catch {
    // If Redis is down, allow the request (fail open)
    return { allowed: true, remaining: maxRequests, resetAt: now + windowSeconds };
  }
}
