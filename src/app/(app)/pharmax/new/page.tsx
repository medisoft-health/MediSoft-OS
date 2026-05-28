import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPatientById } from "@/lib/queries/patients";
import { formatPatientId } from "@/lib/utils";
import { PrescriptionBuilder } from "./_components/prescription-builder";


export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata = {
  title: "New prescription",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NewPrescriptionPage({ searchParams }: PageProps) {
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
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div>
        <Link
          href="/pharmax"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
        >
          <ArrowLeft className="size-3.5" />
          PharmaX
        </Link>
        <h1 className="mt-2 text-2xl font-black tracking-tight">
          New prescription
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
          Add drugs from RxNorm. Safety panel updates live.
        </p>
      </div>

      <PrescriptionBuilder initialPatient={initialPatient} />
    </div>
  );
}
