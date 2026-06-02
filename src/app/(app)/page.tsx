import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * Root (app) page — redirects to /dashboard.
 * The actual dashboard content now lives at /dashboard/page.tsx.
 */
export default function AppRootPage() {
  redirect("/dashboard");
}
