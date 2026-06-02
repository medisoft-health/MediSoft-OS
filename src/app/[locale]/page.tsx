import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { LandingPortal } from "@/components/landing/landing-portal";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata = {
  title: "MediSoft — Clinical Operating System",
  description: "Select your portal to access MediSoft C-OS",
};

/**
 * Root page — Landing Portal Selection.
 *
 * - If user is already signed in → redirect to /dashboard
 * - If not signed in → show the 3-portal landing page
 */
export default async function RootPage() {
  const session = await requireSession();

  if (session.ok) {
    redirect("/dashboard");
  }

  return <LandingPortal />;
}
