"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

/**
 * Locale toggle for the topbar. Switches between /en/... and /ar/...
 * while preserving the current path.
 *
 * Uses next-intl's locale-aware useRouter so the middleware properly
 * handles the locale cookie and URL rewriting.
 */
export function LocaleSwitcher() {
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  function switchTo(locale: Locale) {
    if (locale === currentLocale) return;
    router.replace(pathname, { locale });
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
