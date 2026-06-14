"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Flame,
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

// ─── Types ───

interface DBExercise {
  id: number;
  exerciseId: string;
  name: string;
  gifUrl: string | null;
  bodyParts: string[];
  targetMuscles: string[];
  secondaryMuscles: string[];
  equipments: string[];
  instructions: string[];
  source?: string;
  difficulty?: string | null;
  forceType?: string | null;
  videoUrl?: string | null;
}

interface ProgramExercise {
  uid: string;
  exerciseId: string;
  name: string;
  gifUrl: string | null;
  bodyParts: string[];
  targetMuscles: string[];
  equipments: string[];
  sets: number;
  reps: string;
  restSeconds: number;
}

// ─── Body Part Filters ───

const BODY_PARTS = [
  { key: "all", ar: "الكل", en: "All" },
  { key: "back", ar: "الظهر", en: "Back" },
  { key: "chest", ar: "الصدر", en: "Chest" },
  { key: "upper arms", ar: "الذراعان", en: "Upper Arms" },
  { key: "lower arms", ar: "الساعدان", en: "Lower Arms" },
  { key: "upper legs", ar: "الفخذان", en: "Upper Legs" },
  { key: "lower legs", ar: "الساقان", en: "Lower Legs" },
  { key: "shoulders", ar: "الأكتاف", en: "Shoulders" },
  { key: "waist", ar: "الخصر", en: "Waist" },
  { key: "cardio", ar: "كارديو", en: "Cardio" },
  { key: "neck", ar: "الرقبة", en: "Neck" },
];

// ─── Program Templates ───

const PROGRAM_TEMPLATES = [
  { id: "ppl", nameAr: "دفع - سحب - أرجل", nameEn: "Push Pull Legs", goal: "muscle_gain", daysPerWeek: 6 },
  { id: "full-body", nameAr: "تمرين الجسم الكامل", nameEn: "Full Body", goal: "general", daysPerWeek: 3 },
  { id: "upper-lower", nameAr: "علوي - سفلي", nameEn: "Upper Lower Split", goal: "strength", daysPerWeek: 4 },
  { id: "hiit-fat-loss", nameAr: "حرق الدهون HIIT", nameEn: "HIIT Fat Loss", goal: "fat_loss", daysPerWeek: 4 },
];

/**
 * MediSport — Coach Program Builder (v2)
 *
 * Now uses the real 1324-exercise database with GIF previews.
 * Coaches can search, filter by body part, and build programs
 * with exercises from the full ExerciseDB library.
 */
