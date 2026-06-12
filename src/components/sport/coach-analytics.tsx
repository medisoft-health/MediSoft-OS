"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Award, BarChart3, LineChart as LineChartIcon, Loader2, Star, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * MediSport — Coach Analytics (shared, mirrored component).
 *
 * Renders a coach's verification-score progression, rating trend, star
 * distribution, sub-criteria averages, client counts, and recent reviews.
 * Data comes from `GET /api/sport?action=coach-analytics` (self-scoped).
 */

type Reason = "recompute" | "review" | "admin" | "cert" | "submit";

interface HistoryPoint {
  date: string;
  total: number;
  tier: string | null;
  ratingAvg: number;
  ratingCount: number;
  reason: Reason;
}

interface AnalyticsData {
  current: {
    score: number;
    tier: string | null;
    breakdown: Record<string, number> | null;
    ratingAvg: number;
    ratingCount: number;
    verificationStatus: string | null;
  } | null;
  history: HistoryPoint[];
  reviews: {
    total: number;
    distribution: number[]; // [1★,2★,3★,4★,5★]
    avgCommunication: number | null;
    avgResults: number | null;
    recent: Array<{
      stars: number;
      comment: string | null;
      communication: number | null;
      results: number | null;
      createdAt: string;
    }>;
  };
  clients: { active: number; pending: number };
}

const TIER_META: Record<string, { ar: string; en: string; cls: string }> = {
  bronze: { ar: "برونزي", en: "Bronze", cls: "bg-amber-100 text-amber-700" },
  silver: { ar: "فضي", en: "Silver", cls: "bg-slate-200 text-slate-700" },
  gold: { ar: "ذهبي", en: "Gold", cls: "bg-yellow-100 text-yellow-700" },
  elite: { ar: "نخبة", en: "Elite", cls: "bg-emerald-100 text-emerald-700" },
};

