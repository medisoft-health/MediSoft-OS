"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/analytics/stat-card";
import { EncounterChart } from "@/components/analytics/encounter-chart";
import { DonutChart } from "@/components/analytics/donut-chart";
import { HorizontalBarChart } from "@/components/analytics/horizontal-bar-chart";
import { RankedList } from "@/components/analytics/ranked-list";

interface Analytics {
  overview: { totalPatients: number; totalEncounters: number; totalLabResults: number; activePrescriptions: number; encountersThisMonth: number; encounterGrowthPercent: number; newPatientsThisMonth: number };
  demographics: { genderDistribution: { male: number; female: number; other: number }; ageGroups: Array<{ range: string; count: number; percentage: number }> };
  diagnoses: { chronicConditions: Array<{ condition: string; patientCount: number; percentage: number }> };
  medications: { topMedications: Array<{ name: string; prescriptionCount: number; activeCount: number }> };
  encounters: { monthly: Array<{ month: string; count: number }>; averagePerDay: number };
  labs: { totalThisMonth: number; abnormalRate: number };
}

export function AnalyticsDashboard() {
  const t = useTranslations("Analytics");
  const [data, setData] = React.useState<Analytics | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/analytics/overview")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-gray-400" />
        <span className="ms-2 text-sm text-gray-500">{t("loadingAnalytics")}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <Card><CardContent className="py-12 text-center text-sm text-gray-500">
        {t("noDataYet")}
      </CardContent></Card>
    );
  }

  const { overview, demographics, diagnoses, medications, encounters, labs } = data;

  return (
    <div className="space-y-6">
      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard value={overview.totalPatients} label={t("totalPatients")} icon="👥" color="text-blue-600"
          sub={overview.newPatientsThisMonth > 0 ? `+${overview.newPatientsThisMonth} ${t("thisMonthSub")}` : undefined} />
        <StatCard value={overview.totalEncounters} label={t("totalEncounters")} icon="📋" color="text-purple-600"
          sub={overview.encounterGrowthPercent !== 0 ? `${overview.encounterGrowthPercent > 0 ? "+" : ""}${overview.encounterGrowthPercent}% ${t("vsLastMonth")}` : undefined} />
        <StatCard value={overview.totalLabResults} label={t("labResults")} icon="🧪" color="text-emerald-600"
          sub={labs.totalThisMonth > 0 ? `${labs.totalThisMonth} ${t("thisMonthSub")}` : undefined} />
        <StatCard value={overview.activePrescriptions} label={t("activePrescriptions")} icon="💊" color="text-amber-600" />
      </div>

      {/* Encounter Trends + Demographics */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">📈 {t("encounterTrends")}</CardTitle>
          </CardHeader>
          <CardContent>
            <EncounterChart data={encounters.monthly} />
            <p className="mt-2 text-center text-[10px] text-gray-400">{t("avgEncountersPerDay", { count: encounters.averagePerDay })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">👥 {t("patientDemographics")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DonutChart data={[
              { label: t("male"), value: demographics.genderDistribution.male, color: "#3B82F6" },
              { label: t("female"), value: demographics.genderDistribution.female, color: "#EC4899" },
              ...(demographics.genderDistribution.other > 0 ? [{ label: t("other"), value: demographics.genderDistribution.other, color: "#9CA3AF" }] : []),
            ]} size={100} />
            <HorizontalBarChart data={demographics.ageGroups.map((g) => ({
              label: g.range,
              value: g.count,
              color: "#6366F1",
            }))} />
          </CardContent>
        </Card>
      </div>

      {/* Diagnoses + Medications */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <RankedList
              title={`🏥 ${t("topChronicConditions")}`}
              items={diagnoses.chronicConditions.map((c) => ({
                label: c.condition,
                value: `${c.patientCount} (${c.percentage}%)`,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <RankedList
              title={`💊 ${t("topMedications")}`}
              items={medications.topMedications.map((m) => ({
                label: m.name,
                value: `${m.activeCount} ${t("activeLabel")}`,
                sub: `${m.prescriptionCount} ${t("totalLabel")}`,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
