import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

/**
 * Force every route under [locale]/(app) to be dynamically rendered at request time.
 * This prevents Next.js from attempting static generation during `next build`,
 * which would fail because the database is unreachable in the CI environment.
 */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * Authenticated app layout — wraps all clinical module routes
 * with the MediSoft sidebar + topbar shell.
 *
 * Unauthenticated requests are redirected to /login.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  if (!session.ok) {
    redirect("/login");
  }

  const user = {
    name: session.user.name || "Physician",
    email: session.user.email,
    role: session.user.role ?? "physician",
    specialty: session.user.specialty ?? null,
  };

  return <DashboardLayout user={user}>{children}</DashboardLayout>;
}
