import { SportLayoutShell } from "@/components/sport/sport-layout-shell";

/**
 * MediSport Standalone route group layout.
 * 
 * This is a completely independent layout from the clinical (app) layout.
 * It has its own navigation, branding, and authentication flow.
 * No sidebar — uses a modern top-nav + bottom-nav (mobile) pattern.
 */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function SportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SportLayoutShell>{children}</SportLayoutShell>;
}
