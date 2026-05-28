import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPatientById } from "@/lib/queries/patients";
import { formatPatientId } from "@/lib/utils";
import { ScanBuilder } from "./_components/scan-builder";


export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata = {
  title: "New scan",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NewScanPage({ searchParams }: PageProps) {
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
        sublabel: [formatPatientId(p.id), p.saudiId ?? null, p.phone ?? null]
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
          href="/mediscan"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
        >
          <ArrowLeft className="size-3.5" />
          MediScan
        </Link>
        <h1 className="mt-2 text-2xl font-black tracking-tight">New scan</h1>
        <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
          Upload an image, annotate, get an AI-drafted report — review before
          saving.
        </p>
      </div>

      <ScanBuilder initialPatient={initialPatient} />
    </div>
  );
}
