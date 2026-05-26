import { notFound } from "next/navigation";
import { FileText, HeartPulse, History, Mic, Stethoscope } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { requireSession } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import { getPatientById } from "@/lib/queries/patients";
import { getLatestVitals, listVitalsForPatient } from "@/lib/queries/vitals";
import {
  getPatientAggregates,
  listEncountersForPatient,
  listPatientTimeline,
  listPrescriptionsForPatient,
} from "@/lib/queries/patient-detail";
import { formatPatientId } from "@/lib/utils";

import { PatientHeader } from "./_components/patient-header";
import { TabOverview } from "./_components/tab-overview";
import { TabEncounters } from "./_components/tab-encounters";
import { TabVitals } from "./_components/tab-vitals";
import { TabDocuments } from "./_components/tab-documents";
import { TabTimeline } from "./_components/tab-timeline";
import { HealthDashboard } from "./_components/health-dashboard";
import { PatientTimeline } from "./_components/patient-timeline";
import { RiskAssessmentPanel } from "@/app/[locale]/(app)/medilab/[id]/_components/risk-assessment-panel";

interface PageProps {
  // Next.js 16: dynamic-route params are async.
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const VALID_TABS = ["overview", "encounters", "vitals", "documents", "timeline"] as const;
type TabId = (typeof VALID_TABS)[number];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return { title: "Patient not found" };
  const p = await getPatientById(n);
  if (!p) return { title: "Patient not found" };
  return {
    title: `${p.firstName} ${p.lastName} · ${formatPatientId(p.id)}`,
  };
}

export default async function PatientDetailPage({ params, searchParams }: PageProps) {
  const [{ id: rawId }, search] = await Promise.all([params, searchParams]);

  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const patient = await getPatientById(id);
  if (!patient) notFound();

  // Determine active tab from `?tab=` (defaults to "overview").
  const tabParam = Array.isArray(search.tab) ? search.tab[0] : search.tab;
  const activeTab: TabId =
    tabParam && (VALID_TABS as readonly string[]).includes(tabParam)
      ? (tabParam as TabId)
      : "overview";

  // Audit log (fire and forget) — record that this physician viewed the chart.
  const session = await requireSession();
  if (session.ok) {
    void logAudit({
      actorId: session.user.id,
      action: "patient.view",
      resourceType: "patient",
      resourceId: patient.id,
      patientId: patient.id,
      metadata: { tab: activeTab },
    });
  }

  // Parallel fetch of everything the tabs need. Reads only — safe to do unconditionally.
  const [
    latestVitals,
    allVitals,
    encounters,
    prescriptions,
    aggregates,
    timeline,
  ] = await Promise.all([
    getLatestVitals(patient.id),
    listVitalsForPatient(patient.id, 50),
    listEncountersForPatient(patient.id, 50),
    listPrescriptionsForPatient(patient.id, 20),
    getPatientAggregates(patient.id),
    listPatientTimeline(patient.id, 50),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 pb-12 lg:px-8">
      <PatientHeader patient={patient} />

      <Tabs defaultValue={activeTab}>
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="overview">
            <Stethoscope className="size-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="encounters">
            <Mic className="size-3.5" />
            Encounters
            <CountChip n={aggregates.encounters} />
          </TabsTrigger>
          <TabsTrigger value="vitals">
            <HeartPulse className="size-3.5" />
            Vitals
            <CountChip n={aggregates.vitals} />
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="size-3.5" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <History className="size-3.5" />
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-6">
            <HealthDashboard patientId={patient.id} />
            <TabOverview
              patient={patient}
              latestVitals={latestVitals}
              recentPrescriptions={prescriptions}
            />
            <RiskAssessmentPanel patientId={patient.id} />
          </div>
        </TabsContent>

        <TabsContent value="encounters">
          <TabEncounters encounters={encounters} />
        </TabsContent>

        <TabsContent value="vitals">
          <TabVitals patientId={patient.id} vitals={allVitals} />
        </TabsContent>

        <TabsContent value="documents">
          <TabDocuments />
        </TabsContent>

        <TabsContent value="timeline">
          <PatientTimeline patientId={patient.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CountChip({ n }: { n: number }) {
  if (n === 0) return null;
  return (
    <span className="ml-1 rounded-full bg-[color:var(--color-muted)] px-1.5 py-0.5 text-[9px] font-bold text-[color:var(--color-muted-foreground)] tabular-nums">
      {n}
    </span>
  );
}
