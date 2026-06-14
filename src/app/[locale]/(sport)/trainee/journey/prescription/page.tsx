"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface PrescriptionCondition {
  marker: string;
  markerAr: string;
  value: number;
  unit: string;
  status: string;
  statusAr: string;
  recommendation: string;
  recommendationAr: string;
  restrictions: string[];
  restrictionsAr: string[];
}

interface Prescription {
  id: number;
  conditions: PrescriptionCondition[];
  max_intensity_pct: number;
  max_days_per_week: number;
  created_at: string;
  valid_until?: string;
}

export default function PrescriptionPage() {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const res = await fetch("/api/sport/journey?action=my-prescriptions");
      const data = await res.json();
      setPrescriptions(data.prescriptions || []);
    } catch {}
    setLoading(false);
  };

  const generateFromLatestLabs = async () => {
    setGenerating(true);
    try {
      // Get latest lab results
      const labRes = await fetch("/api/sport?action=my-lab-results");
      const labData = await labRes.json();
      const latestLab = labData.results?.[0];
      
      if (!latestLab) {
        alert("لا توجد تحاليل مسجلة. ارفع تحاليلك أولاً من صفحة التحاليل.");
        setGenerating(false);
        return;
      }

      const markers = (latestLab.markers || []).map((m: any) => ({
        name: m.name,
        value: parseFloat(m.value),
        unit: m.unit,
      }));

      const res = await fetch("/api/sport/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-prescription",
          labResultId: latestLab.id,
          markers,
        }),
      });
      const data = await res.json();
      if (data.prescription) {
        fetchPrescriptions(); // Refresh
      } else if (data.message) {
        alert("جميع المؤشرات طبيعية! لا حاجة لقيود على التدريب.");
      }
    } catch {
      alert("حدث خطأ");
    }
    setGenerating(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const SEVERITY_COLORS: Record<string, string> = {
    critical_low: "bg-red-900/50 border-red-500 text-red-300",
    low: "bg-amber-900/50 border-amber-500 text-amber-300",
    high: "bg-amber-900/50 border-amber-500 text-amber-300",
    critical_high: "bg-red-900/50 border-red-500 text-red-300",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-emerald-400">جاري التحميل...</div>
      </div>
    );
  }

  const latest = prescriptions[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900/90 backdrop-blur border-b border-gray-800 px-4 py-3 print:hidden">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
            ← رجوع
          </button>
          <h1 className="text-lg font-bold text-white">الوصفة الرياضية 📋</h1>
          <button onClick={handlePrint} className="text-emerald-400 hover:text-emerald-300 text-sm">
            طباعة
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4" ref={printRef}>
        {/* Generate Button */}
        <button
          onClick={generateFromLatestLabs}
          disabled={generating}
          className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 print:hidden"
        >
          {generating ? (
            <span className="animate-pulse">جاري التحليل...</span>
          ) : (
            <>
              <span>🔬</span>
              <span>إنشاء وصفة من آخر تحاليل</span>
            </>
          )}
        </button>

        {/* No prescriptions */}
        {prescriptions.length === 0 && (
          <div className="text-center py-12">
            <span className="text-5xl block mb-4">📋</span>
            <p className="text-gray-400 text-lg">لا توجد وصفات رياضية بعد</p>
            <p className="text-gray-500 text-sm mt-2">ارفع تحاليلك واضغط "إنشاء وصفة" لتحصل على وصفة رياضية مخصصة</p>
          </div>
        )}

        {/* Latest Prescription */}
        {latest && (
          <div className="space-y-4">
            {/* Prescription Header */}
            <div className="bg-gray-800/80 rounded-2xl p-5 border border-emerald-700/30">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-white font-bold text-lg">وصفة رياضية طبية</h2>
                  <p className="text-gray-400 text-sm">
                    {new Date(latest.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
                <div className="bg-emerald-500/20 rounded-full px-3 py-1">
                  <span className="text-emerald-400 text-sm font-bold">MediSport</span>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-700/50 rounded-xl p-3 text-center">
                  <p className="text-gray-400 text-xs">الشدة القصوى</p>
                  <p className="text-2xl font-bold text-amber-400">{latest.max_intensity_pct}%</p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-3 text-center">
                  <p className="text-gray-400 text-xs">أيام التمرين/أسبوع</p>
                  <p className="text-2xl font-bold text-emerald-400">{latest.max_days_per_week}</p>
                </div>
              </div>

              {/* Warning */}
              {latest.max_intensity_pct <= 50 && (
                <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 flex items-start gap-2">
                  <span className="text-xl">⚠️</span>
                  <p className="text-red-300 text-sm">
                    بياناتك تتطلب تقليل شدة التمرين بشكل كبير. استشر طبيبك قبل أي نشاط مكثف.
                  </p>
                </div>
              )}
            </div>

            {/* Conditions */}
            <h3 className="text-white font-bold flex items-center gap-2">
              <span>🔬</span> المؤشرات المؤثرة
            </h3>
            
            {latest.conditions.map((condition: PrescriptionCondition, idx: number) => (
              <div
                key={idx}
                className={`rounded-xl p-4 border ${SEVERITY_COLORS[condition.status] || "bg-gray-800 border-gray-700 text-gray-300"}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold">{condition.markerAr}</p>
                    <p className="text-sm opacity-70">{condition.marker}</p>
                  </div>
                  <div className="text-end">
                    <p className="font-bold">{condition.value} {condition.unit}</p>
                    <p className="text-xs opacity-70">{condition.statusAr}</p>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-sm font-medium mb-1">📌 التوصية:</p>
                  <p className="text-sm opacity-90">{condition.recommendationAr}</p>
                </div>

                {condition.restrictionsAr && condition.restrictionsAr.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium mb-1">🚫 القيود:</p>
                    <ul className="text-sm opacity-80 space-y-1">
                      {condition.restrictionsAr.map((r, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span>•</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}

            {/* Disclaimer */}
            <div className="bg-gray-800/30 rounded-xl p-4 border border-dashed border-gray-600">
              <p className="text-gray-500 text-xs leading-relaxed">
                ⚕️ هذه الوصفة الرياضية مبنية على تحليل Medical Intelligence لنتائج تحاليلك المخبرية.
                هي ليست بديلاً عن الاستشارة الطبية المباشرة. استشر طبيبك دائماً قبل تغيير نظام تمرينك.
              </p>
              <p className="text-gray-600 text-xs mt-2 text-center">
                MediSport Medical Intelligence • {new Date().getFullYear()}
              </p>
            </div>
          </div>
        )}

        {/* Previous Prescriptions */}
        {prescriptions.length > 1 && (
          <div className="print:hidden">
            <h3 className="text-white font-bold mb-3">📜 الوصفات السابقة</h3>
            <div className="space-y-2">
              {prescriptions.slice(1).map((rx) => (
                <div key={rx.id} className="bg-gray-800/50 rounded-xl p-3 border border-gray-700 flex justify-between items-center">
                  <div>
                    <p className="text-gray-300 text-sm">
                      {new Date(rx.created_at).toLocaleDateString("ar-SA")}
                    </p>
                    <p className="text-gray-500 text-xs">{rx.conditions.length} مؤشرات</p>
                  </div>
                  <div className="text-end">
                    <p className="text-amber-400 font-bold">{rx.max_intensity_pct}%</p>
                    <p className="text-gray-500 text-xs">شدة قصوى</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
