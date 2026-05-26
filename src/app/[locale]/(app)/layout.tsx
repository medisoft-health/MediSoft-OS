import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

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
