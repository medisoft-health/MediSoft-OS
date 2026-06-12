"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  Dumbbell,
  Flame,
  GripVertical,
  Layers,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  EXERCISE_LIBRARY,
  PROGRAM_TEMPLATES,
  searchExercises,
  type Exercise,
  type MuscleGroup,
} from "@/lib/sport/exercise-library";

interface ProgramExercise extends Exercise {
  uid: string;
  sets: number;
  reps: string;
  restSeconds: number;
}

const MUSCLE_GROUPS: { key: MuscleGroup; ar: string; en: string }[] = [
  { key: "chest", ar: "الصدر", en: "Chest" },
  { key: "back", ar: "الظهر", en: "Back" },
  { key: "shoulders", ar: "الأكتاف", en: "Shoulders" },
  { key: "arms", ar: "الذراعين", en: "Arms" },
  { key: "legs", ar: "الأرجل", en: "Legs" },
  { key: "glutes", ar: "الألوية", en: "Glutes" },
  { key: "core", ar: "البطن", en: "Core" },
  { key: "full_body", ar: "الجسم كامل", en: "Full Body" },
  { key: "cardio", ar: "الكارديو", en: "Cardio" },
];

/**
 * MediSport — Coach Program Builder
 *
 * Lets coaches compose training programs by:
 * - Browsing/searching the exercise library
 * - Adding exercises to a program with custom sets/reps/rest
 * - Reordering exercises (move up/down)
 * - Starting from a template
 * - Saving the program (assignable to trainees)
 */
