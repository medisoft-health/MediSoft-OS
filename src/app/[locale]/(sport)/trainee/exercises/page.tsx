"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import {
  Search,
  Dumbbell,
  Filter,
  ChevronDown,
  ChevronUp,
  Flame,
  Target,
  Zap,
  Star,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SportAuthGuard } from "@/components/sport/sport-auth-guard";
import {
  EXERCISE_LIBRARY,
  type Exercise,
  type MuscleGroup,
  type Equipment,
  type ExerciseDifficulty,
} from "@/lib/sport/exercise-library";

// ─── Muscle group metadata ───
const MUSCLE_GROUPS: { id: MuscleGroup; nameAr: string; nameEn: string; icon: string }[] = [
  { id: "chest", nameAr: "الصدر", nameEn: "Chest", icon: "💪" },
  { id: "back", nameAr: "الظهر", nameEn: "Back", icon: "🔙" },
  { id: "shoulders", nameAr: "الأكتاف", nameEn: "Shoulders", icon: "🏋️" },
  { id: "arms", nameAr: "الذراعين", nameEn: "Arms", icon: "💪" },
  { id: "legs", nameAr: "الأرجل", nameEn: "Legs", icon: "🦵" },
  { id: "glutes", nameAr: "الألوية", nameEn: "Glutes", icon: "🍑" },
  { id: "core", nameAr: "البطن", nameEn: "Core", icon: "🎯" },
  { id: "full_body", nameAr: "الجسم الكامل", nameEn: "Full Body", icon: "⚡" },
  { id: "cardio", nameAr: "الكارديو", nameEn: "Cardio", icon: "❤️" },
];

const EQUIPMENT_LIST: { id: Equipment; nameAr: string; nameEn: string }[] = [
  { id: "barbell", nameAr: "بار", nameEn: "Barbell" },
  { id: "dumbbell", nameAr: "دمبل", nameEn: "Dumbbell" },
  { id: "machine", nameAr: "جهاز", nameEn: "Machine" },
  { id: "cable", nameAr: "كابل", nameEn: "Cable" },
  { id: "bodyweight", nameAr: "وزن الجسم", nameEn: "Bodyweight" },
  { id: "kettlebell", nameAr: "كيتل بيل", nameEn: "Kettlebell" },
  { id: "resistance_band", nameAr: "حبل مقاومة", nameEn: "Resistance Band" },
  { id: "cardio_machine", nameAr: "جهاز كارديو", nameEn: "Cardio Machine" },
];

