import { notFound } from "next/navigation";
import { Brain, FileText, HeartPulse, History, Mic, Stethoscope, UserCircle, Upload, ClipboardList, Activity, Target } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

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
import { Patient360Wrapper } from "./_components/patient-360-wrapper";
import { RiskAssessmentPanel } from "@/app/[locale]/(app)/medilab/[id]/_components/risk-assessment-panel";
import { Patient360Record, PatientSelfReport, HealthGoalsDashboard } from "@/components/patient-context";
import { SmartPatientHeaderWrapper } from "./_components/smart-header-wrapper";
import { PatientProfileTab } from "./_components/patient-profile-tab";
import { PatientVoiceIntakeTab } from "./_components/patient-voice-intake-tab";
import { PatientDocumentsTab } from "./_components/patient-documents-tab";
import { PatientReadingsTab } from "./_components/patient-readings-tab";
import { ZeroClickWrapper } from "./_components/zero-click-wrapper";


export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
interface PageProps {
  // Next.js 16: dynamic-route params are async.
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const VALID_TABS = [
  "overview", "profile", "encounters", "vitals", "readings",
  "documents", "upload", "timeline", "voice-intake",
  "patient360", "self-report"
] as const;
type TabId = (typeof VALID_TABS)[number];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("Patients");
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return { title: t("patientNotFound") };
  const p = await getPatientById(n);
  if (!p) return { title: t("patientNotFound") };
  return {
    title: `${p.firstName} ${p.lastName} · ${formatPatientId(p.id)}`,
  };
}

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default async function PatientDetailPage({ params, searchParams }: PageProps) {
  const [{ id: rawId }, search] = await Promise.all([params, searchParams]);
  const t = await getTranslations("Patients");

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

  // Build SelectedPatient for the Patient360 context wrapper
  const selectedPatient = {
    id: patient.id,
    firstName: patient.firstName,
    lastName: patient.lastName,
    firstNameAr: patient.firstNameAr ?? null,
    lastNameAr: patient.lastNameAr ?? null,
    age: calculateAge(patient.dateOfBirth),
    sex: patient.sex,
    mrn: patient.mrn ?? null,
    bloodType: patient.bloodType ?? null,
    allergies: (patient.allergies as Array<{ substance: string; reaction?: string; severity?: string }>) ?? [],
    chronicConditions: (patient.chronicConditions as Array<{ description: string; icdCode?: string }>) ?? [],
    insuranceProvider: patient.insuranceProvider ?? null,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-6 pb-12 lg:px-8">
      {/* Original Patient Header */}
      <PatientHeader patient={patient} />

      {/* Smart Patient Header Bar — shows key vitals and alerts */}
      <SmartPatientHeaderWrapper patientId={patient.id} patient={selectedPatient} />

      {/* Zero-Click Clinical Intelligence — Proactive insights */}
      <ZeroClickWrapper patientId={patient.id} />

      <Tabs defaultValue={activeTab}>
        <TabsList className="overflow-x-auto flex-wrap">
          <TabsTrigger value="overview">
            <Stethoscope className="size-3.5" />
            {t("overview")}
          </TabsTrigger>
          <TabsTrigger value="profile">
            <ClipboardList className="size-3.5" />
            الملف الشامل
          </TabsTrigger>
          <TabsTrigger value="encounters">
            <Mic className="size-3.5" />
            {t("encounters")}
            <CountChip n={aggregates.encounters} />
          </TabsTrigger>
          <TabsTrigger value="vitals">
            <HeartPulse className="size-3.5" />
            {t("vitals")}
            <CountChip n={aggregates.vitals} />
          </TabsTrigger>
          <TabsTrigger value="readings">
            <Activity className="size-3.5" />
            القراءات
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="size-3.5" />
            {t("documents")}
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="size-3.5" />
            رفع مستندات
          </TabsTrigger>
          <TabsTrigger value="voice-intake">
            <Mic className="size-3.5 text-red-500" />
            تسجيل صوتي
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <History className="size-3.5" />
            {t("timeline")}
          </TabsTrigger>
          <TabsTrigger value="patient360">
            <Image src="/images/medi360-icon.png" alt="Medi360" width={16} height={16} className="rounded-sm" />
            Medi360
          </TabsTrigger>
          <TabsTrigger value="self-report">
            <UserCircle className="size-3.5" />
            تسجيل ذاتي
          </TabsTrigger>
          <TabsTrigger value="health-goals">
            <Target className="size-3.5" />
            الأهداف الصحية
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

        <TabsContent value="profile">
          <Patient360Wrapper patient={selectedPatient}>
            <PatientProfileTab patientId={patient.id} patientName={`${patient.firstName} ${patient.lastName}`} />
          </Patient360Wrapper>
        </TabsContent>

        <TabsContent value="encounters">
          <TabEncounters encounters={encounters} />
        </TabsContent>

        <TabsContent value="vitals">
          <TabVitals patientId={patient.id} vitals={allVitals} />
        </TabsContent>

        <TabsContent value="readings">
          <Patient360Wrapper patient={selectedPatient}>
            <PatientReadingsTab patientId={patient.id} />
          </Patient360Wrapper>
        </TabsContent>

        <TabsContent value="documents">
          <TabDocuments />
        </TabsContent>

        <TabsContent value="upload">
          <Patient360Wrapper patient={selectedPatient}>
            <PatientDocumentsTab patientId={patient.id} />
          </Patient360Wrapper>
        </TabsContent>

        <TabsContent value="voice-intake">
          <Patient360Wrapper patient={selectedPatient}>
            <PatientVoiceIntakeTab patientId={patient.id} patientName={`${patient.firstName} ${patient.lastName}`} />
          </Patient360Wrapper>
        </TabsContent>

        <TabsContent value="timeline">
          <PatientTimeline patientId={patient.id} />
        </TabsContent>

        <TabsContent value="patient360">
          <Patient360Wrapper patient={selectedPatient}>
            <Patient360Record />
          </Patient360Wrapper>
        </TabsContent>

        <TabsContent value="self-report">
          <Patient360Wrapper patient={selectedPatient}>
            <PatientSelfReport />
          </Patient360Wrapper>
        </TabsContent>

        <TabsContent value="health-goals">
          <Patient360Wrapper patient={selectedPatient}>
            <HealthGoalsDashboard />
          </Patient360Wrapper>
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