export default function ProgramBuilderPage() {
  const tBuilder = useTranslations("SportBuilder");
  const locale = useLocale();
  const isRtl = locale === "ar";

  // Program state
  const [programName, setProgramName] = React.useState("");
  const [programExercises, setProgramExercises] = React.useState<ProgramExercise[]>([]);
  const [saved, setSaved] = React.useState(false);

  // Library modal state
  const [showLibrary, setShowLibrary] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeBodyPart, setActiveBodyPart] = React.useState("all");
  const [libraryExercises, setLibraryExercises] = React.useState<DBExercise[]>([]);
  const [libraryLoading, setLibraryLoading] = React.useState(false);
  const [libraryPage, setLibraryPage] = React.useState(1);
  const [libraryTotal, setLibraryTotal] = React.useState(0);
  const [expandedExercise, setExpandedExercise] = React.useState<string | null>(null);

  // Debounced search
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetchLibrary = React.useCallback(async (query: string, bodyPart: string, page: number) => {
    setLibraryLoading(true);
    try {
      const params = new URLSearchParams({ action: "exercise-library", page: String(page), limit: "20" });
      if (query) params.set("q", query);
      if (bodyPart && bodyPart !== "all") params.set("bodyPart", bodyPart);
      const res = await fetch(`/api/sport?${params}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setLibraryExercises(json.data || []);
          setLibraryTotal(json.meta?.total || 0);
        }
      }
    } catch {
      /* silent */
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  // Fetch when modal opens or filters change
  React.useEffect(() => {
    if (showLibrary) {
      fetchLibrary(searchQuery, activeBodyPart, libraryPage);
    }
  }, [showLibrary, activeBodyPart, libraryPage, fetchLibrary]);

  // Debounced search
  React.useEffect(() => {
    if (!showLibrary) return;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setLibraryPage(1);
      fetchLibrary(searchQuery, activeBodyPart, 1);
    }, 400);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery]);

  const addExercise = (ex: DBExercise) => {
    setProgramExercises((prev) => [
      ...prev,
      {
        uid: `${ex.exerciseId}_${Date.now()}`,
        exerciseId: ex.exerciseId,
        name: ex.name,
        gifUrl: ex.gifUrl,
        bodyParts: ex.bodyParts,
        targetMuscles: ex.targetMuscles,
        equipments: ex.equipments,
        sets: 3,
        reps: "8-12",
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

  const totalSets = programExercises.reduce((sum, e) => sum + e.sets, 0);
  const estimatedCalories = programExercises.length * 8 * totalSets; // rough estimate

  const handleSave = async () => {
    setSaved(true);
    try {
      await fetch("/api/sport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "program-save",
          name: programName,
          exercises: programExercises.map((e) => ({
            exerciseId: e.exerciseId,
            name: e.name,
            gifUrl: e.gifUrl,
            bodyParts: e.bodyParts,
            targetMuscles: e.targetMuscles,
            equipments: e.equipments,
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
        <Link href={`/${locale}/coach`}>
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
                  onClick={() => {
                    setProgramName(locale === "ar" ? tpl.nameAr : tpl.nameEn);
                    setShowLibrary(true);
                  }}
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
          <Card key={ex.uid} className="border-slate-100 overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                {/* Move buttons */}
                <div className="flex flex-col gap-0.5 pt-1">
                  <button
                    onClick={() => moveExercise(index, "up")}
                    disabled={index === 0}
                    className="text-slate-300 hover:text-slate-500 disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => moveExercise(index, "down")}
                    disabled={index === programExercises.length - 1}
                    className="text-slate-300 hover:text-slate-500 disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                {/* GIF thumbnail */}
                {ex.gifUrl && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                    <Image
                      src={ex.gifUrl}
                      alt={ex.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {index + 1}. {ex.name}
                    </p>
                    <button
                      onClick={() => removeExercise(ex.uid)}
                      className="text-slate-300 hover:text-red-500 flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ex.bodyParts.slice(0, 2).map((bp) => (
                      <Badge key={bp} variant="secondary" className="text-[9px]">{bp}</Badge>
                    ))}
                    {ex.equipments.slice(0, 1).map((eq) => (
                      <Badge key={eq} variant="outline" className="text-[9px]">{eq}</Badge>
                    ))}
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

      {/* Exercise count indicator */}
      <p className="text-center text-[10px] text-slate-400 mt-2">
        {isRtl ? `مكتبة تحتوي على 1324 تمرين حقيقي مع صور متحركة` : `Library contains 1324 real exercises with animated GIFs`}
      </p>

      {/* ─── Exercise Library Modal ─── */}
      {showLibrary && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-white border-0 shadow-2xl rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{tBuilder("exerciseLibrary")}</h3>
                  <p className="text-[10px] text-slate-500">
                    {libraryTotal} {isRtl ? "تمرين متاح" : "exercises available"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowLibrary(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {/* Search */}
              <div className="relative">
                <Search className={`absolute top-2.5 h-4 w-4 text-slate-400 ${isRtl ? "right-3" : "left-3"}`} />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isRtl ? "ابحث عن تمرين..." : "Search exercises..."}
                  className={isRtl ? "pr-9" : "pl-9"}
                />
              </div>
              {/* Body Part Filter */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 mt-3 -mx-1 px-1 scrollbar-hide">
                {BODY_PARTS.map((bp) => (
                  <button
                    key={bp.key}
                    onClick={() => { setActiveBodyPart(bp.key); setLibraryPage(1); }}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      activeBodyPart === bp.key
                        ? "bg-emerald-100 text-emerald-700 shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {locale === "ar" ? bp.ar : bp.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Exercise List */}
            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {libraryLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse flex gap-3 p-3 rounded-lg bg-gray-50">
                      <div className="w-14 h-14 rounded-lg bg-gray-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : libraryExercises.length === 0 ? (
                <div className="text-center py-8">
                  <Dumbbell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">
                    {isRtl ? "لا توجد تمارين مطابقة" : "No matching exercises"}
                  </p>
                </div>
              ) : (
                libraryExercises.map((ex) => {
                  const isExpanded = expandedExercise === String(ex.id);
                  return (
                    <div key={ex.id} className="rounded-xl border border-slate-100 overflow-hidden hover:border-emerald-200 transition-all">
                      <button
                        onClick={() => setExpandedExercise(isExpanded ? null : String(ex.id))}
                        className="w-full text-start p-3 flex items-center gap-3"
                      >
                        {/* GIF Preview */}
                        {ex.gifUrl && (
                          <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
                            <Image
                              src={ex.gifUrl}
                              alt={ex.name}
                              width={56}
                              height={56}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{ex.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {ex.targetMuscles.slice(0, 2).map((m) => (
                              <span key={m} className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full">
                                {m}
                              </span>
                            ))}
                            {ex.equipments.slice(0, 1).map((eq) => (
                              <span key={eq} className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">
                                {eq}
                              </span>
                            ))}
                          </div>
                        </div>
                        {ex.source === "musclewiki" && (<span className="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">Premium</span>)}
                        <Plus className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      </button>
                      {/* Expanded view */}
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-slate-100 bg-slate-50/50">
                          {(ex.videoUrl || ex.gifUrl) && (
                            <div className="w-full h-48 rounded-lg overflow-hidden my-2 bg-slate-900 border border-gray-200">
                              {ex.videoUrl ? (
                                <video src={ex.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-contain" />
                              ) : (
                                <Image
                                  src={ex.gifUrl!}
                                  alt={ex.name}
                                  width={300}
                                  height={200}
                                  className="w-full h-full object-contain"
                                  unoptimized
                                />
                              )}
                            </div>
                          )}
                          {ex.instructions.length > 0 && (
                            <div className="mt-2">
                              <p className="text-[10px] font-medium text-slate-600 mb-1">
                                {isRtl ? "التعليمات:" : "Instructions:"}
                              </p>
                              <ol className="text-[10px] text-slate-500 space-y-0.5 list-decimal list-inside">
                                {ex.instructions.slice(0, 4).map((inst, i) => (
                                  <li key={i}>{inst}</li>
                                ))}
                              </ol>
                            </div>
                          )}
                          <Button
                            onClick={() => { addExercise(ex); setExpandedExercise(null); }}
                            className="w-full mt-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
                          >
                            <Plus className="h-3.5 w-3.5 me-1" />
                            {isRtl ? "إضافة للبرنامج" : "Add to Program"}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {libraryTotal > 20 && (
              <div className="p-3 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={libraryPage <= 1}
                  onClick={() => setLibraryPage((p) => p - 1)}
                  className="text-xs"
                >
                  {isRtl ? "السابق" : "Previous"}
                </Button>
                <span className="text-xs text-slate-500">
                  {libraryPage} / {Math.ceil(libraryTotal / 20)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={libraryPage >= Math.ceil(libraryTotal / 20)}
                  onClick={() => setLibraryPage((p) => p + 1)}
                  className="text-xs"
                >
                  {isRtl ? "التالي" : "Next"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
