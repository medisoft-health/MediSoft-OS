import { PWARegister } from "@/components/pwa/pwa-register";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { Inter, JetBrains_Mono, Noto_Sans_Arabic, Pacifico, Playfair_Display, Exo_2, Cairo, IBM_Plex_Sans_Arabic } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { routing, isRtlLocale, type Locale } from "@/i18n/routing";

/**
 * Force all locale routes to be dynamically rendered.
 * Prevents static generation attempts during CI builds where DB is unavailable.
 */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const pacifico = Pacifico({
  variable: "--font-pacifico",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
});

const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// --- MediSport brand fonts ---
const exo2 = Exo_2({
  variable: "--font-exo2",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
  weight: ["400", "600", "700", "800"],
});

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

/**
 * Locale-aware root shell. Owns the <html> element so we can set
 * `lang` + `dir` per request, mounts the next-intl client provider
 * so child client components can call `useTranslations()`.
 *
 * Per Next.js 16: `params` is a Promise.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  const typedLocale = locale as Locale;
  const messages = await getMessages();

  return (
    <html
      lang={typedLocale}
      dir={isRtlLocale(typedLocale) ? "rtl" : "ltr"}
      className={`${inter.variable} ${jetbrainsMono.variable} ${pacifico.variable} ${notoSansArabic.variable} ${playfairDisplay.variable} ${exo2.variable} ${cairo.variable} ${plexArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <NextIntlClientProvider locale={typedLocale} messages={messages}>
          {children}
          <PWARegister />
        </NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  );
}

export const metadata: Metadata = {
  // Per-locale overrides could go here; for PR-9c we use the root layout's
  // defaults across both locales.
};
