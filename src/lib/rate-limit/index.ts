import "server-only";

/**
 * Rate-limit primitives.
 *
 * The interface is deliberately small so a future Upstash / Redis adapter
 * can be dropped in by implementing one function: `RateLimitStore.hit`.
 *
 * Window semantics: sliding count over the past `windowMs`. We don't use
 * the fancier token-bucket; for guarding paid AI APIs the simpler model
 * is easier to reason about and easier to swap.
 *
 * Identity (the "who" being limited) is the caller's responsibility —
 * usually `<userId>:<route>` for authenticated users, or `<ip>:<route>`
 * for unauthenticated paths. Build it with `buildRateLimitKey` below.
 */

export interface RateLimitResult {
  /** True when the request is within the allowance. */
  ok: boolean;
  /** Total allowance for this window (echoed for response headers). */
  limit: number;
  /** Remaining requests in the current window (>= 0). */
  remaining: number;
  /** Seconds until the limit resets (only meaningful when !ok). */
  resetSeconds: number;
  /** ms epoch when the window resets. */
  resetAt: number;
}

export interface RateLimitStore {
  /**
   * Atomically record a hit against `key` and report whether the caller
   * is within `limit` over the most recent `windowMs`.
   */
  hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

// ─────────────────────────────────────────────────────────────────
// In-memory store (default; single-instance only)
// ─────────────────────────────────────────────────────────────────
interface MemoryWindow {
  /** Timestamps (ms) of hits inside the active window. */
  hits: number[];
}

class MemoryStore implements RateLimitStore {
  private buckets = new Map<string, MemoryWindow>();

  async hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const cutoff = now - windowMs;

    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { hits: [] };
      this.buckets.set(key, bucket);
    }

    // Drop expired hits.
    while (bucket.hits.length > 0 && bucket.hits[0] < cutoff) {
      bucket.hits.shift();
    }

    const used = bucket.hits.length;
    if (used >= limit) {
      const oldest = bucket.hits[0] ?? now;
      const resetAt = oldest + windowMs;
      return {
        ok: false,
        limit,
        remaining: 0,
        resetSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
        resetAt,
      };
    }

    bucket.hits.push(now);
    // Lightweight garbage collection — bounded by N keys * N hits, but
    // we still want to keep the Map from growing unbounded across cold
    // keys that never come back.
    if (this.buckets.size > 5_000) {
      this.maybeSweep(cutoff);
    }

    return {
      ok: true,
      limit,
      remaining: Math.max(0, limit - bucket.hits.length),
      resetSeconds: Math.ceil(windowMs / 1000),
      resetAt: now + windowMs,
    };
  }

  private maybeSweep(cutoff: number) {
    for (const [k, v] of this.buckets) {
      if (v.hits.length === 0 || v.hits[v.hits.length - 1] < cutoff) {
        this.buckets.delete(k);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// Module-level singleton with HMR-survival in dev
// ─────────────────────────────────────────────────────────────────
const globalForLimiter = globalThis as unknown as {
  __medisoftRateLimitStore?: RateLimitStore;
};
const store: RateLimitStore =
  globalForLimiter.__medisoftRateLimitStore ?? new MemoryStore();
if (process.env.NODE_ENV !== "production") {
  globalForLimiter.__medisoftRateLimitStore = store;
}

// ─────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────
export interface RateLimitPolicy {
  /** Friendly identifier — used in keys + observability. */
  id: string;
  /** Max requests within the window. */
  limit: number;
  /** Sliding window length in milliseconds. */
  windowMs: number;
}

/** Cost / quota-protection limits for the paid AI endpoints. */
export const POLICIES = {
  /** Whisper transcription — 10 per minute is generous for clinical use. */
  AI_TRANSCRIBE: { id: "ai_transcribe", limit: 10, windowMs: 60_000 },
  /** Gemini SOAP / lab narrative / scan analysis — same tier. */
  AI_GEMINI: { id: "ai_gemini", limit: 10, windowMs: 60_000 },
  /** Drug safety analysis — runs OpenFDA + Gemini; same tier. */
  PHARMAX_ANALYZE: { id: "pharmax_analyze", limit: 20, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitPolicy>;

/**
 * Build a deterministic rate-limit key from an actor identifier and a
 * policy id. Use the authenticated user id where possible; fall back
 * to the request IP otherwise.
 */
export function buildRateLimitKey(actorId: string, policyId: string): string {
  return `${policyId}:${actorId}`;
}

/**
 * Take a single hit against the given policy for the given actor.
 *
 * Always returns a structured result — never throws. Callers turn this
 * into the appropriate response (429 for HTTP, error object for actions).
 */
export async function checkRateLimit(
  actorId: string,
  policy: RateLimitPolicy,
): Promise<RateLimitResult> {
  const key = buildRateLimitKey(actorId, policy.id);
  return store.hit(key, policy.limit, policy.windowMs);
}

// ─────────────────────────────────────────────────────────────────
// Test-only reset (exported because vitest needs it; harmless in prod)
// ─────────────────────────────────────────────────────────────────
export function _resetForTests(): void {
  if (store instanceof MemoryStore) {
    (store as unknown as { buckets: Map<string, MemoryWindow> }).buckets.clear();
  }
}