const DIFFICULTY_LIST: { id: ExerciseDifficulty; nameAr: string; nameEn: string; color: string }[] = [
  { id: "beginner", nameAr: "مبتدئ", nameEn: "Beginner", color: "bg-green-100 text-green-700 border-green-200" },
  { id: "intermediate", nameAr: "متوسط", nameEn: "Intermediate", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { id: "advanced", nameAr: "متقدم", nameEn: "Advanced", color: "bg-red-100 text-red-700 border-red-200" },
];

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

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedMuscle, setSelectedMuscle] = React.useState<MuscleGroup | "all">("all");
  const [selectedEquipment, setSelectedEquipment] = React.useState<Equipment | "all">("all");
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<ExerciseDifficulty | "all">("all");
  const [showFilters, setShowFilters] = React.useState(false);
  const [expandedExercise, setExpandedExercise] = React.useState<string | null>(null);

  // Filter exercises
  const filteredExercises = React.useMemo(() => {
    let results = [...EXERCISE_LIBRARY];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (e) =>
          e.nameAr.includes(searchQuery) ||
          e.nameEn.toLowerCase().includes(q) ||
          e.muscleGroup.includes(q) ||
          e.equipment.includes(q)
      );
    }

    // Muscle group filter
    if (selectedMuscle !== "all") {
      results = results.filter((e) => e.muscleGroup === selectedMuscle);
    }

    // Equipment filter
    if (selectedEquipment !== "all") {
      results = results.filter((e) => e.equipment === selectedEquipment);
    }

    // Difficulty filter
    if (selectedDifficulty !== "all") {
      results = results.filter((e) => e.difficulty === selectedDifficulty);
    }

    return results;
  }, [searchQuery, selectedMuscle, selectedEquipment, selectedDifficulty]);

  const hasActiveFilters = selectedMuscle !== "all" || selectedEquipment !== "all" || selectedDifficulty !== "all";

  const resetFilters = () => {
    setSelectedMuscle("all");
    setSelectedEquipment("all");
    setSelectedDifficulty("all");
    setSearchQuery("");
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
                ? `${EXERCISE_LIBRARY.length} تمرين • ${MUSCLE_GROUPS.length} مجموعات عضلية`
                : `${EXERCISE_LIBRARY.length} exercises • ${MUSCLE_GROUPS.length} muscle groups`}
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
      </div>

      {/* Muscle Group Quick Filters — Horizontal scroll */}
      <div className="mb-4 -mx-4 px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedMuscle("all")}
            className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              selectedMuscle === "all"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {isRtl ? "الكل" : "All"}
          </button>
          {MUSCLE_GROUPS.map((mg) => (
            <button
              key={mg.id}
              onClick={() => setSelectedMuscle(mg.id)}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition-all flex items-center gap-1 ${
                selectedMuscle === mg.id
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>{mg.icon}</span>
              <span>{isRtl ? mg.nameAr : mg.nameEn}</span>
            </button>
          ))}
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
          {filteredExercises.length} {isRtl ? "تمرين" : "exercises"}
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
                  onClick={() => setSelectedEquipment("all")}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                    selectedEquipment === "all"
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {isRtl ? "الكل" : "All"}
                </button>
                {EQUIPMENT_LIST.map((eq) => (
                  <button
                    key={eq.id}
                    onClick={() => setSelectedEquipment(eq.id)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                      selectedEquipment === eq.id
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {isRtl ? eq.nameAr : eq.nameEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 block">
                {isRtl ? "المستوى" : "Difficulty"}
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedDifficulty("all")}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                    selectedDifficulty === "all"
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {isRtl ? "الكل" : "All"}
                </button>
                {DIFFICULTY_LIST.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDifficulty(d.id)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all border ${
                      selectedDifficulty === d.id ? d.color : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {isRtl ? d.nameAr : d.nameEn}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exercise List */}
      <div className="space-y-3">
        {filteredExercises.length === 0 ? (
          <div className="text-center py-12">
            <Dumbbell className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">
              {isRtl ? "لا توجد تمارين مطابقة" : "No matching exercises"}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {isRtl ? "جرب تغيير الفلاتر أو البحث" : "Try changing filters or search"}
            </p>
          </div>
        ) : (
          filteredExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              isRtl={isRtl}
              expanded={expandedExercise === exercise.id}
              onToggle={() =>
                setExpandedExercise(expandedExercise === exercise.id ? null : exercise.id)
              }
            />
          ))
        )}
      </div>
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
  exercise: Exercise;
  isRtl: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const muscleGroup = MUSCLE_GROUPS.find((mg) => mg.id === exercise.muscleGroup);
  const equipment = EQUIPMENT_LIST.find((eq) => eq.id === exercise.equipment);
  const difficulty = DIFFICULTY_LIST.find((d) => d.id === exercise.difficulty);

  return (
    <Card
      className={`border-slate-200/80 shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer ${
        expanded ? "ring-2 ring-emerald-200 border-emerald-300" : ""
      }`}
      onClick={onToggle}
    >
      <CardContent className="p-4">
        {/* Main row */}
        <div className="flex items-center gap-3">
          {/* Muscle group icon */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg">
            {muscleGroup?.icon || "💪"}
          </div>

          {/* Exercise info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 text-sm truncate">
              {isRtl ? exercise.nameAr : exercise.nameEn}
            </h3>
            <p className="text-xs text-slate-500 truncate">
              {isRtl ? exercise.nameEn : exercise.nameAr}
            </p>
          </div>

          {/* Difficulty badge */}
          <Badge
            variant="outline"
            className={`shrink-0 text-[10px] px-2 py-0.5 rounded-lg border ${difficulty?.color || ""}`}
          >
            {isRtl ? difficulty?.nameAr : difficulty?.nameEn}
          </Badge>

          {/* Expand icon */}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
          )}
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            {/* Tags row */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-[10px] rounded-lg bg-slate-100">
                <Target className="h-3 w-3 me-1" />
                {isRtl ? muscleGroup?.nameAr : muscleGroup?.nameEn}
              </Badge>
              <Badge variant="secondary" className="text-[10px] rounded-lg bg-slate-100">
                <Dumbbell className="h-3 w-3 me-1" />
                {isRtl ? equipment?.nameAr : equipment?.nameEn}
              </Badge>
              <Badge variant="secondary" className="text-[10px] rounded-lg bg-orange-50 text-orange-700">
                <Flame className="h-3 w-3 me-1" />
                {exercise.caloriesPerSet} {isRtl ? "سعرة/مجموعة" : "cal/set"}
              </Badge>
            </div>

            {/* Default prescription */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-50 p-3 text-center">
                <p className="text-lg font-bold text-emerald-700">{exercise.defaultSets}</p>
                <p className="text-[10px] text-emerald-600 font-medium">
                  {isRtl ? "مجموعات" : "Sets"}
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-center">
                <p className="text-lg font-bold text-blue-700">{exercise.defaultReps}</p>
                <p className="text-[10px] text-blue-600 font-medium">
                  {isRtl ? "تكرارات" : "Reps"}
                </p>
              </div>
            </div>

            {/* Instructions */}
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Star className="h-3 w-3" />
                {isRtl ? "طريقة الأداء" : "Instructions"}
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {isRtl ? exercise.instructionsAr : exercise.instructionsEn}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
