"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { routing, type Locale } from "@/i18n/routing";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

/**
 * Locale toggle for the topbar. Switches between /en/... and /ar/...
 * while preserving the current path.
 */
export function LocaleSwitcher() {
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  function switchTo(locale: Locale) {
    if (locale === currentLocale) return;
    // Strip the current locale prefix and prepend the new one.
    // The middleware's `localePrefix: "as-needed"` means the default
    // locale (en) may or may not have a prefix. Handle both.
    let cleanPath = pathname;
    for (const l of routing.locales) {
      if (cleanPath.startsWith(`/${l}/`)) {
        cleanPath = cleanPath.slice(l.length + 1);
        break;
      }
      if (cleanPath === `/${l}`) {
        cleanPath = "/";
        break;
      }
    }
    const newPath =
      locale === routing.defaultLocale
        ? cleanPath || "/"
        : `/${locale}${cleanPath || "/"}`;
    router.replace(newPath);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:inline-flex"
          aria-label="Change language"
          title={`Language: ${LOCALE_LABELS[currentLocale]}`}
        >
          <Globe className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => switchTo(locale)}
            className={
              locale === currentLocale
                ? "font-semibold text-[color:var(--color-brand-magenta)]"
                : undefined
            }
          >
            {LOCALE_LABELS[locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
