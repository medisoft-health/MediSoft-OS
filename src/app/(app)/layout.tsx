import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

/**
 * Authenticated app layout — wraps all clinical module routes
 * with the MediSoft sidebar + topbar shell.
 *
 * Uses requireSession() which safely catches Better-Auth internal
 * throws (e.g., "Failed to get session" on DB connection drops).
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
    role: (session.user.role as "physician" | "admin" | undefined) ?? "physician",
    specialty: session.user.specialty ?? null,
  };

  return <DashboardLayout user={user}>{children}</DashboardLayout>;
}
