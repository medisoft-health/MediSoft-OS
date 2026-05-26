import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";

/**
 * Auth route group layout — wraps /login and /signup.
 *
 * - No sidebar; full-bleed clinical gradient background.
 * - If user is already signed in, bounce them to the dashboard.
 * - Uses requireSession() which safely catches Better-Auth throws.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  if (session.ok) {
    redirect("/");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[color:var(--color-background)] p-4">
      {/* Soft radial brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 25% 20%, rgba(232,74,138,0.18), transparent 55%), radial-gradient(circle at 80% 80%, rgba(30,58,140,0.18), transparent 55%)",
        }}
      />
      {/* Subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <main className="relative z-10 w-full max-w-md">{children}</main>
    </div>
  );
}