export default function ProgramBuilderPage() {
  const tBuilder = useTranslations("SportBuilder");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const [programName, setProgramName] = React.useState("");
  const [programExercises, setProgramExercises] = React.useState<ProgramExercise[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeGroup, setActiveGroup] = React.useState<MuscleGroup | "all">("all");
  const [showLibrary, setShowLibrary] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const filteredExercises = React.useMemo(() => {
    let list = searchQuery ? searchExercises(searchQuery, locale as "ar" | "en") : EXERCISE_LIBRARY;
    if (activeGroup !== "all") list = list.filter((e) => e.muscleGroup === activeGroup);
    return list;
  }, [searchQuery, activeGroup, locale]);

  const addExercise = (ex: Exercise) => {
    setProgramExercises((prev) => [
      ...prev,
      {
        ...ex,
        uid: `${ex.id}_${Date.now()}`,
        sets: ex.defaultSets,
        reps: ex.defaultReps,
        restSeconds: 90,
      },
    ]);
  };

  const removeExercise = (uid: string) => {
    setProgramExercises((prev) => prev.filter((e) => e.uid !== uid));
  };

  const updateExercise = (uid: string, field: "sets" | "reps" | "restSeconds", value: number | string) => {
    setProgramExercises((prev) =>
      prev.map((e) => (e.uid === uid ? { ...e, [field]: value } : e))
    );
  };

  const moveExercise = (index: number, direction: "up" | "down") => {
    setProgramExercises((prev) => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const loadTemplate = (templateId: string) => {
    const template = PROGRAM_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    setProgramName(locale === "ar" ? template.nameAr : template.nameEn);
    const exercises = template.exerciseIds
      .map((id) => EXERCISE_LIBRARY.find((e) => e.id === id))
      .filter((e): e is Exercise => !!e)
      .map((ex) => ({
        ...ex,
        uid: `${ex.id}_${Date.now()}_${Math.random()}`,
        sets: ex.defaultSets,
        reps: ex.defaultReps,
        restSeconds: 90,
      }));
    setProgramExercises(exercises);
  };

  const totalSets = programExercises.reduce((sum, e) => sum + e.sets, 0);
  const estimatedCalories = programExercises.reduce((sum, e) => sum + e.caloriesPerSet * e.sets, 0);

  const handleSave = async () => {
    setSaved(true);
    // POST to /api/sport with action: program-save
    try {
      await fetch("/api/sport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "program-save",
          name: programName,
          exercises: programExercises.map((e) => ({
            id: e.id,
            sets: e.sets,
            reps: e.reps,
            restSeconds: e.restSeconds,
          })),
        }),
      });
    } catch {
      /* offline-safe */
    }
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${locale}/sport/coach`}>
          <Button variant="ghost" size="icon" className="rounded-lg">
            <ArrowLeft className={`h-5 w-5 ${isRtl ? "rotate-180" : ""}`} />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">{tBuilder("title")}</h1>
          <p className="text-sm text-slate-500">{tBuilder("subtitle")}</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!programName || programExercises.length === 0}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {saved ? (
            <>
              <Sparkles className="h-4 w-4 me-1.5" />
              {tBuilder("saved")}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 me-1.5" />
              {tBuilder("save")}
            </>
          )}
        </Button>
      </div>

      {/* Program Name */}
      <Card className="border-slate-100 mb-4">
        <CardContent className="p-4">
          <Label className="text-sm">{tBuilder("programName")}</Label>
          <Input
            value={programName}
            onChange={(e) => setProgramName(e.target.value)}
            placeholder={tBuilder("programNamePlaceholder")}
            className="mt-1"
          />
        </CardContent>
      </Card>

      {/* Templates */}
      {programExercises.length === 0 && (
        <Card className="border-slate-100 mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-500" />
              {tBuilder("startFromTemplate")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {PROGRAM_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => loadTemplate(tpl.id)}
                  className="text-start p-3 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all"
                >
                  <p className="text-sm font-medium text-slate-900">
                    {locale === "ar" ? tpl.nameAr : tpl.nameEn}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {tpl.daysPerWeek} {tBuilder("daysPerWeek")} · {tBuilder(`goal_${tpl.goal}`)}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Program Summary */}
      {programExercises.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Card className="border-slate-100">
            <CardContent className="p-3 text-center">
              <Dumbbell className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
              <div className="text-lg font-bold text-slate-900">{programExercises.length}</div>
              <div className="text-[10px] text-slate-500">{tBuilder("exercises")}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-100">
            <CardContent className="p-3 text-center">
              <Layers className="h-4 w-4 text-blue-500 mx-auto mb-1" />
              <div className="text-lg font-bold text-slate-900">{totalSets}</div>
              <div className="text-[10px] text-slate-500">{tBuilder("totalSets")}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-100">
            <CardContent className="p-3 text-center">
              <Flame className="h-4 w-4 text-orange-500 mx-auto mb-1" />
              <div className="text-lg font-bold text-slate-900">~{estimatedCalories}</div>
              <div className="text-[10px] text-slate-500">{tBuilder("estCalories")}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Program Exercises */}
      <div className="space-y-2 mb-4">
        {programExercises.map((ex, index) => (
          <Card key={ex.uid} className="border-slate-100">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-0.5 pt-1">
                  <button
                    onClick={() => moveExercise(index, "up")}
                    disabled={index === 0}
                    className="text-slate-300 hover:text-slate-500 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveExercise(index, "down")}
                    disabled={index === programExercises.length - 1}
                    className="text-slate-300 hover:text-slate-500 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">
                      {index + 1}. {locale === "ar" ? ex.nameAr : ex.nameEn}
                    </p>
                    <button
                      onClick={() => removeExercise(ex.uid)}
                      className="text-slate-300 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div>
                      <Label className="text-[10px] text-slate-500">{tBuilder("sets")}</Label>
                      <Input
                        type="number"
                        value={ex.sets}
                        onChange={(e) => updateExercise(ex.uid, "sets", Number(e.target.value))}
                        className="h-8 text-sm mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500">{tBuilder("reps")}</Label>
                      <Input
                        value={ex.reps}
                        onChange={(e) => updateExercise(ex.uid, "reps", e.target.value)}
                        className="h-8 text-sm mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500">{tBuilder("rest")}</Label>
                      <Input
                        type="number"
                        value={ex.restSeconds}
                        onChange={(e) => updateExercise(ex.uid, "restSeconds", Number(e.target.value))}
                        className="h-8 text-sm mt-0.5"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Exercise Button */}
      <Button
        variant="outline"
        onClick={() => setShowLibrary(true)}
        className="w-full rounded-lg border-dashed border-emerald-300 text-emerald-600 hover:bg-emerald-50"
      >
        <Plus className="h-4 w-4 me-1.5" />
        {tBuilder("addExercise")}
      </Button>

      {/* Exercise Library Modal */}
      {showLibrary && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <Card className="w-full sm:max-w-lg border-0 shadow-2xl rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col">
            <CardHeader className="pb-2 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{tBuilder("exerciseLibrary")}</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowLibrary(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative mt-2">
                <Search className={`absolute top-2.5 h-4 w-4 text-slate-400 ${isRtl ? "right-3" : "left-3"}`} />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={tBuilder("searchExercise")}
                  className={isRtl ? "pr-9" : "pl-9"}
                />
              </div>
              {/* Group filter */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 mt-2 -mx-1 px-1">
                <button
                  onClick={() => setActiveGroup("all")}
                  className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium ${
                    activeGroup === "all" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tBuilder("allGroups")}
                </button>
                {MUSCLE_GROUPS.map((g) => (
                  <button
                    key={g.key}
                    onClick={() => setActiveGroup(g.key)}
                    className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium ${
                      activeGroup === g.key ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {locale === "ar" ? g.ar : g.en}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1 space-y-2">
              {filteredExercises.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => {
                    addExercise(ex);
                    setShowLibrary(false);
                  }}
                  className="w-full text-start p-3 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/20 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">
                      {locale === "ar" ? ex.nameAr : ex.nameEn}
                    </p>
                    <Plus className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[9px]">
                      {tBuilder(`mg_${ex.muscleGroup}`)}
                    </Badge>
                    <span className="text-[10px] text-slate-500">{tBuilder(ex.difficulty)}</span>
                    <span className="text-[10px] text-slate-400">
                      {ex.defaultSets} × {ex.defaultReps}
                    </span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
