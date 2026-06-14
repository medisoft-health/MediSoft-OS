"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Achievement {
  id: number;
  code: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  icon: string;
  category: string;
  tier: string;
  xp_reward: number;
  earned_at?: string;
}

interface LevelInfo {
  level: number;
  title: string;
  titleAr: string;
  totalXp: number;
  xpForNext: number;
  progressPct: number;
}

const TIER_COLORS: Record<string, string> = {
  bronze: "from-amber-700 to-amber-900 border-amber-600",
  silver: "from-gray-400 to-gray-600 border-gray-300",
  gold: "from-yellow-400 to-amber-500 border-yellow-300",
  platinum: "from-cyan-300 to-blue-400 border-cyan-200",
};

const CATEGORY_LABELS: Record<string, { ar: string; icon: string }> = {
  streak: { ar: "الاستمرارية", icon: "🔥" },
  workout: { ar: "التمارين", icon: "💪" },
  nutrition: { ar: "التغذية", icon: "🥗" },
  medical: { ar: "الصحة", icon: "🏥" },
  social: { ar: "المجتمع", icon: "👥" },
  milestone: { ar: "إنجازات كبرى", icon: "🏆" },
};

export default function AchievementsPage() {
  const router = useRouter();
  const [level, setLevel] = useState<LevelInfo | null>(null);
  const [earned, setEarned] = useState<Achievement[]>([]);
  const [all, setAll] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [levelRes, achieveRes] = await Promise.all([
        fetch("/api/sport/journey?action=my-level"),
        fetch("/api/sport/journey?action=my-achievements"),
      ]);
      const levelData = await levelRes.json();
      const achieveData = await achieveRes.json();
      setLevel(levelData.level);
      setEarned(achieveData.earned || []);
      setAll(achieveData.all || []);
    } catch {}
    setLoading(false);
  };

  const earnedCodes = new Set(earned.map((e) => e.code));
  const categories = ["all", ...Object.keys(CATEGORY_LABELS)];

  const filteredAll = selectedCategory === "all"
    ? all
    : all.filter((a) => a.category === selectedCategory);

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
          <h1 className="text-lg font-bold text-white">الإنجازات 🏅</h1>
          <div className="w-12" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-6">
        {/* Level Card */}
        {level && (
          <div className="bg-gradient-to-br from-emerald-900/60 to-teal-900/40 rounded-2xl p-6 border border-emerald-700/30 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-3">
              <span className="text-4xl">
                {level.level <= 2 ? "🌱" : level.level <= 4 ? "⚔️" : level.level <= 6 ? "🦁" : level.level <= 8 ? "🏆" : "👑"}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white">المستوى {level.level}</h2>
            <p className="text-emerald-400 font-medium">{level.titleAr}</p>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">{level.totalXp} XP</span>
                <span className="text-emerald-400">{level.xpForNext} XP للمستوى التالي</span>
              </div>
              <div className="w-full bg-gray-700/50 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000"
                  style={{ width: `${level.progressPct}%` }}
                />
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-3">
              {earned.length} / {all.length} إنجاز محقق
            </p>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-800/50 rounded-xl p-3 text-center border border-gray-700">
            <span className="text-2xl block">🏅</span>
            <span className="text-white font-bold text-lg">{earned.length}</span>
            <span className="text-gray-400 text-xs block">محقق</span>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-3 text-center border border-gray-700">
            <span className="text-2xl block">🔒</span>
            <span className="text-white font-bold text-lg">{all.length - earned.length}</span>
            <span className="text-gray-400 text-xs block">متبقي</span>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-3 text-center border border-gray-700">
            <span className="text-2xl block">⭐</span>
            <span className="text-white font-bold text-lg">{level?.totalXp || 0}</span>
            <span className="text-gray-400 text-xs block">XP</span>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
            >
              {cat === "all" ? "🎯 الكل" : `${CATEGORY_LABELS[cat]?.icon} ${CATEGORY_LABELS[cat]?.ar}`}
            </button>
          ))}
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-2 gap-3">
          {filteredAll.map((achievement) => {
            const isEarned = earnedCodes.has(achievement.code);
            const tierColor = TIER_COLORS[achievement.tier] || TIER_COLORS.bronze;

            return (
              <div
                key={achievement.id}
                className={`relative rounded-xl p-4 border text-center transition-all ${
                  isEarned
                    ? `bg-gradient-to-br ${tierColor} shadow-lg`
                    : "bg-gray-800/30 border-gray-700 opacity-60"
                }`}
              >
                {/* Lock overlay */}
                {!isEarned && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-900/40">
                    <span className="text-2xl">🔒</span>
                  </div>
                )}

                <span className="text-3xl block mb-2">{achievement.icon}</span>
                <p className={`font-bold text-sm ${isEarned ? "text-white" : "text-gray-500"}`}>
                  {achievement.title_ar}
                </p>
                <p className={`text-xs mt-1 ${isEarned ? "text-white/70" : "text-gray-600"}`}>
                  {achievement.description_ar}
                </p>
                {isEarned && (
                  <div className="mt-2 text-xs text-emerald-300">+{achievement.xp_reward} XP</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
