import Link from "next/link";
import {
  ArrowLeft,
  FileCheck,
  FilePlus,
  History,
  ShieldCheck,
  ClipboardList,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { requireSession } from "@/lib/auth-helpers";
import {
  getAllConsents,
  CONSENT_POLICIES,
  type ConsentRecord,
  type ConsentStatus,
} from "@/lib/google-health/consent-management";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("Settings");
  return { title: `${t("consentManagement")} — ${t("title")}` };
}

/* ------------------------------------------------------------------ */

function statusVariant(status: ConsentStatus) {
  switch (status) {
    case "active":
      return "default" as const;
    case "revoked":
      return "destructive" as const;
    case "expired":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function categoryLabel(
  category: string,
  t: Awaited<ReturnType<typeof getTranslations<"Settings">>>,
) {
  switch (category) {
    case "treatment":
      return t("treatment");
    case "data_sharing":
      return t("dataSharing");
    case "research":
      return t("research");
    default:
      return category;
  }
}

function statusLabel(
  status: ConsentStatus,
  t: Awaited<ReturnType<typeof getTranslations<"Settings">>>,
) {
  switch (status) {
    case "active":
      return t("consentActive");
    case "revoked":
      return t("consentRevoked");
    case "expired":
      return t("consentExpired");
    default:
      return status;
  }
}

/* ------------------------------------------------------------------ */

export default async function ConsentManagementPage() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");

  const t = await getTranslations("Settings");

  /* Fetch all consent records from the in-memory store */
  const consents: ConsentRecord[] = getAllConsents();

  /* Split into buckets */
  const active = consents.filter((c) => c.status === "active");
  const history = [...consents].sort(
    (a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime(),
  );

  /* Available policies for the "Create" card */
  const policies = CONSENT_POLICIES.filter((p) =>
    ["treatment", "data_sharing", "research"].includes(p.category),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
        >
          <ArrowLeft className="size-3.5" />
          {t("title")}
        </Link>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          {t("consentManagement")}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
          {t("consentDescription")}
        </p>
      </div>

      {/* ── Compliance badges ──────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1">
          <ShieldCheck className="size-3" />
          {t("hipaaCompliant")}
        </Badge>
        <Badge variant="outline" className="gap-1">
          <ShieldCheck className="size-3" />
          {t("pdplCompliant")}
        </Badge>
      </div>

      {/* ── Active Consents ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileCheck className="size-5" />
            {t("activeConsents")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {active.length === 0 ? (
            <div className="py-8 text-center">
              <ClipboardList className="mx-auto size-10 text-[color:var(--color-muted-foreground)]" />
              <p className="mt-3 text-sm font-medium">{t("noConsentsYet")}</p>
              <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                {t("noConsentsHint")}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[color:var(--color-border)]">
              {active.map((consent) => (
                <li
                  key={consent.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {consent.policyName}
                    </p>
                    <p className="text-xs text-[color:var(--color-muted-foreground)]">
                      {consent.patientName ?? consent.patientId} &middot;{" "}
                      {categoryLabel(consent.category, t)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(consent.status)}>
                      {statusLabel(consent.status, t)}
                    </Badge>
                    <form action={`/api/google-health/consent`} method="POST">
                      <input type="hidden" name="action" value="revoke" />
                      <input
                        type="hidden"
                        name="consentId"
                        value={consent.id}
                      />
                      <input
                        type="hidden"
                        name="reason"
                        value="Revoked via settings UI"
                      />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                      >
                        {t("revokeConsent")}
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Create Consent ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FilePlus className="size-5" />
            {t("createConsent")}
          </CardTitle>
          <CardDescription>{t("consentDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action="/api/google-health/consent"
            method="POST"
            className="grid gap-4 sm:grid-cols-2"
          >
            <input type="hidden" name="action" value="create" />
            <input
              type="hidden"
              name="createdBy"
              value={session.user.id}
            />

            {/* Consent type / policy */}
            <div className="space-y-1.5">
              <label
                htmlFor="policyId"
                className="text-sm font-medium"
              >
                {t("consentType")}
              </label>
              <select
                id="policyId"
                name="policyId"
                required
                className="w-full rounded-md border border-[color:var(--color-border)] bg-transparent px-3 py-2 text-sm"
              >
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.category === "treatment"
                      ? t("treatment")
                      : p.category === "data_sharing"
                        ? t("dataSharing")
                        : t("research")}{" "}
                    &mdash; {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Patient ID */}
            <div className="space-y-1.5">
              <label
                htmlFor="patientId"
                className="text-sm font-medium"
              >
                Patient ID
              </label>
              <input
                id="patientId"
                name="patientId"
                type="text"
                required
                placeholder="patient-1"
                className="w-full rounded-md border border-[color:var(--color-border)] bg-transparent px-3 py-2 text-sm"
              />
            </div>

            {/* Patient name */}
            <div className="space-y-1.5 sm:col-span-2">
              <label
                htmlFor="patientName"
                className="text-sm font-medium"
              >
                Patient Name
              </label>
              <input
                id="patientName"
                name="patientName"
                type="text"
                placeholder="Ahmed Al-Rashid"
                className="w-full rounded-md border border-[color:var(--color-border)] bg-transparent px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <Button type="submit" className="w-full sm:w-auto">
                {t("createConsent")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Consent History Timeline ───────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="size-5" />
            {t("consentHistory")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-6 text-center text-sm text-[color:var(--color-muted-foreground)]">
              {t("noConsentsYet")}
            </p>
          ) : (
            <ol className="relative border-s border-[color:var(--color-border)] ms-3">
              {history.slice(0, 20).map((consent) => {
                const latestEvent =
                  consent.auditTrail[consent.auditTrail.length - 1];
                return (
                  <li key={consent.id} className="mb-6 ms-6">
                    <span className="absolute -start-2 flex size-4 items-center justify-center rounded-full bg-[color:var(--color-primary)] ring-4 ring-[color:var(--color-background)]" />
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">
                          {consent.policyName}
                        </p>
                        <p className="text-xs text-[color:var(--color-muted-foreground)]">
                          {consent.patientName ?? consent.patientId} &middot;{" "}
                          {latestEvent?.action ?? consent.status}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant(consent.status)}>
                          {statusLabel(consent.status, t)}
                        </Badge>
                        <time className="text-xs text-[color:var(--color-muted-foreground)]">
                          {new Date(consent.lastModified).toLocaleDateString()}
                        </time>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
