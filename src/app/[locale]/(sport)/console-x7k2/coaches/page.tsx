import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { isPlatformAdmin } from "@/lib/sport/admin-guard";
import { AdminCoachesClient } from "./client";

/**
 * MediSport — Private Admin Coach Verification console.
 *
 * Reached only via the secret slug `console-x7k2` (not linked publicly).
 * Two layers of protection:
 *   1) Server guard here — verifies the session is the single platform-owner
 *      account (role=admin AND pinned email). Anyone else is redirected to
 *      `/sport`, so the route's mere existence leaks nothing.
 *   2) API guard — every admin action re-checks `isPlatformAdmin`, so even a
 *      forged client request is rejected with 403.
 */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function AdminCoachesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireSession();
  if (!session.ok || !isPlatformAdmin(session.user)) {
    redirect(`/${locale}/sport`);
  }
  return <AdminCoachesClient locale={(locale === "ar" ? "ar" : "en") as "ar" | "en"} />;
}
