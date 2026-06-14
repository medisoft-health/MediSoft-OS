"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import Image from "next/image";
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
  gifUrl: string;
  bodyParts: string[];
  equipments: string[];
  targetMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  syncedAt: string;
}

interface FiltersData {
  bodyParts: string[];
  equipments: string[];
  targets: string[];
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
};

// ─── Equipment display names (AR/EN) ───
const EQUIPMENT_NAMES: Record<string, { ar: string; en: string }> = {
  "body weight": { ar: "وزن الجسم", en: "Body Weight" },
  dumbbell: { ar: "دمبل", en: "Dumbbell" },
  cable: { ar: "كابل", en: "Cable" },
  barbell: { ar: "بار", en: "Barbell" },
  "leverage machine": { ar: "جهاز رافعة", en: "Leverage Machine" },
  band: { ar: "حبل مقاومة", en: "Band" },
  "smith machine": { ar: "جهاز سميث", en: "Smith Machine" },
  kettlebell: { ar: "كيتل بيل", en: "Kettlebell" },
  weighted: { ar: "أوزان", en: "Weighted" },
  "stability ball": { ar: "كرة توازن", en: "Stability Ball" },
  "ez barbell": { ar: "بار EZ", en: "EZ Barbell" },
  "olympic barbell": { ar: "بار أولمبي", en: "Olympic Barbell" },
  medicine_ball: { ar: "كرة طبية", en: "Medicine Ball" },
  bosu_ball: { ar: "كرة بوسو", en: "Bosu Ball" },
  rope: { ar: "حبل", en: "Rope" },
  roller: { ar: "رولر", en: "Roller" },
  "resistance band": { ar: "حبل مقاومة", en: "Resistance Band" },
  assisted: { ar: "مساعد", en: "Assisted" },
  "upper body ergometer": { ar: "جهاز الجزء العلوي", en: "Upper Body Ergometer" },
  "tire": { ar: "إطار", en: "Tire" },
  "hammer": { ar: "مطرقة", en: "Hammer" },
  "trap bar": { ar: "بار ترابيزيوس", en: "Trap Bar" },
  "skierg machine": { ar: "جهاز التزلج", en: "SkiErg Machine" },
  "sled machine": { ar: "جهاز زلاجة", en: "Sled Machine" },
  "elliptical machine": { ar: "جهاز بيضاوي", en: "Elliptical Machine" },
  "stationary bike": { ar: "دراجة ثابتة", en: "Stationary Bike" },
  "stepmill machine": { ar: "جهاز الدرج", en: "Stepmill Machine" },
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
  }, [page, debouncedSearch, selectedBodyPart, selectedEquipment, selectedTarget]);

  const hasActiveFilters = selectedBodyPart !== "all" || selectedEquipment !== "all" || selectedTarget !== "all";

  const resetFilters = () => {
    setSelectedBodyPart("all");
    setSelectedEquipment("all");
    setSelectedTarget("all");
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
                ? `${meta.total} تمرين • مدعوم بـ ExerciseDB`
                : `${meta.total} exercises • Powered by ExerciseDB`}
            </p>
          </div>
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
          className="w-full rounded-xl border border-slate-200 bg-white py-3 ps-10 pe-4 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Body Part Quick Filters — Horizontal scroll */}
      <div className="mb-4 -mx-4 px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => { setSelectedBodyPart("all"); setPage(1); }}
            className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              selectedBodyPart === "all"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {isRtl ? "الكل" : "All"}
          </button>
          {(filters?.bodyParts || []).map((bp) => {
            const info = BODY_PART_NAMES[bp] || { ar: bp, en: bp, icon: "💪" };
            return (
              <button
                key={bp}
                onClick={() => { setSelectedBodyPart(bp); setPage(1); }}
                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition-all flex items-center gap-1 ${
                  selectedBodyPart === bp
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{info.icon}</span>
                <span>{isRtl ? info.ar : info.en}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl text-xs"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-3.5 w-3.5 me-1" />
          {isRtl ? "فلاتر متقدمة" : "Advanced Filters"}
          {showFilters ? <ChevronUp className="h-3 w-3 ms-1" /> : <ChevronDown className="h-3 w-3 ms-1" />}
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={resetFilters}
          >
            <RotateCcw className="h-3 w-3 me-1" />
            {isRtl ? "إعادة ضبط" : "Reset"}
          </Button>
        )}
        <span className="ms-auto text-xs text-slate-400">
          {loading ? "..." : `${meta.total} ${isRtl ? "تمرين" : "exercises"}`}
        </span>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <Card className="mb-4 border-slate-200/80 shadow-sm">
          <CardContent className="p-4 space-y-4">
            {/* Equipment Filter */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 block">
                {isRtl ? "المعدات" : "Equipment"}
              </label>
              <div className="flex flex-wrap gap-2">
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

  return (
    <Card
      className={`border-slate-200/80 shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer overflow-hidden ${
        expanded ? "ring-2 ring-emerald-200 border-emerald-300 col-span-1 sm:col-span-2" : ""
      }`}
      onClick={onToggle}
    >
      <CardContent className="p-0">
        {/* Card Header with GIF thumbnail */}
        <div className="flex items-start gap-3 p-3">
          {/* GIF thumbnail */}
          <div className="relative h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-slate-100">
            <img
              src={exercise.gifUrl}
              alt={exercise.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
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
            {/* Large GIF */}
            <div className="relative w-full aspect-square max-h-72 rounded-xl overflow-hidden bg-slate-50 mx-auto max-w-xs">
              <img
                src={exercise.gifUrl}
                alt={exercise.name}
                className="h-full w-full object-contain"
              />
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
                      {step.replace(/^Step:\d+\s*/, "")}
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
