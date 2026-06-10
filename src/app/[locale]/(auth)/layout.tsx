import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";

/**
 * Force auth routes to be dynamically rendered — they call requireSession()
 * which needs a live database connection (unavailable during CI builds).
 */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * Auth route group layout — wraps /login and /signup.
 *
 * - No sidebar; warm paper editorial background (Design System).
 * - If user is already signed in, bounce them to the dashboard.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  if (session.ok) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4" style={{ background: '#F8F7F4' }}>
      {/* Soft radial brand glow — navy + pink, subtle */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 25% 20%, rgba(27,79,124,0.12), transparent 55%), radial-gradient(circle at 80% 80%, rgba(232,76,138,0.10), transparent 55%)",
        }}
      />
      {/* Subtle dot grid — editorial feel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(27,79,124,0.08) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <main className="relative z-10 w-full max-w-md">{children}</main>
    </div>
  );
}
