/**
 * In-process rate limiter — sliding window, keyed by arbitrary string (IP, email…).
 *
 * ⚠️  Single-process only. In a multi-replica deployment use Redis + a sliding
 *     window script, or an edge middleware rate limiter (e.g. @upstash/ratelimit).
 */

interface Bucket {
  count: number
  windowStart: number // Unix ms
}

const buckets = new Map<string, Bucket>()

// Purge stale entries every 5 minutes
const PURGE_INTERVAL_MS = 5 * 60 * 1000
let purgeTimer: ReturnType<typeof setInterval> | null = null

function startPurge(windowMs: number) {
  if (purgeTimer) return
  purgeTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, b] of Array.from(buckets.entries())) {
      if (now - b.windowStart > windowMs * 2) buckets.delete(key)
    }
  }, PURGE_INTERVAL_MS)
  if (purgeTimer.unref) purgeTimer.unref()
}

/**
 * Check if a key is within the allowed rate.
 * @param key        Identifier (e.g. IP address or email)
 * @param limit      Max requests per window
 * @param windowMs   Window size in milliseconds
 * @returns { allowed, remaining, resetAt }
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  startPurge(windowMs)

  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || now - existing.windowStart >= windowMs) {
    // New window
    buckets.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  existing.count++
  const remaining = Math.max(0, limit - existing.count)
  const resetAt = existing.windowStart + windowMs

  if (existing.count > limit) {
    return { allowed: false, remaining: 0, resetAt }
  }

  return { allowed: true, remaining, resetAt }
}
