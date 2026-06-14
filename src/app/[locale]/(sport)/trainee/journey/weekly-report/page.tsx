"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface WeeklyReport {
  id: number;
  week_start: string;
  week_end: string;
  workouts_count: number;
  avg_calories_daily: number;
  avg_sleep_quality: number;
  streak_days: number;
  compliance_pct: number;
  highlights: { ar: string; en: string; type: string }[];
  recommendations: { ar: string; en: string; priority: string }[];
  generated_at: string;
}

export default function WeeklyReportPage() {
  const router = useRouter();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/sport/journey?action=weekly-reports");
      const data = await res.json();
      setReports(data.reports || []);
      if (data.reports?.length > 0) setSelectedReport(data.reports[0]);
    } catch {}
    setLoading(false);
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/sport/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-weekly-report" }),
      });
      const data = await res.json();
      if (data.report) {
        fetchReports();
      }
    } catch {}
    setGenerating(false);
  };

  const getComplianceColor = (pct: number) => {
    if (pct >= 80) return "text-emerald-400";
    if (pct >= 50) return "text-amber-400";
    return "text-red-400";
  };

  const getComplianceEmoji = (pct: number) => {
    if (pct >= 90) return "🌟";
    if (pct >= 80) return "💪";
    if (pct >= 60) return "👍";
    if (pct >= 40) return "🤔";
    return "😴";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-emerald-400">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900/90 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
            ← رجوع
          </button>
          <h1 className="text-lg font-bold text-white">التقرير الأسبوعي 📊</h1>
          <div className="w-12" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Generate Button */}
        <button
          onClick={generateReport}
          disabled={generating}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {generating ? "جاري التحليل..." : "📊 إنشاء تقرير هذا الأسبوع"}
        </button>

        {/* No reports */}
        {reports.length === 0 && (
          <div className="text-center py-12">
            <span className="text-5xl block mb-4">📊</span>
            <p className="text-gray-400">لا توجد تقارير بعد</p>
            <p className="text-gray-500 text-sm mt-2">اضغط الزر أعلاه لإنشاء أول تقرير أسبوعي</p>
          </div>
        )}

        {/* Selected Report */}
        {selectedReport && (
          <div className="space-y-4">
            {/* Compliance Score */}
            <div className="bg-gray-800/80 rounded-2xl p-6 border border-gray-700 text-center">
              <p className="text-gray-400 text-sm mb-2">نسبة الالتزام هذا الأسبوع</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl">{getComplianceEmoji(selectedReport.compliance_pct)}</span>
                <span className={`text-5xl font-bold ${getComplianceColor(selectedReport.compliance_pct)}`}>
                  {selectedReport.compliance_pct}%
                </span>
              </div>
              <p className="text-gray-500 text-xs mt-2">
                {new Date(selectedReport.week_start).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                {" — "}
                {new Date(selectedReport.week_end).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
                <span className="text-2xl block mb-1">🏋️</span>
                <p className="text-white font-bold text-xl">{selectedReport.workouts_count}</p>
                <p className="text-gray-400 text-xs">جلسات تمرين</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
                <span className="text-2xl block mb-1">🍽️</span>
                <p className="text-white font-bold text-xl">{selectedReport.avg_calories_daily || "—"}</p>
                <p className="text-gray-400 text-xs">سعرة/يوم (متوسط)</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
                <span className="text-2xl block mb-1">😴</span>
                <p className="text-white font-bold text-xl">
                  {selectedReport.avg_sleep_quality ? selectedReport.avg_sleep_quality.toFixed(1) : "—"}
                </p>
                <p className="text-gray-400 text-xs">جودة النوم</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
                <span className="text-2xl block mb-1">🔥</span>
                <p className="text-white font-bold text-xl">{selectedReport.streak_days}</p>
                <p className="text-gray-400 text-xs">أيام متتالية</p>
              </div>
            </div>

            {/* Highlights */}
            {selectedReport.highlights && selectedReport.highlights.length > 0 && (
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <span>⭐</span> أبرز الأحداث
                </h3>
                <div className="space-y-2">
                  {selectedReport.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">
                        {h.type === "positive" ? "✅" : h.type === "negative" ? "⚠️" : "📌"}
                      </span>
                      <p className="text-gray-300 text-sm">{h.ar}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {selectedReport.recommendations && selectedReport.recommendations.length > 0 && (
              <div className="bg-emerald-900/20 rounded-xl p-4 border border-emerald-700/30">
                <h3 className="text-emerald-300 font-bold mb-3 flex items-center gap-2">
                  <span>💡</span> توصيات الأسبوع القادم
                </h3>
                <div className="space-y-2">
                  {selectedReport.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className={`mt-0.5 ${r.priority === "high" ? "text-red-400" : "text-emerald-400"}`}>
                        {r.priority === "high" ? "🔴" : "🟢"}
                      </span>
                      <p className="text-gray-300 text-sm">{r.ar}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Previous Reports List */}
        {reports.length > 1 && (
          <div>
            <h3 className="text-white font-bold mb-3">📜 التقارير السابقة</h3>
            <div className="space-y-2">
              {reports.map((report, idx) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`w-full text-start p-3 rounded-xl border transition-all ${
                    selectedReport?.id === report.id
                      ? "bg-emerald-900/30 border-emerald-600"
                      : "bg-gray-800/50 border-gray-700 hover:border-gray-500"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-gray-300 text-sm">
                        {new Date(report.week_start).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                        {" — "}
                        {new Date(report.week_end).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                      </p>
                      <p className="text-gray-500 text-xs">{report.workouts_count} جلسات</p>
                    </div>
                    <div className={`font-bold ${getComplianceColor(report.compliance_pct)}`}>
                      {report.compliance_pct}%
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
