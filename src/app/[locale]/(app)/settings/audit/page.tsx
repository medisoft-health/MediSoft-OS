import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireSession } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function generateMetadata() {
  const t = await getTranslations("Settings");
  return { title: t("auditTrail") };
}

type AuditRow = {
  id: number;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  patientId: number | null;
  ipAddress: string | null;
  createdAt: string;
};

export default async function AuditTrailPage() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");

  // Admin-only page
  if (session.user.role !== "admin") {
    redirect("/");
  }

  const t = await getTranslations("Settings");

  // Fetch recent audit logs from the API (server-side fetch)
  let auditRows: AuditRow[] = [];
  let total = 0;

  try {
    // Use internal fetch with the base URL from env or relative path
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/audit-trail?limit=50&offset=0`, {
      cache: "no-store",
      headers: {
        cookie: "", // Server component — cookies are forwarded automatically
      },
    });

    if (res.ok) {
      const json = await res.json();
      auditRows = json.data ?? [];
      total = json.total ?? 0;
    }
  } catch {
    // If the API call fails (e.g. no DB), show empty state
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
        >
          <ArrowLeft className="size-3.5" />
          {t("title")}
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <ShieldCheck className="size-7 text-emerald-600" />
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              {t("auditTrail")}
            </h1>
            <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
              {t("auditTrailDescription")}
            </p>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-x-auto rounded-lg border border-[color:var(--color-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-muted)]/50">
              <th className="px-4 py-3 text-start font-semibold">
                {t("auditDate")}
              </th>
              <th className="px-4 py-3 text-start font-semibold">
                {t("auditUser")}
              </th>
              <th className="px-4 py-3 text-start font-semibold">
                {t("auditAction")}
              </th>
              <th className="px-4 py-3 text-start font-semibold">
                {t("auditResource")}
              </th>
              <th className="px-4 py-3 text-start font-semibold">
                {t("auditPatient")}
              </th>
              <th className="px-4 py-3 text-start font-semibold">
                {t("auditIP")}
              </th>
            </tr>
          </thead>
          <tbody>
            {auditRows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-[color:var(--color-muted-foreground)]"
                >
                  {t("auditNoRecords")}
                </td>
              </tr>
            ) : (
              auditRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[color:var(--color-border)] last:border-b-0 hover:bg-[color:var(--color-muted)]/30"
                >
                  <td className="px-4 py-3 tabular-nums">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {row.actorId ? row.actorId.slice(0, 8) + "…" : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {row.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {row.resourceType}
                    {row.resourceId ? ` #${row.resourceId}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    {row.patientId ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {row.ipAddress ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer summary */}
      {total > 0 && (
        <p className="text-xs text-[color:var(--color-muted-foreground)]">
          {t("auditTotal")}: {total}
        </p>
      )}
    </div>
  );
}
