"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import {
  Search,
  Dumbbell,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Target,
  Zap,
  Star,
  RotateCcw,
  Loader2,
  X,
  Play,
  Crown,
  Gauge,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SportAuthGuard } from "@/components/sport/sport-auth-guard";

// ─── Types ───
interface ExerciseFromDB {
  id: number;
  exerciseId: string;
  name: string;
  gifUrl: string | null;
  bodyParts: string[];
  equipments: string[];
  targetMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  source: string;
  difficulty: string | null;
  forceType: string | null;
  mechanic: string | null;
  category: string | null;
  grips: string[];
  videoUrl: string | null;
  syncedAt: string;
}

interface FiltersData {
  bodyParts: string[];
  equipments: string[];
  targets: string[];
  sources: string[];
  difficulties: string[];
  forceTypes: string[];
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Body part display names (AR/EN) ───
const BODY_PART_NAMES: Record<string, { ar: string; en: string; icon: string }> = {
  "upper arms": { ar: "الذراعين العلوية", en: "Upper Arms", icon: "💪" },
  "upper legs": { ar: "الأرجل العلوية", en: "Upper Legs", icon: "🦵" },
  back: { ar: "الظهر", en: "Back", icon: "🔙" },
  waist: { ar: "الخصر", en: "Waist", icon: "🎯" },
  chest: { ar: "الصدر", en: "Chest", icon: "🏋️" },
  shoulders: { ar: "الأكتاف", en: "Shoulders", icon: "🤸" },
  "lower legs": { ar: "الأرجل السفلية", en: "Lower Legs", icon: "🦶" },
  "lower arms": { ar: "الذراعين السفلية", en: "Lower Arms", icon: "✊" },
  cardio: { ar: "الكارديو", en: "Cardio", icon: "❤️" },
  neck: { ar: "الرقبة", en: "Neck", icon: "🧣" },
  "full body": { ar: "الجسم الكامل", en: "Full Body", icon: "🏃" },
};

// ─── Equipment display names (AR/EN) ───
const EQUIPMENT_NAMES: Record<string, { ar: string; en: string }> = {
  "body weight": { ar: "وزن الجسم", en: "Body Weight" },
  dumbbell: { ar: "دمبل", en: "Dumbbell" },
  cable: { ar: "كابل", en: "Cable" },
  barbell: { ar: "بار", en: "Barbell" },
  "leverage machine": { ar: "جهاز رافعة", en: "Leverage Machine" },
  band: { ar: "حبل مقاومة", en: "Band" },
  "resistance band": { ar: "حبل مقاومة", en: "Resistance Band" },
  "smith machine": { ar: "جهاز سميث", en: "Smith Machine" },
  kettlebell: { ar: "كيتل بيل", en: "Kettlebell" },
  weighted: { ar: "أوزان", en: "Weighted" },
  "stability ball": { ar: "كرة توازن", en: "Stability Ball" },
  "ez barbell": { ar: "بار EZ", en: "EZ Barbell" },
  "olympic barbell": { ar: "بار أولمبي", en: "Olympic Barbell" },
  machine: { ar: "جهاز", en: "Machine" },
  "medicine ball": { ar: "كرة طبية", en: "Medicine Ball" },
  "bosu ball": { ar: "كرة بوسو", en: "Bosu Ball" },
  rope: { ar: "حبل", en: "Rope" },
  roller: { ar: "رولر", en: "Roller" },
  "foam roller": { ar: "فوم رولر", en: "Foam Roller" },
  assisted: { ar: "مساعد", en: "Assisted" },
  trx: { ar: "TRX", en: "TRX" },
  plate: { ar: "صفيحة", en: "Plate" },
  cardio: { ar: "كارديو", en: "Cardio" },
};

// ─── Difficulty display ───
const DIFFICULTY_NAMES: Record<string, { ar: string; en: string; color: string }> = {
  beginner: { ar: "مبتدئ", en: "Beginner", color: "bg-green-50 text-green-700 border-green-200" },
  intermediate: { ar: "متوسط", en: "Intermediate", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  advanced: { ar: "متقدم", en: "Advanced", color: "bg-red-50 text-red-700 border-red-200" },
};

// ─── Force type display ───
const FORCE_NAMES: Record<string, { ar: string; en: string }> = {
  push: { ar: "دفع", en: "Push" },
  pull: { ar: "سحب", en: "Pull" },
  static: { ar: "ثابت", en: "Static" },
  compound: { ar: "مركب", en: "Compound" },
};

export default function ExerciseLibraryPage() {
  return (
    <SportAuthGuard requiredRole="trainee">
      <ExerciseLibraryContent />
    </SportAuthGuard>
  );
}

function ExerciseLibraryContent() {
  const locale = useLocale();
  const isRtl = locale === "ar";

  // State
  const [exercises, setExercises] = React.useState<ExerciseFromDB[]>([]);
  const [filters, setFilters] = React.useState<FiltersData | null>(null);
  const [meta, setMeta] = React.useState<PaginationMeta>({ total: 0, page: 1, limit: 24, totalPages: 0 });
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedBodyPart, setSelectedBodyPart] = React.useState("all");
  const [selectedEquipment, setSelectedEquipment] = React.useState("all");
  const [selectedTarget, setSelectedTarget] = React.useState("all");
  const [selectedSource, setSelectedSource] = React.useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = React.useState("all");
  const [selectedForceType, setSelectedForceType] = React.useState("all");
  const [showFilters, setShowFilters] = React.useState(false);
  const [expandedExercise, setExpandedExercise] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch filters on mount
  React.useEffect(() => {
    fetch("/api/sport?action=exercise-library-filters")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setFilters(d.data);
      })
      .catch(console.error);
  }, []);

  // Fetch exercises
  React.useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ action: "exercise-library", page: String(page), limit: "24" });
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (selectedBodyPart !== "all") params.set("bodyPart", selectedBodyPart);
    if (selectedEquipment !== "all") params.set("equipment", selectedEquipment);
    if (selectedTarget !== "all") params.set("target", selectedTarget);
    if (selectedSource !== "all") params.set("source", selectedSource);
    if (selectedDifficulty !== "all") params.set("difficulty", selectedDifficulty);
    if (selectedForceType !== "all") params.set("forceType", selectedForceType);

    fetch(`/api/sport?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setExercises(d.data);
          setMeta(d.meta);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, selectedBodyPart, selectedEquipment, selectedTarget, selectedSource, selectedDifficulty, selectedForceType]);

  const hasActiveFilters = selectedBodyPart !== "all" || selectedEquipment !== "all" || selectedTarget !== "all" || selectedSource !== "all" || selectedDifficulty !== "all" || selectedForceType !== "all";

  const resetFilters = () => {
    setSelectedBodyPart("all");
    setSelectedEquipment("all");
    setSelectedTarget("all");
    setSelectedSource("all");
    setSelectedDifficulty("all");
    setSelectedForceType("all");
    setSearchQuery("");
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
            <Dumbbell className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isRtl ? "مكتبة التمارين" : "Exercise Library"}
            </h1>
            <p className="text-sm text-slate-500">
              {isRtl
                ? `${meta.total} تمرين • Medical Intelligence`
                : `${meta.total} exercises • Medical Intelligence`}
            </p>
          </div>
        </div>
        {/* Source stats */}
        <div className="flex items-center gap-2 mt-3">
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] gap-1">
            <Crown className="h-3 w-3" />
            {isRtl ? "MuscleWiki Premium" : "MuscleWiki Premium"}
          </Badge>
          <Badge className="bg-slate-50 text-slate-600 border border-slate-200 text-[10px]">
            ExerciseDB
          </Badge>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isRtl ? "ابحث عن تمرين..." : "Search exercises..."}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 ps-10 pe-10 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          dir={isRtl ? "rtl" : "ltr"}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute end-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Body Part Quick Filters */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide">
        <button
          onClick={() => { setSelectedBodyPart("all"); setPage(1); }}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
            selectedBodyPart === "all"
              ? "bg-emerald-500 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {isRtl ? "الكل" : "All"}
        </button>
        {Object.entries(BODY_PART_NAMES).map(([key, val]) => (
          <button
            key={key}
            onClick={() => { setSelectedBodyPart(key); setPage(1); }}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
              selectedBodyPart === key
                ? "bg-emerald-500 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {val.icon} {isRtl ? val.ar : val.en}
          </button>
        ))}
      </div>

      {/* Filter Toggle + Active Filters */}
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl gap-1.5 text-xs"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-3.5 w-3.5" />
          {isRtl ? "فلاتر متقدمة" : "Advanced Filters"}
          {hasActiveFilters && (
            <span className="ms-1 rounded-full bg-emerald-500 text-white text-[9px] px-1.5 py-0.5">
              {[selectedEquipment, selectedTarget, selectedSource, selectedDifficulty, selectedForceType].filter(f => f !== "all").length}
            </span>
          )}
        </Button>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            {isRtl ? "إعادة تعيين" : "Reset"}
          </button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <Card className="mb-4 border-slate-200/80 shadow-sm">
          <CardContent className="p-4 space-y-4">
            {/* Source Filter */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 block flex items-center gap-1">
                <Crown className="h-3 w-3" />
                {isRtl ? "المصدر" : "Source"}
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setSelectedSource("all"); setPage(1); }}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                    selectedSource === "all"
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {isRtl ? "الكل" : "All"}
                </button>
                <button
                  onClick={() => { setSelectedSource("musclewiki"); setPage(1); }}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all flex items-center gap-1 ${
                    selectedSource === "musclewiki"
                      ? "bg-amber-100 text-amber-700 border border-amber-200"
                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Crown className="h-3 w-3" /> MuscleWiki Premium
                </button>
                <button
                  onClick={() => { setSelectedSource("exercisedb"); setPage(1); }}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                    selectedSource === "exercisedb"
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  ExerciseDB
                </button>
              </div>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 block flex items-center gap-1">
                <Gauge className="h-3 w-3" />
                {isRtl ? "مستوى الصعوبة" : "Difficulty"}
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setSelectedDifficulty("all"); setPage(1); }}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                    selectedDifficulty === "all"
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {isRtl ? "الكل" : "All"}
                </button>
                {(filters?.difficulties || ["beginner", "intermediate", "advanced"]).map((d) => {
                  const info = DIFFICULTY_NAMES[d] || { ar: d, en: d, color: "bg-slate-50 text-slate-600 border-slate-200" };
                  return (
                    <button
                      key={d}
                      onClick={() => { setSelectedDifficulty(d); setPage(1); }}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all border ${
                        selectedDifficulty === d ? info.color : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {isRtl ? info.ar : info.en}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Force Type Filter */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 block flex items-center gap-1">
                <ArrowUpDown className="h-3 w-3" />
                {isRtl ? "نوع القوة" : "Force Type"}
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setSelectedForceType("all"); setPage(1); }}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                    selectedForceType === "all"
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {isRtl ? "الكل" : "All"}
                </button>
                {(filters?.forceTypes || []).map((ft) => {
                  const info = FORCE_NAMES[ft] || { ar: ft, en: ft };
                  return (
                    <button
                      key={ft}
                      onClick={() => { setSelectedForceType(ft); setPage(1); }}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                        selectedForceType === ft
                          ? "bg-purple-100 text-purple-700 border border-purple-200"
                          : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {isRtl ? info.ar : info.en}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Equipment Filter */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 block">
                {isRtl ? "المعدات" : "Equipment"}
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                <button
                  onClick={() => { setSelectedEquipment("all"); setPage(1); }}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                    selectedEquipment === "all"
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {isRtl ? "الكل" : "All"}
                </button>
                {(filters?.equipments || []).map((eq) => {
                  const info = EQUIPMENT_NAMES[eq] || { ar: eq, en: eq };
                  return (
                    <button
                      key={eq}
                      onClick={() => { setSelectedEquipment(eq); setPage(1); }}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                        selectedEquipment === eq
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {isRtl ? info.ar : info.en}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Muscle Filter */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 block">
                {isRtl ? "العضلة المستهدفة" : "Target Muscle"}
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                <button
                  onClick={() => { setSelectedTarget("all"); setPage(1); }}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                    selectedTarget === "all"
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {isRtl ? "الكل" : "All"}
                </button>
                {(filters?.targets || []).map((tg) => (
                  <button
                    key={tg}
                    onClick={() => { setSelectedTarget(tg); setPage(1); }}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all capitalize ${
                      selectedTarget === tg
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {tg}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
        </div>
      )}

      {/* Exercise Grid */}
      {!loading && exercises.length === 0 && (
        <div className="text-center py-12">
          <Dumbbell className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            {isRtl ? "لا توجد تمارين مطابقة" : "No matching exercises"}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {isRtl ? "جرب تغيير الفلاتر أو البحث" : "Try changing filters or search"}
          </p>
        </div>
      )}

      {!loading && exercises.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.exerciseId}
                exercise={exercise}
                isRtl={isRtl}
                expanded={expandedExercise === exercise.exerciseId}
                onToggle={() =>
                  setExpandedExercise(
                    expandedExercise === exercise.exerciseId ? null : exercise.exerciseId
                  )
                }
              />
            ))}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
              <span className="text-sm text-slate-600 font-medium px-3">
                {isRtl
                  ? `صفحة ${page} من ${meta.totalPages}`
                  : `Page ${page} of ${meta.totalPages}`}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
              >
                {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Exercise Card Component ───
function ExerciseCard({
  exercise,
  isRtl,
  expanded,
  onToggle,
}: {
  exercise: ExerciseFromDB;
  isRtl: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const bodyPart = exercise.bodyParts?.[0] || "";
  const equipment = exercise.equipments?.[0] || "";
  const target = exercise.targetMuscles?.[0] || "";
  const bpInfo = BODY_PART_NAMES[bodyPart] || { ar: bodyPart, en: bodyPart, icon: "💪" };
  const eqInfo = EQUIPMENT_NAMES[equipment] || { ar: equipment, en: equipment };
  const isPremium = exercise.source === "musclewiki";
  const diffInfo = exercise.difficulty ? DIFFICULTY_NAMES[exercise.difficulty] : null;
  const forceInfo = exercise.forceType ? FORCE_NAMES[exercise.forceType] : null;

  const mediaUrl = exercise.videoUrl || exercise.gifUrl;
  const hasVideo = !!exercise.videoUrl;

  return (
    <Card
      className={`border-slate-200/80 shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer overflow-hidden ${
        expanded ? "ring-2 ring-emerald-200 border-emerald-300 col-span-1 sm:col-span-2" : ""
      } ${isPremium ? "border-amber-200/60" : ""}`}
      onClick={onToggle}
    >
      <CardContent className="p-0">
        {/* Card Header with thumbnail */}
        <div className="flex items-start gap-3 p-3">
          {/* Thumbnail */}
          <div className="relative h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-slate-100">
            {mediaUrl ? (
              hasVideo && !expanded ? (
                <div className="h-full w-full bg-gradient-to-br from-slate-200 to-slate-100 flex items-center justify-center">
                  <Play className="h-6 w-6 text-slate-400" />
                </div>
              ) : (
                <img
                  src={exercise.gifUrl || ""}
                  alt={exercise.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                <Dumbbell className="h-6 w-6 text-emerald-400" />
              </div>
            )}
            {/* Premium badge overlay */}
            {isPremium && (
              <div className="absolute top-0.5 start-0.5 bg-amber-400 rounded-md p-0.5">
                <Crown className="h-2.5 w-2.5 text-white" />
              </div>
            )}
            {/* Video indicator */}
            {hasVideo && !expanded && (
              <div className="absolute bottom-0.5 end-0.5 bg-black/60 rounded-md p-0.5">
                <Play className="h-2.5 w-2.5 text-white" />
              </div>
            )}
          </div>

          {/* Exercise info */}
          <div className="flex-1 min-w-0 py-0.5">
            <h3 className="font-semibold text-slate-800 text-sm leading-tight capitalize">
              {exercise.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <Badge variant="secondary" className="text-[10px] rounded-md bg-slate-100 px-1.5 py-0">
                {bpInfo.icon} {isRtl ? bpInfo.ar : bpInfo.en}
              </Badge>
              <Badge variant="secondary" className="text-[10px] rounded-md bg-blue-50 text-blue-700 px-1.5 py-0">
                {isRtl ? eqInfo.ar : eqInfo.en}
              </Badge>
              {diffInfo && (
                <Badge variant="secondary" className={`text-[10px] rounded-md px-1.5 py-0 border ${diffInfo.color}`}>
                  {isRtl ? diffInfo.ar : diffInfo.en}
                </Badge>
              )}
            </div>
            {target && (
              <p className="text-[11px] text-slate-500 mt-1 capitalize">
                <Target className="inline h-3 w-3 me-0.5" />
                {target}
              </p>
            )}
          </div>

          {/* Expand icon */}
          <div className="shrink-0 pt-1">
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="border-t border-slate-100 p-4 space-y-4">
            {/* Video or Large GIF */}
            <div className="relative w-full aspect-video max-h-72 rounded-xl overflow-hidden bg-slate-900 mx-auto">
              {hasVideo ? (
                <video
                  src={exercise.videoUrl!}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : exercise.gifUrl ? (
                <img
                  src={exercise.gifUrl}
                  alt={exercise.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Dumbbell className="h-12 w-12 text-slate-600" />
                </div>
              )}
              {/* Source badge on media */}
              <div className="absolute top-2 end-2">
                {isPremium ? (
                  <Badge className="bg-amber-400/90 text-white text-[9px] gap-0.5 backdrop-blur-sm">
                    <Crown className="h-2.5 w-2.5" /> MuscleWiki
                  </Badge>
                ) : (
                  <Badge className="bg-slate-700/80 text-white text-[9px] backdrop-blur-sm">
                    ExerciseDB
                  </Badge>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {exercise.bodyParts?.map((bp) => (
                <Badge key={bp} variant="secondary" className="text-[10px] rounded-lg bg-emerald-50 text-emerald-700 capitalize">
                  {BODY_PART_NAMES[bp]?.icon || "💪"} {isRtl ? (BODY_PART_NAMES[bp]?.ar || bp) : (BODY_PART_NAMES[bp]?.en || bp)}
                </Badge>
              ))}
              {exercise.targetMuscles?.map((tm) => (
                <Badge key={tm} variant="secondary" className="text-[10px] rounded-lg bg-orange-50 text-orange-700 capitalize">
                  <Target className="h-3 w-3 me-0.5" /> {tm}
                </Badge>
              ))}
              {exercise.secondaryMuscles?.filter(Boolean).map((sm) => (
                <Badge key={sm} variant="secondary" className="text-[10px] rounded-lg bg-slate-100 text-slate-600 capitalize">
                  <Zap className="h-3 w-3 me-0.5" /> {sm}
                </Badge>
              ))}
              {forceInfo && (
                <Badge variant="secondary" className="text-[10px] rounded-lg bg-purple-50 text-purple-700">
                  <ArrowUpDown className="h-3 w-3 me-0.5" /> {isRtl ? forceInfo.ar : forceInfo.en}
                </Badge>
              )}
              {exercise.mechanic && (
                <Badge variant="secondary" className="text-[10px] rounded-lg bg-indigo-50 text-indigo-700 capitalize">
                  {exercise.mechanic}
                </Badge>
              )}
            </div>

            {/* Instructions */}
            {exercise.instructions && exercise.instructions.length > 0 && (
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {isRtl ? "طريقة الأداء" : "Instructions"}
                </p>
                <ol className="space-y-1.5 list-decimal list-inside">
                  {exercise.instructions.map((step, i) => (
                    <li key={i} className="text-xs text-slate-700 leading-relaxed">
                      {typeof step === "string" ? step.replace(/^Step:\d+\s*/, "") : String(step)}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
