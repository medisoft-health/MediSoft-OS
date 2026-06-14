"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface JourneyEvent {
  id: number;
  event_type: string;
  event_date: string;
  title_ar: string;
  title_en: string;
  description_ar?: string;
  description_en?: string;
  icon?: string;
  color?: string;
  is_milestone: boolean;
  metadata?: any;
}

interface Goal {
  id: number;
  goal_type: string;
  target_value: number;
  current_value: number;
  start_value: number;
  unit: string;
  progress_pct: number;
  status: string;
  target_date?: string;
}

interface LevelInfo {
  level: number;
  title: string;
  titleAr: string;
  titleEn: string;
  totalXp: number;
  xpForNext: number;
  progressPct: number;
}

interface Streak {
  streak_type: string;
  current_count: number;
  longest_count: number;
}

export default function JourneyPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);
  const [events, setEvents] = useState<JourneyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);

  useEffect(() => {
    fetchSummary();
    fetchTimeline(1);
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await fetch("/api/sport/journey?action=journey-summary");
      const data = await res.json();
      setSummary(data);
    } catch {}
  };

  const fetchTimeline = async (p: number) => {
    try {
      const res = await fetch(`/api/sport/journey?action=timeline&page=${p}`);
      const data = await res.json();
      if (p === 1) setEvents(data.events || []);
      else setEvents(prev => [...prev, ...(data.events || [])]);
      setTotalEvents(data.total || 0);
      setPage(p);
    } catch {}
    setLoading(false);
  };

  const GOAL_LABELS: Record<string, { ar: string; icon: string }> = {
    lose_weight: { ar: "خسارة وزن", icon: "⚖️" },
    gain_muscle: { ar: "بناء عضلات", icon: "💪" },
    improve_endurance: { ar: "تحسين التحمل", icon: "🏃" },
    flexibility: { ar: "مرونة", icon: "🧘" },
    health_markers: { ar: "تحسين المؤشرات", icon: "📊" },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-emerald-400 text-lg">جاري التحميل...</div>
      </div>
    );
  }

  const level: LevelInfo = summary?.level || { level: 1, title: 'rookie', titleAr: 'مبتدئ', totalXp: 0, xpForNext: 200, progressPct: 0 };
  const streaks: Streak[] = summary?.streaks || [];
  const goals: Goal[] = summary?.goals || [];
  const checkinStreak = streaks.find(s => s.streak_type === 'checkin');
  const todayCheckin = summary?.todayCheckin;
  const trainingBlocked = summary?.trainingBlocked;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900/90 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-white">رحلتي 🚀</h1>
          <button
            onClick={() => router.push("/ar/trainee")}
            className="text-gray-400 hover:text-white text-sm"
          >
            الرئيسية
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Training Blocked Alert */}
        {trainingBlocked && (
          <div className="bg-red-900/50 border border-red-500 rounded-xl p-4 flex items-start gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="text-red-300 font-bold">التمرين متوقف مؤقتاً</p>
              <p className="text-red-400 text-sm">بياناتك تحتاج مراجعة طبية. لا تتمرن حتى تستشير طبيبك.</p>
            </div>
          </div>
        )}

        {/* Level Card */}
        <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 rounded-2xl p-5 border border-emerald-700/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-2xl">
                {level.level <= 3 ? "🌱" : level.level <= 6 ? "⚔️" : level.level <= 8 ? "🏆" : "👑"}
              </div>
              <div>
                <p className="text-emerald-300 font-bold text-lg">المستوى {level.level}</p>
                <p className="text-emerald-400/70 text-sm">{level.titleAr}</p>
              </div>
            </div>
            <div className="text-end">
              <p className="text-emerald-300 font-bold">{level.totalXp} XP</p>
              <p className="text-emerald-400/60 text-xs">{level.xpForNext} للمستوى التالي</p>
            </div>
          </div>
          <div className="w-full bg-gray-700/50 rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000"
              style={{ width: `${level.progressPct}%` }}
            />
          </div>
        </div>

        {/* Quick Actions Row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Check-in Button */}
          <button
            onClick={() => router.push("/ar/trainee/journey/checkin")}
            className={`p-4 rounded-xl border text-center transition-all ${
              todayCheckin
                ? "bg-emerald-900/30 border-emerald-700/50"
                : "bg-amber-900/30 border-amber-600/50 animate-pulse"
            }`}
          >
            <span className="text-2xl block mb-1">{todayCheckin ? "✅" : "🌅"}</span>
            <span className="text-xs text-gray-300">{todayCheckin ? "تم" : "سجّل يومك"}</span>
          </button>

          {/* Streak */}
          <div className="p-4 rounded-xl border border-gray-700 bg-gray-800/50 text-center">
            <span className="text-2xl block mb-1">🔥</span>
            <span className="text-white font-bold">{checkinStreak?.current_count || 0}</span>
            <span className="text-xs text-gray-400 block">أيام متتالية</span>
          </div>

          {/* Achievements */}
          <button
            onClick={() => router.push("/ar/trainee/journey/achievements")}
            className="p-4 rounded-xl border border-gray-700 bg-gray-800/50 text-center hover:border-emerald-600 transition-all"
          >
            <span className="text-2xl block mb-1">🏅</span>
            <span className="text-xs text-gray-300">الإنجازات</span>
          </button>
        </div>

        {/* Active Goals */}
        {goals.length > 0 && (
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <span>🎯</span> أهدافي
            </h3>
            <div className="space-y-3">
              {goals.map((g: Goal) => (
                <div key={g.id} className="flex items-center gap-3">
                  <span className="text-xl">{GOAL_LABELS[g.goal_type]?.icon || "🎯"}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{GOAL_LABELS[g.goal_type]?.ar || g.goal_type}</span>
                      <span className="text-emerald-400">{g.progress_pct}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${g.progress_pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="mt-6">
          <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <span>📅</span> شريط حياتك الصحية
          </h3>

          {events.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <span className="text-4xl block mb-3">🌟</span>
              <p>رحلتك تبدأ من هنا!</p>
              <p className="text-sm mt-1">سجّل أول check-in لتبدأ شريطك الزمني</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute top-0 bottom-0 start-5 w-0.5 bg-gray-700" />

              {events.map((event, idx) => (
                <div key={event.id} className="relative flex gap-4 mb-4">
                  {/* Timeline dot */}
                  <div
                    className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      event.is_milestone
                        ? "bg-amber-500/20 border-2 border-amber-400"
                        : "bg-gray-800 border-2 border-gray-600"
                    }`}
                    style={event.color ? { borderColor: event.color } : {}}
                  >
                    <span className="text-lg">{event.icon || "📌"}</span>
                  </div>

                  {/* Event card */}
                  <div className={`flex-1 rounded-xl p-3 ${
                    event.is_milestone
                      ? "bg-amber-900/20 border border-amber-700/30"
                      : "bg-gray-800/50 border border-gray-700/50"
                  }`}>
                    <div className="flex justify-between items-start">
                      <p className={`font-medium ${event.is_milestone ? "text-amber-300" : "text-white"}`}>
                        {event.title_ar}
                      </p>
                      <span className="text-xs text-gray-500">
                        {new Date(event.event_date).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    {event.description_ar && (
                      <p className="text-gray-400 text-sm mt-1">{event.description_ar}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Load more */}
              {events.length < totalEvents && (
                <button
                  onClick={() => fetchTimeline(page + 1)}
                  className="w-full py-3 text-emerald-400 hover:text-emerald-300 text-sm font-medium"
                >
                  عرض المزيد...
                </button>
              )}
            </div>
          )}
        </div>

        {/* Estimated completion */}
        {goals.length > 0 && goals[0].target_date && (
          <div className="bg-gray-800/30 rounded-xl p-4 border border-dashed border-gray-600 text-center">
            <p className="text-gray-400 text-sm">لو كملت بنفس المعدل</p>
            <p className="text-emerald-400 font-bold mt-1">
              هتوصل هدفك بتاريخ {new Date(goals[0].target_date).toLocaleDateString("ar-SA")}
            </p>
            <div className="mt-2 text-gray-500 text-xs">- - - - - - - - →</div>
          </div>
        )}
      </div>
    </div>
  );
}
