import type { Metadata } from "next";
import "./globals.css";

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
    "AI-native clinical operating system for connected healthcare. MediScript, PharmaX, MediLab and MediScan in one unified workspace.",
  applicationName: "MediSoft C-OS",
  keywords: [
    "MediSoft",
    "healthcare",
    "EMR",
    "clinical AI",
    "telemedicine",
    "Saudi Arabia",
    "NPHIES",
    "FHIR",
  ],
  authors: [{ name: "Hamada Ghaith" }],
  creator: "MediSoft",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
