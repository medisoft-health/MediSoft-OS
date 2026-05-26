import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * next-intl middleware: detects the user's locale (URL prefix → cookie
 * → Accept-Language) and rewrites/redirects accordingly.
 *
 * We exclude `/api/*` and `/_next/*` from the matcher so route handlers
 * and static assets bypass the locale logic.
 */
export default createIntlMiddleware(routing);

export const config = {
  matcher: [
    // Match all paths EXCEPT:
    //   - /api/*       (route handlers — no locale routing)
    //   - /_next/*     (Next.js internals)
    //   - any file with a dot (favicons, images, sitemap.xml, etc.)
    "/((?!api|_next|.*\\..*).*)",
  ],
};
