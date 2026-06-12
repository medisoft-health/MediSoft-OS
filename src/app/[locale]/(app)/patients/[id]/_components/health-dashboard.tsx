"use client";

import * as React from "react";
import { Activity, FlaskConical, Loader2, Pill, Stethoscope } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchPatientDashboard, type DashboardData } from "@/lib/medilab/client";
import { cn } from "@/lib/utils";
import { HealthGauge } from "./health-gauge";
import { RadarChart } from "./radar-chart";

interface Props { patientId: number; }

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  catch { return "—"; }
}

export function HealthDashboard({ patientId }: Props) {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetchPatientDashboard(patientId).then((d) => {
      if (!cancelled) { setData(d); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [patientId]);

  if (loading) {
    return (
      <Card><CardContent className="flex items-center gap-2 py-10 justify-center text-sm text-gray-500">
        <Loader2 className="size-4 animate-spin" /> جاري تحميل لوحة الصحة...
      </CardContent></Card>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Health Score + Stats Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Gauge */}
        <Card className="flex items-center justify-center py-6">
          <div className="text-center">
            <HealthGauge score={data.overallHealthScore} size={160} />
            <p className="mt-2 text-sm font-semibold text-gray-700">مؤشر الصحة العام</p>
          </div>
        </Card>

        {/* Stats Grid */}
        <Card className="lg:col-span-2">
          <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
            <StatCard icon={FlaskConical} color="text-blue-600" bg="bg-blue-50"
              label="آخر تحليل" value={formatDate(data.stats.lastLabDate)}
              sub={data.stats.lastLabAbnormal > 0 ? `${data.stats.lastLabAbnormal} غير طبيعي` : "طبيعي"} />
            <StatCard icon={Pill} color="text-green-600" bg="bg-green-50"
              label="أدوية نشطة" value={String(data.stats.activeMeds)}
              sub={data.stats.drugAlertCount > 0 ? `${data.stats.drugAlertCount} تنبيه` : "لا تنبيهات"} />
            <StatCard icon={Activity} color="text-teal-600" bg="bg-teal-50"
              label="آخر قياسات" value={formatDate(data.stats.lastVitalDate)}
              sub={data.stats.lastBP ?? "—"} />
            <StatCard icon={Stethoscope} color="text-purple-600" bg="bg-purple-50"
              label="آخر زيارة" value={formatDate(data.stats.lastEncounterDate)}
              sub="متابعة" />
          </CardContent>
        </Card>
      </div>

      {/* Trends + Radar Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Key Biomarker Trends */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">📈 اتجاهات المؤشرات الرئيسية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.keyTrends.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">لا توجد بيانات كافية لعرض الاتجاهات</p>
            ) : data.keyTrends.map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-800 min-w-[80px] capitalize">{t.testName}</span>
                <div className="flex-1 flex items-center gap-1">
                  {t.values.map((v, j) => (
                    <span key={j} className="text-[10px] tabular-nums text-gray-600">
                      {v.value.toFixed(1)}{j < t.values.length - 1 ? " →" : ""}
                    </span>
                  ))}
                </div>
                <Badge variant={t.direction === "improving" ? "success" : t.direction === "worsening" ? "destructive" : "info"} className="text-[9px]">
                  {t.direction === "improving" ? "↓ تحسن" : t.direction === "worsening" ? "↑ ساء" : "→ مستقر"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Risk Radar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">🎯 رادار المخاطر</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <RadarChart data={data.risks.map((r) => ({ label: r.name, value: r.score }))} size={220} />
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {data.alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">⚠️ تنبيهات نشطة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.alerts.map((a, i) => (
              <div key={i} className={cn("flex items-center gap-2 rounded-lg p-2.5 text-xs",
                a.severity === "critical" || a.severity === "high" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800")}>
                <span>{a.severity === "critical" || a.severity === "high" ? "🔴" : "🟡"}</span>
                <span>{a.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, color, bg, label, value, sub }: {
  icon: React.ElementType; color: string; bg: string; label: string; value: string; sub: string;
}) {
  return (
    <div className={cn("rounded-xl p-3", bg)}>
      <Icon className={cn("size-4 mb-1", color)} />
      <div className="text-[10px] text-gray-500">{label}</div>
      <div className={cn("text-sm font-bold", color)}>{value}</div>
      <div className="text-[10px] text-gray-500">{sub}</div>
    </div>
  );
}
