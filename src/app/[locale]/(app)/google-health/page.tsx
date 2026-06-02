import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Google Health page — hidden from public access.
 * Redirects to dashboard.
 */
export default function GoogleHealthPage() {
  redirect("/dashboard");
}
