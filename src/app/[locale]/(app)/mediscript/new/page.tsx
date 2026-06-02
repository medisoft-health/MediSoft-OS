import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getPatientById } from "@/lib/queries/patients";
import { formatPatientId } from "@/lib/utils";
import { SessionWizard } from "./_components/session-wizard";


export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata = {
  title: "New MediScript session",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * /mediscript/new — Start a new clinical encounter recording.
 *
 * Supports a deep link from the patient detail page:
 *   /mediscript/new?patientId=123
 * which pre-selects the patient and starts on the "Record" step.
 */
export default async function NewMediScriptPage({ searchParams }: PageProps) {
  const t = await getTranslations("MediScript");

  const sp = await searchParams;
  const raw = Array.isArray(sp.patientId) ? sp.patientId[0] : sp.patientId;
  const n = raw ? Number(raw) : null;

  let initialPatient = null;
  if (n != null && Number.isInteger(n) && n > 0) {
    const p = await getPatientById(n);
    if (p) {
      initialPatient = {
        id: p.id,
        label: `${p.firstName} ${p.lastName}`,
        sublabel: [
          formatPatientId(p.id),
          p.saudiId ?? null,
          p.phone ?? null,
        ]
          .filter(Boolean)
          .slice(0, 2)
          .join(" · "),
      };
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-8">
      <div>
        <Link
          href="/mediscript"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
        >
          <ArrowLeft className="size-3.5" />
          {t("title")}
        </Link>
        <h1 className="mt-2 text-2xl font-black tracking-tight">
          {t("newSession")}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
          {t("newPageDescription")}
        </p>
      </div>

      <SessionWizard initialPatient={initialPatient} />
    </div>
  );
}
