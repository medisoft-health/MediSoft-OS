"use client";

/**
 * Athlete Lab Results — DB-backed history + comparison (Phase 6).
 * Records serial lab reports (sport_lab_results) and compares the first vs the
 * latest report per biomarker. Shared between standalone (sport) and
 * integrated (/medisport) for true mirroring.
 */

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowDown,
  ArrowUp,
  FlaskConical,
  Loader2,
  Minus,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  LAB_MARKERS,
  LAB_MARKER_CATEGORIES,
  getMarkerDef,
  SEASON_PHASES,
} from "@/lib/sport/lab-markers";
import { TrendChart, type TrendPoint } from "@/components/sport/trend-chart";
import { TrendingUp } from "lucide-react";

type SavedMarker = {
  name: string;
  category: string;
  value: number;
  unit: string;
  athleteMin?: number;
  athleteMax?: number;
};

type LabReport = {
  id: string;
  title: string;
  reportDate: string;
  seasonPhase: string | null;
  markers: SavedMarker[];
  note: string | null;
};

type ComparisonRow = {
  name: string;
  category: string;
  unit: string;
  from: number;
  to: number;
  delta: number;
  inRange: boolean | null;
};

export function LabResultsHistory() {
  const t = useTranslations("SportLab");
  const locale = useLocale() as "ar" | "en";
  const [reports, setReports] = React.useState<LabReport[]>([]);
  const [comparison, setComparison] = React.useState<ComparisonRow[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // form state
  const [title, setTitle] = React.useState("");
  const [reportDate, setReportDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [seasonPhase, setSeasonPhase] = React.useState<string>("in-season");
  const [draftMarkers, setDraftMarkers] = React.useState<SavedMarker[]>([]);
  const [selMarker, setSelMarker] = React.useState<string>(LAB_MARKERS[0].name);
  const [markerValue, setMarkerValue] = React.useState<string>("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sport?action=my-lab-results");
      const json = await res.json();
      if (json.success) {
        setReports(json.data);
        setComparison(json.comparison);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const addMarkerToDraft = () => {
    const def = getMarkerDef(selMarker);
    const v = parseFloat(markerValue);
    if (!def || isNaN(v)) return;
    setDraftMarkers((prev) => [
      ...prev.filter((m) => m.name !== def.name),
      {
        name: def.name,
        category: def.category,
        value: v,
        unit: def.unit,
        athleteMin: def.athleteMin,
        athleteMax: def.athleteMax,
      },
    ]);
    setMarkerValue("");
  };

  const removeDraftMarker = (name: string) =>
    setDraftMarkers((prev) => prev.filter((m) => m.name !== name));

  const save = async () => {
    if (!title.trim() || draftMarkers.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/sport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "lab-result",
          report: { title, reportDate, seasonPhase, markers: draftMarkers },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setTitle("");
        setDraftMarkers([]);
        setShowForm(false);
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  // Per-marker trend across all saved reports (chronological).
  const [chartMarker, setChartMarker] = React.useState<string>("");
  const markersAvailable = React.useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => r.markers.forEach((m) => set.add(m.name)));
    return Array.from(set);
  }, [reports]);
  React.useEffect(() => {
    if (!chartMarker && markersAvailable.length > 0) setChartMarker(markersAvailable[0]);
  }, [markersAvailable, chartMarker]);
  const chartData: TrendPoint[] = React.useMemo(() => {
    if (!chartMarker) return [];
    return [...reports]
      .sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime())
      .map((r) => {
        const mk = r.markers.find((m) => m.name === chartMarker);
        return {
          label: new Date(r.reportDate).toLocaleDateString(locale === "ar" ? "ar" : "en", {
            month: "short",
            day: "numeric",
          }),
          value: mk ? mk.value : null,
        };
      });
  }, [reports, chartMarker, locale]);

  const catName = (id: string) => {
    const c = LAB_MARKER_CATEGORIES.find((x) => x.id === id);
    return c ? (locale === "ar" ? c.nameAr : c.nameEn) : id;
  };

  return (
    <div className="space-y-5">
      <Card className="border-emerald-100">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-5 w-5 text-emerald-600" /> {t("title")}
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setShowForm((v) => !v)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="me-1 h-4 w-4" /> {t("addReport")}
          </Button>
        </CardHeader>
        <CardContent>
          {showForm && (
            <div className="mb-4 space-y-3 rounded-xl bg-slate-50 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">{t("reportTitle")}</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("reportTitle")} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">{t("date")}</label>
                  <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">{t("seasonPhase")}</label>
                  <select
                    value={seasonPhase}
                    onChange={(e) => setSeasonPhase(e.target.value)}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  >
                    {SEASON_PHASES.map((p) => (
                      <option key={p} value={p}>
                        {t(`phase_${p.replace("-", "_")}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Marker entry */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
                <select
                  value={selMarker}
                  onChange={(e) => setSelMarker(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                >
                  {LAB_MARKERS.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name} ({m.unit})
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  inputMode="decimal"
                  className="sm:w-28"
                  value={markerValue}
                  onChange={(e) => setMarkerValue(e.target.value)}
                  placeholder={t("value")}
                />
                <Button type="button" variant="outline" onClick={addMarkerToDraft}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {draftMarkers.length > 0 && (
                <div className="space-y-1 rounded-lg border border-slate-100 bg-white p-2">
                  {draftMarkers.map((m) => (
                    <div key={m.name} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">
                        {m.name}: <strong>{m.value}</strong> {m.unit}
                      </span>
                      <button onClick={() => removeDraftMarker(m.name)} className="text-rose-400 hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={save}
                disabled={saving || !title.trim() || draftMarkers.length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : <Save className="me-1 h-4 w-4" />}
                {t("save")}
              </Button>
            </div>
          )}

          {/* Comparison: first vs latest report per marker */}
          {comparison && comparison.length > 0 ? (
            <div className="overflow-x-auto">
              <p className="mb-2 text-xs font-medium text-slate-500">{t("compareTitle")}</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-slate-400">
                    <th className="px-2 py-2 text-start">{t("marker")}</th>
                    <th className="px-2 py-2">{t("first")}</th>
                    <th className="px-2 py-2">{t("latest")}</th>
                    <th className="px-2 py-2">{t("change")}</th>
                    <th className="px-2 py-2">{t("range")}</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((c) => (
                    <tr key={c.name} className="border-b border-slate-50 text-center">
                      <td className="px-2 py-2 text-start text-slate-700">
                        <span className="block text-[11px] text-slate-400">{catName(c.category)}</span>
                        {c.name}
                      </td>
                      <td className="px-2 py-2 text-slate-500">{c.from}</td>
                      <td className="px-2 py-2 font-medium text-slate-800">{c.to}</td>
                      <td className="px-2 py-2">
                        <span
                          className={`inline-flex items-center justify-center gap-0.5 font-bold ${
                            c.delta === 0 ? "text-slate-400" : c.delta > 0 ? "text-amber-600" : "text-sky-600"
                          }`}
                        >
                          {c.delta > 0 ? <ArrowUp className="h-3.5 w-3.5" /> : c.delta < 0 ? <ArrowDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                          {Math.abs(c.delta)}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        {c.inRange === null ? (
                          <span className="text-slate-300">—</span>
                        ) : c.inRange ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">{t("inRange")}</span>
                        ) : (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-600">{t("outOfRange")}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !loading && <p className="py-4 text-center text-sm text-slate-400">{t("needTwo")}</p>
          )}
        </CardContent>
      </Card>

      {/* Per-marker trend chart */}
      {markersAvailable.length > 0 && chartData.filter((d) => d.value != null).length >= 2 && (
        <Card className="border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-slate-600">
              <TrendingUp className="h-4 w-4 text-emerald-600" /> {t("trends")}
            </CardTitle>
            <select
              value={chartMarker}
              onChange={(e) => setChartMarker(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
            >
              {markersAvailable.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={chartData}
              series={[{ key: "value", label: chartMarker, color: "#059669" }]}
              rtl={locale === "ar"}
            />
          </CardContent>
        </Card>
      )}

      {/* Report history list */}
      <Card className="border-slate-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-600">{t("history")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t("empty")}</p>
          ) : (
            <div className="space-y-2">
              {[...reports].reverse().map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{r.title}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(r.reportDate).toLocaleDateString(locale === "ar" ? "ar" : "en")}
                        {r.seasonPhase ? ` · ${t(`phase_${r.seasonPhase.replace("-", "_")}`)}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                      {r.markers.length} {t("markersCount")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
