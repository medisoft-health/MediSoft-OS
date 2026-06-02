import type { Metadata, Viewport } from "next";
import "./globals.css";

// كل الصفحات تُعرض وقت التشغيل (SSR) وليس وقت البناء (SSG)
// هذا يمنع database calls أثناء next build داخل Docker
export const dynamic = "force-dynamic";

/**
 * Root layout — locale-agnostic.
 *
 * The actual `<html>` element lives in `src/app/[locale]/layout.tsx`
 * so we can set `lang` and `dir` per request. This layout is intentionally
 * a passthrough — Next.js still requires a root layout even when each
 * locale segment owns its own html shell.
 *
 * Metadata defaults apply across all locales; per-locale overrides land
 * in the locale layout.
 */
export const metadata: Metadata = {
  title: {
    default: "MediSoft C-OS — Clinical Operating System",
    template: "%s · MediSoft",
  },
  description:
    "Intelligence-native clinical operating system for connected healthcare. MediScript, PharmaX, MediLab and MediScan in one unified workspace.",
  applicationName: "MediSoft C-OS",
  keywords: [
    "MediSoft",
    "healthcare",
    "EMR",
    "clinical intelligence",
    "telemedicine",
    "Saudi Arabia",
    "NPHIES",
    "FHIR",
  ],
  authors: [{ name: "Hamada Ghaith" }],
  creator: "MediSoft",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MediSoft",
    startupImage: "/icons/icon-512.png",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1a3b7a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
