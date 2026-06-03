/**
 * API Rate Limiter — sliding-window in-memory rate limiting for middleware.
 *
 * Unlike the main `rate-limit/index.ts` (which uses `import "server-only"`
 * and is async), this module is designed to run inside Next.js Edge
 * Middleware where `server-only` is not available and synchronous access
 * is preferred.
 *
 * The in-memory Map is scoped to the middleware runtime; in production
 * with multiple instances you would swap this for a Redis/Upstash adapter.
 */

// ─────────────────────────────────────────────────────────────────
// Sliding-window store
// ─────────────────────────────────────────────────────────────────
interface Window {
  /** Timestamps (ms) of hits inside the active window. */
  hits: number[];
}

const windows = new Map<string, Window>();

/** Lightweight GC — runs when the map grows past this threshold. */
const MAX_KEYS = 10_000;

function maybeSweep(cutoff: number) {
  for (const [k, v] of windows) {
    if (v.hits.length === 0 || v.hits[v.hits.length - 1] < cutoff) {
      windows.delete(k);
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// Policies
// ─────────────────────────────────────────────────────────────────
export const POLICIES = {
  /** 100 requests / minute per IP — general API routes. */
  general: { maxRequests: 100, windowMs: 60_000 },
  /** 20 requests / minute per user/IP — AI-heavy endpoints. */
  ai: { maxRequests: 20, windowMs: 60_000 },
  /** 5 requests / minute per IP — auth endpoints (login, register). */
  auth: { maxRequests: 5, windowMs: 60_000 },
} as const;

export type PolicyName = keyof typeof POLICIES;

export interface RateLimitCheckResult {
  /** `true` when the request is allowed. */
  ok: boolean;
  /** How many requests remain in this window. */
  remaining: number;
  /** Unix-ms epoch when the window resets. */
  resetAt: number;
}

// ─────────────────────────────────────────────────────────────────
// Core check
// ─────────────────────────────────────────────────────────────────

/**
 * Record a hit and check whether the caller is within the allowance.
 *
 * @param key    Unique caller identifier, e.g. `"general:<ip>"`.
 * @param policy Which policy bucket to apply.
 * @returns      Result with `ok`, `remaining`, and `resetAt`.
 */
export function checkRateLimit(
  key: string,
  policy: PolicyName,
): RateLimitCheckResult {
  const { maxRequests, windowMs } = POLICIES[policy];
  const now = Date.now();
  const cutoff = now - windowMs;

  let bucket = windows.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    windows.set(key, bucket);
  }

  // Drop expired hits.
  while (bucket.hits.length > 0 && bucket.hits[0] < cutoff) {
    bucket.hits.shift();
  }

  // Over limit?
  if (bucket.hits.length >= maxRequests) {
    const oldest = bucket.hits[0] ?? now;
    const resetAt = oldest + windowMs;
    return { ok: false, remaining: 0, resetAt };
  }

  // Record the hit.
  bucket.hits.push(now);

  // Lightweight GC.
  if (windows.size > MAX_KEYS) {
    maybeSweep(cutoff);
  }

  return {
    ok: true,
    remaining: Math.max(0, maxRequests - bucket.hits.length),
    resetAt: now + windowMs,
  };
}

// ─────────────────────────────────────────────────────────────────
// Route → policy mapping
// ─────────────────────────────────────────────────────────────────

/** AI-route prefixes that get the stricter `ai` policy. */
const AI_PREFIXES = [
  "/api/medibot",
  "/api/google-health",
  "/api/mediscript",
  "/api/mediscan",
  "/api/medilab",
  "/api/pharmax",
];

/**
 * Determine which rate-limit policy applies for a given pathname.
 */
export function policyForPath(pathname: string): PolicyName {
  if (pathname.startsWith("/api/auth")) return "auth";
  for (const prefix of AI_PREFIXES) {
    if (pathname.startsWith(prefix)) return "ai";
  }
  return "general";
}
