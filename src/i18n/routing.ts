import { defineRouting } from "next-intl/routing";

/**
 * MediSoft i18n routing.
 *
 * Locale lives in the URL: /en/... or /ar/...
 * The default locale (en) does NOT get a prefix at the root —
 *   /            → /en (rewritten)
 *   /patients    → /en/patients
 *   /ar/patients → /ar/patients (Arabic UI)
 *
 * `localePrefix: "as-needed"` keeps existing English URLs working
 * unchanged so this PR doesn't break bookmarks.
 */
export const routing = defineRouting({
  locales: ["en", "ar"] as const,
  defaultLocale: "en",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

/** Returns true when the given locale renders right-to-left. */
export function isRtlLocale(locale: Locale): boolean {
  return locale === "ar";
}
