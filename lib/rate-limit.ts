// Sliding-window rate limiter (in-memory, per process).
// For multi-instance deployments, replace with a Redis-based implementation.

interface WindowEntry {
  count: number
  resetAt: number
}

const store = new Map<string, WindowEntry>()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  entry.count += 1
  const remaining = Math.max(0, limit - entry.count)
  return { allowed: entry.count <= limit, remaining, resetAt: entry.resetAt }
}

// Periodic cleanup to avoid unbounded memory growth
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of store.entries()) {
    if (v.resetAt <= now) store.delete(k)
  }
}, 60_000)