export function CoachAnalytics({ locale }: { locale: "ar" | "en" }) {
  const isAr = locale === "ar";
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/sport?action=coach-analytics", { cache: "no-store" });
        const json = await res.json();
        if (!active) return;
        if (json?.success) setData(json.data as AnalyticsData);
        else setError(json?.error || "error");
      } catch {
        if (active) setError("network");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin me-2" />
        {isAr ? "جارٍ تحميل التحليلات…" : "Loading analytics…"}
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-slate-100">
        <CardContent className="p-6 text-center text-sm text-slate-500">
          {isAr ? "تعذّر تحميل التحليلات. حاول لاحقًا." : "Could not load analytics. Try again later."}
        </CardContent>
      </Card>
    );
  }

  const { current, history, reviews, clients } = data;
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(isAr ? "ar-EG" : "en-GB", { month: "short", day: "numeric" });

  const scoreSeries = history.map((h) => ({ x: fmtDate(h.date), score: h.total, rating: h.ratingAvg }));
  const maxDist = Math.max(1, ...reviews.distribution);
  const tierMeta = current?.tier ? TIER_META[current.tier] : null;

  const breakdownEntries = current?.breakdown
    ? Object.entries(current.breakdown).filter(([, v]) => typeof v === "number")
    : [];
  const breakdownLabels: Record<string, { ar: string; en: string }> = {
    education: { ar: "المؤهل العلمي", en: "Education" },
    certifications: { ar: "الشهادات", en: "Certifications" },
    experience: { ar: "الخبرة", en: "Experience" },
    profileCompleteness: { ar: "اكتمال الملف", en: "Profile" },
    adminDiscretion: { ar: "تقدير الأدمن", en: "Admin" },
    performance: { ar: "الأداء", en: "Performance" },
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-slate-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <Award className="h-4 w-4 text-emerald-500" />
              {isAr ? "النقاط" : "Score"}
            </div>
            <div className="text-2xl font-bold text-slate-900">{current?.score ?? 0}</div>
            <div className="text-xs text-slate-400">/ 100</div>
          </CardContent>
        </Card>
        <Card className="border-slate-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <Star className="h-4 w-4 text-amber-500" />
              {isAr ? "التقييم" : "Rating"}
            </div>
            <div className="text-2xl font-bold text-slate-900">{(current?.ratingAvg ?? 0).toFixed(1)}</div>
            <div className="text-xs text-slate-400">
              {current?.ratingCount ?? 0} {isAr ? "تقييم" : "reviews"}
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <Users className="h-4 w-4 text-blue-500" />
              {isAr ? "المتدربون" : "Clients"}
            </div>
            <div className="text-2xl font-bold text-slate-900">{clients.active}</div>
            <div className="text-xs text-slate-400">
              {clients.pending} {isAr ? "قيد الانتظار" : "pending"}
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              {isAr ? "الفئة" : "Tier"}
            </div>
            <div className="mt-1">
              {tierMeta ? (
                <Badge className={tierMeta.cls}>{isAr ? tierMeta.ar : tierMeta.en}</Badge>
              ) : (
                <span className="text-sm text-slate-400">—</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score progression */}
      <Card className="border-slate-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <LineChartIcon className="h-4 w-4 text-emerald-500" />
            {isAr ? "تطوّر نقاط التوثيق" : "Verification Score Progression"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scoreSeries.length >= 2 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={scoreSeries} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0E9F6E" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0E9F6E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                <XAxis dataKey="x" tick={{ fontSize: 11 }} reversed={isAr} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} orientation={isAr ? "right" : "left"} />
                <Tooltip />
                <Area type="monotone" dataKey="score" stroke="#0E9F6E" strokeWidth={2} fill="url(#scoreFill)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart isAr={isAr} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Rating trend */}
        <Card className="border-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              {isAr ? "تطوّر التقييم" : "Rating Trend"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scoreSeries.length >= 2 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={scoreSeries} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                  <XAxis dataKey="x" tick={{ fontSize: 11 }} reversed={isAr} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} orientation={isAr ? "right" : "left"} />
                  <Tooltip />
                  <Line type="monotone" dataKey="rating" stroke="#F59E0B" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart isAr={isAr} />
            )}
          </CardContent>
        </Card>

        {/* Star distribution */}
        <Card className="border-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              {isAr ? "توزيع النجوم" : "Star Distribution"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reviews.total > 0 ? (
              <div className="space-y-2 py-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviews.distribution[star - 1] || 0;
                  const pct = Math.round((count / maxDist) * 100);
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="flex items-center gap-0.5 w-10 text-xs text-slate-500">
                        {star} <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-end text-xs text-slate-500">{count}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyChart isAr={isAr} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Score breakdown + sub-criteria */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              {isAr ? "تفصيل النقاط" : "Score Breakdown"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {breakdownEntries.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={breakdownEntries.map(([k, v]) => ({
                    name: isAr ? breakdownLabels[k]?.ar ?? k : breakdownLabels[k]?.en ?? k,
                    value: v as number,
                  }))}
                  margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} reversed={isAr} />
                  <YAxis tick={{ fontSize: 11 }} orientation={isAr ? "right" : "left"} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0E9F6E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart isAr={isAr} />
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              {isAr ? "متوسط المحاور" : "Sub-criteria Averages"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 py-2">
            <SubBar
              label={isAr ? "التواصل" : "Communication"}
              value={reviews.avgCommunication}
              isAr={isAr}
            />
            <SubBar label={isAr ? "النتائج" : "Results"} value={reviews.avgResults} isAr={isAr} />
            <div className="pt-2 text-xs text-slate-400">
              {isAr
                ? `بناءً على ${reviews.total} تقييم.`
                : `Based on ${reviews.total} reviews.`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent reviews */}
      <Card className="border-slate-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-700">
            {isAr ? "أحدث المراجعات" : "Recent Reviews"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.recent.length ? (
            <div className="space-y-3">
              {reviews.recent.map((r, i) => (
                <div key={i} className="flex items-start gap-3 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-0.5 shrink-0">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${s < r.stars ? "text-amber-400 fill-amber-400" : "text-slate-200"}`}
                      />
                    ))}
                  </div>
                  <div className="min-w-0">
                    {r.comment ? (
                      <p className="text-sm text-slate-700 line-clamp-2">{r.comment}</p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">{isAr ? "بدون تعليق" : "No comment"}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(r.createdAt).toLocaleDateString(isAr ? "ar-EG" : "en-GB")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">
              {isAr ? "لا توجد مراجعات بعد." : "No reviews yet."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SubBar({ label, value, isAr }: { label: string; value: number | null; isAr: boolean }) {
  const pct = value != null ? (value / 5) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-slate-600">{label}</span>
        <span className="text-sm font-medium text-slate-800">
          {value != null ? value.toFixed(1) : isAr ? "—" : "—"}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EmptyChart({ isAr }: { isAr: boolean }) {
  return (
    <div className="h-40 flex items-center justify-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
      {isAr ? "لا تتوفر بيانات كافية بعد" : "Not enough data yet"}
    </div>
  );
}
