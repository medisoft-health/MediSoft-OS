import type { Metadata, Viewport } from "next";
import { SportLayoutShell } from "@/components/sport/sport-layout-shell";
import { SportPwaRegister } from "@/components/sport/sport-pwa-register";

/**
 * MediSport Standalone route group layout.
 *
 * This is a completely independent layout from the clinical (app) layout.
 * It has its own navigation, branding, authentication flow, and PWA identity
 * so MediSport is installable as its own app on Android/iOS.
 * No sidebar — uses a modern top-nav + bottom-nav (mobile) pattern.
 */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "MediSport — منصة الرياضيين",
  description:
    "منصة MediSport للرياضيين والمدربين: التغذية، تكوين الجسم، العمر البيولوجي، التحاليل، والتدريب.",
  manifest: "/sport-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MediSport",
  },
  icons: {
    icon: "/images/medisport-icon-192.png",
    apple: "/images/medisport-apple-touch.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
};

export default function SportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SportPwaRegister />
      <SportLayoutShell>{children}</SportLayoutShell>
    </>
  );
}
