import "server-only";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit, type RateLimitPolicy } from "@/lib/rate-limit";

/**
 * Shared session + rate-limit helpers used by every server action and
 * API route handler.
 *
 * Before this module: each action repeated this 3-step recipe:
 *   1) await auth.api.getSession({ headers: await headers() })
 *   2) check session?.user
 *   3) early-return on null
 *
 * Each route handler also re-derived the 401 envelope. Now there's
 * exactly one canonical implementation; routes drop from ~12 lines
 * of boilerplate to ~2.
 *
 * For consistency we expose two flavours:
 *   - requireSession() — used by server actions; returns a typed
 *     SessionResult union.
 *   - requireSessionApi() — used by route handlers; throws/returns
 *     a NextResponse on auth failure.
 */

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  role?: "physician" | "admin" | null;
  specialty?: string | null;
};

export type SessionResult =
  | { ok: true; user: SessionUser }
  | { ok: false; error: "unauthorized" };

/**
 * For server actions. Always returns — never throws — so the caller
 * can map to the action's `ActionResult` shape uniformly.
 *
 * Better-Auth's internal getSession can throw "Failed to get session"
 * when the DB connection drops, the session row was deleted, or the
 * session refresh fails. We catch that and return unauthorized so the
 * calling layout/action can redirect to /login instead of crashing.
 */
export async function requireSession(): Promise<SessionResult> {
  let session: Awaited<ReturnType<typeof auth.api.getSession>>;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch (err) {
    // Better-Auth throws APIError("Failed to get session") on DB errors
    // or stale/deleted sessions. Treat as unauthorized.
    console.warn(
      "[auth] getSession threw — treating as unauthorized:",
      err instanceof Error ? err.message : err,
    );
    return { ok: false, error: "unauthorized" };
  }

  if (!session?.user) return { ok: false, error: "unauthorized" };
  // Better-Auth's additionalFields land directly on `user` per its docs.
  const u = session.user as typeof session.user & {
    role?: "physician" | "admin" | null;
    specialty?: string | null;
    emailVerified?: boolean;
  };
  return {
    ok: true,
    user: {
      id: u.id,
      name: u.name ?? "",
      email: u.email,
      emailVerified: u.emailVerified,
      role: u.role ?? null,
      specialty: u.specialty ?? null,
    },
  };
}

/**
 * For route handlers. Returns either the user or a fully-formed 401
 * NextResponse the caller should `return` immediately.
 */
export async function requireSessionApi(): Promise<
  { user: SessionUser } | { response: NextResponse }
> {
  const r = await requireSession();
  if (!r.ok) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user: r.user };
}

// ─────────────────────────────────────────────────────────────────
// Rate-limit guard (companion helper)
// ─────────────────────────────────────────────────────────────────

/**
 * Apply a rate-limit policy keyed on the authenticated user. Returns
 * either a 429 response or a "you may proceed" object with the headers
 * that should be merged into the success response.
 */
export async function enforceRateLimit(
  user: SessionUser,
  policy: RateLimitPolicy,
): Promise<
  | { ok: true; headers: Record<string, string> }
  | { ok: false; response: NextResponse }
> {
  const result = await checkRateLimit(user.id, policy);
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
  if (!result.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `Rate limit exceeded. Try again in ${result.resetSeconds}s.`,
          reason: "rate_limited",
          retryAfterSeconds: result.resetSeconds,
        },
        {
          status: 429,
          headers: {
            ...headers,
            "Retry-After": String(result.resetSeconds),
          },
        },
      ),
    };
  }
  return { ok: true, headers };
}
