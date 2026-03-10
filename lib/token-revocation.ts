/**
 * In-memory JWT revocation store.
 *
 * Trade-offs:
 *  ✅ No DB migration required
 *  ✅ Sub-millisecond lookup
 *  ⚠️  Revoked tokens are forgotten on process restart (users must re-logout)
 *  ⚠️  Does not work across multiple Node.js processes (use Redis in production)
 *
 * For production multi-instance deployments, replace the Map with a Redis SET
 * using the token JTI as key and the expiry as TTL.
 *
 * Schema hint (if you prefer DB-backed revocation):
 *   model RevokedToken {
 *     jti       String   @id
 *     expiresAt DateTime
 *     @@index([expiresAt])
 *   }
 */

interface RevokedEntry {
  expiresAt: number // Unix ms
}

// Keyed by JTI (JWT ID) or, if absent, by "sub:iat" composite
const store = new Map<string, RevokedEntry>()

// Purge expired entries every 15 minutes to prevent memory growth
const PURGE_INTERVAL_MS = 15 * 60 * 1000
let purgeTimer: ReturnType<typeof setInterval> | null = null

function startPurge() {
  if (purgeTimer) return
  purgeTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of Array.from(store.entries())) {
      if (entry.expiresAt <= now) store.delete(key)
    }
  }, PURGE_INTERVAL_MS)
  // Allow the process to exit even if this timer is running
  if (purgeTimer.unref) purgeTimer.unref()
}

/**
 * Build a stable revocation key from JWT payload fields.
 * Prefers `jti`; falls back to `sub:iat` composite.
 */
export function revocationKey(payload: { jti?: string; id?: string; iat?: number }): string {
  if (payload.jti) return `jti:${payload.jti}`
  return `sub:${payload.id ?? 'unknown'}:iat:${payload.iat ?? 0}`
}

/**
 * Revoke a token. Call this on logout.
 * @param key      Output of revocationKey()
 * @param expiresAt Unix timestamp (seconds) from the JWT `exp` claim
 */
export function revokeToken(key: string, expiresAt: number): void {
  startPurge()
  store.set(key, { expiresAt: expiresAt * 1000 })
}

/**
 * Returns true if the token has been explicitly revoked.
 */
export function isTokenRevoked(key: string): boolean {
  const entry = store.get(key)
  if (!entry) return false
  if (entry.expiresAt <= Date.now()) {
    store.delete(key)
    return false
  }
  return true
}
