"use client";

/**
 * Body Composition Tracking over time — DB-backed (sport_body_measurements).
 * Lets athletes record serial measurements and compare first vs latest.
 * Shared between standalone (sport) and integrated (/medisport).
 */

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Minus,
  Plus,
  Save,
  Scale,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Measurement = {
  id: string;
  measuredAt: string;
  weightKg: string | null;
  bodyFatPct: string | null;
  muscleMassKg: string | null;
  waterPct: string | null;
  waistCm: string | null;
  note: string | null;
};

type Comparison = {
  from: string;
  to: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  waistCm: number | null;
} | null;

const FIELDS = [
  { key: "weightKg", icon: Scale },
  { key: "bodyFatPct", icon: TrendingUp },
  { key: "muscleMassKg", icon: TrendingUp },
  { key: "waterPct", icon: TrendingUp },
  { key: "waistCm", icon: Minus },
] as const;

export function BodyCompositionHistory() {
  const t = useTranslations("SportBody");
  const locale = useLocale() as "ar" | "en";
  const [rows, setRows] = React.useState<Measurement[]>([]);
  const [comparison, setComparison] = React.useState<Comparison>(null);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sport?action=my-body-measurements");
      const json = await res.json();
      if (json.success) {
        setRows(json.data);
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

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/sport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "body-measurement", measurement: form }),
      });
      const json = await res.json();
      if (json.success) {
        setForm({});
        setShowForm(false);
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  // For body fat & waist, a decrease is "good" (green); for muscle/weight context-dependent.
  const trendColor = (key: string, delta: number) => {
    const lowerIsBetter = key === "bodyFatPct" || key === "waistCm";
    if (delta === 0) return "text-slate-400";
    const good = lowerIsBetter ? delta < 0 : delta > 0;
    return good ? "text-emerald-600" : "text-rose-500";
  };

  return (
    <div className="space-y-5">
      <Card className="border-emerald-100">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-5 w-5 text-emerald-600" /> {t("title")}
          </CardTitle>
          <Button size="sm" onClick={() => setShowForm((v) => !v)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="me-1 h-4 w-4" /> {t("addMeasurement")}
          </Button>
        </CardHeader>
        <CardContent>
          {showForm && (
            <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs font-medium text-slate-600">{t(f.key)}</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={form[f.key] || ""}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    placeholder="—"
                  />
                </div>
              ))}
              <div className="col-span-2 flex items-end sm:col-span-3">
                <Button onClick={save} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  {saving ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : <Save className="me-1 h-4 w-4" />}
                  {t("save")}
                </Button>
              </div>
            </div>
          )}

          {/* Comparison summary */}
          {comparison ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(["weightKg", "bodyFatPct", "muscleMassKg", "waistCm"] as const).map((key) => {
                const delta = comparison[key];
                return (
                  <div key={key} className="rounded-xl border border-slate-100 bg-white p-3 text-center">
                    <p className="text-xs text-slate-500">{t(key)}</p>
                    {delta === null ? (
                      <p className="mt-1 text-lg font-bold text-slate-300">—</p>
                    ) : (
                      <p className={`mt-1 flex items-center justify-center gap-1 text-lg font-bold ${trendColor(key, delta)}`}>
                        {delta > 0 ? <ArrowUp className="h-4 w-4" /> : delta < 0 ? <ArrowDown className="h-4 w-4" /> : null}
                        {Math.abs(delta)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            !loading && (
              <p className="py-4 text-center text-sm text-slate-400">{t("needTwo")}</p>
            )
          )}
        </CardContent>
      </Card>

      {/* History table */}
      <Card className="border-slate-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-600">{t("history")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-slate-400">
                    <th className="px-2 py-2 text-start">{t("date")}</th>
                    <th className="px-2 py-2">{t("weightKg")}</th>
                    <th className="px-2 py-2">{t("bodyFatPct")}</th>
                    <th className="px-2 py-2">{t("muscleMassKg")}</th>
                    <th className="px-2 py-2">{t("waistCm")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...rows].reverse().map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 text-center">
                      <td className="px-2 py-2 text-start text-slate-600">
                        {new Date(r.measuredAt).toLocaleDateString(locale === "ar" ? "ar" : "en")}
                      </td>
                      <td className="px-2 py-2 font-medium text-slate-800">{r.weightKg ?? "—"}</td>
                      <td className="px-2 py-2 text-slate-700">{r.bodyFatPct ?? "—"}</td>
                      <td className="px-2 py-2 text-slate-700">{r.muscleMassKg ?? "—"}</td>
                      <td className="px-2 py-2 text-slate-700">{r.waistCm ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
