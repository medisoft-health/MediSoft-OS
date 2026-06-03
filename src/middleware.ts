import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import {
  checkRateLimit,
  policyForPath,
} from "./lib/rate-limit/api-limiter";

/**
 * Unified middleware:
 *
 * 1. **API routes** (`/api/*`) — apply sliding-window rate limiting,
 *    then let the route handler run (NextResponse.next()).
 *
 * 2. **Everything else** — delegate to next-intl for locale detection,
 *    URL rewriting, and redirects.
 */

const intlMiddleware = createIntlMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ───── API rate limiting ─────
  if (pathname.startsWith("/api")) {
    // Best-effort IP extraction — works behind most reverse proxies.
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const policy = policyForPath(pathname);
    const key = `${policy}:${ip}`;
    const result = checkRateLimit(key, policy);

    if (!result.ok) {
      const retryAfter = Math.max(
        1,
        Math.ceil((result.resetAt - Date.now()) / 1000),
      );
      return NextResponse.json(
        { error: "Too many requests", retryAfter },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.resetAt),
          },
        },
      );
    }

    // Allowed — forward with rate-limit headers.
    const response = NextResponse.next();
    response.headers.set(
      "X-RateLimit-Remaining",
      String(result.remaining),
    );
    response.headers.set("X-RateLimit-Reset", String(result.resetAt));
    return response;
  }

  // ───── i18n locale routing (non-API) ─────
  return intlMiddleware(request);
}

/**
 * Matcher: run the middleware on ALL routes so both API rate-limiting
 * and next-intl locale routing are handled.
 *
 * We still exclude Next.js internals and static files (with a dot).
 */
export const config = {
  matcher: [
    // Match everything except /_next/* and files with dots (static assets).
    "/((?!_next|.*\\..*).*)",
  ],
};
