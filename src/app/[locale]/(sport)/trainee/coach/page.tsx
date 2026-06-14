"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "@/lib/auth-client";
import {
  ArrowLeft,
  Apple,
  Brain,
  CheckCircle2,
  Dumbbell,
  Droplets,
  Flame,
  Loader2,
  Pill,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UserRound,
  Utensils,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  generateCoachPlan,
  type ActivityLevel,
  type CoachInput,
  type CoachResult,
  type Goal,
  type Sex,
} from "@/lib/sport/personal-coach";

const GOAL_OPTIONS: { key: Goal; ar: string; en: string; icon: string }[] = [
  { key: "fat_loss", ar: "خسارة الدهون", en: "Fat Loss", icon: "🔥" },
  { key: "muscle_gain", ar: "بناء العضلات", en: "Muscle Gain", icon: "💪" },
  { key: "maintain", ar: "الحفاظ على الوزن", en: "Maintain", icon: "⚖️" },
  { key: "performance", ar: "تحسين الأداء", en: "Performance", icon: "🏆" },
];

/**
 * MediSport Personal Coach — v2
 * Auto-reads profile data, generates food + training plan together.
 * The coach "knows" the trainee already.
 */
export default function PersonalCoachPage() {
  const t = useTranslations("SportCoach");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const { data: session } = useSession();

  // Profile data
  const [profileLoaded, setProfileLoaded] = React.useState(false);
  const [profileData, setProfileData] = React.useState<any>(null);
  const [loadingProfile, setLoadingProfile] = React.useState(true);

  // Coach state
  const [selectedGoal, setSelectedGoal] = React.useState<Goal | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [result, setResult] = React.useState<CoachResult | null>(null);
  const [trainingPlanCreated, setTrainingPlanCreated] = React.useState(false);
  const [creatingPlan, setCreatingPlan] = React.useState(false);

  // Auto-load profile on mount
  React.useEffect(() => {
    if (session?.user) {
      loadProfile();
    }
  }, [session]);

  const loadProfile = async () => {
    setLoadingProfile(true);
    try {
      const res = await fetch("/api/sport?action=my-sport-profile");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setProfileData(json.data);
          setProfileLoaded(true);
          // Auto-set goal from profile if available
          if (json.data.goal) {
            const mappedGoal = mapGoal(json.data.goal);
            setSelectedGoal(mappedGoal);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Map profile goal to coach goal
  const mapGoal = (profileGoal: string): Goal => {
    const mapping: Record<string, Goal> = {
      fat_loss: "fat_loss",
      weight_loss: "fat_loss",
      muscle_gain: "muscle_gain",
      strength: "muscle_gain",
      maintain: "maintain",
      general_fitness: "maintain",
      performance: "performance",
      endurance: "performance",
    };
    return mapping[profileGoal] || "maintain";
  };

  // Map activity level
  const mapActivityLevel = (level: string): ActivityLevel => {
    const mapping: Record<string, ActivityLevel> = {
      sedentary: "sedentary",
      light: "light",
      lightly_active: "light",
      moderate: "moderate",
      moderately_active: "moderate",
      active: "active",
      very_active: "very_active",
    };
    return mapping[level] || "moderate";
  };

  // Calculate age from birth_date
  const calcAge = (birthDate: string): number => {
    if (!birthDate) return 28;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  // Generate the plan using profile data
  const handleGenerate = () => {
    if (!profileData || !selectedGoal) return;
    setGenerating(true);

    const input: CoachInput = {
      sex: (profileData.sex || "male") as Sex,
      age: calcAge(profileData.birthDate),
      height: parseFloat(profileData.heightCm) || 175,
      weight: parseFloat(profileData.weightKg) || 80,
      activityLevel: mapActivityLevel(profileData.activityLevel || "moderate"),
      goal: selectedGoal,
      bodyFatPercentage: profileData.bodyFatPct ? parseFloat(profileData.bodyFatPct) : undefined,
      muscleMass: profileData.muscleMassKg ? parseFloat(profileData.muscleMassKg) : undefined,
    };

    // Simulate brief loading for UX
    setTimeout(() => {
      setResult(generateCoachPlan(input));
      setGenerating(false);
    }, 1200);
  };

  // Create training plan using profile data
  const handleCreateTrainingPlan = async () => {
    if (!profileData) return;
    setCreatingPlan(true);
    try {
      const res = await fetch("/api/sport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-training-plan",
          goal: selectedGoal === "fat_loss" ? "weight_loss" : 
                selectedGoal === "muscle_gain" ? "muscle_gain" :
                selectedGoal === "performance" ? "endurance" : "general_fitness",
          fitnessLevel: profileData.fitnessLevel || "beginner",
          daysPerWeek: profileData.daysPerWeek || 4,
          equipmentAccess: profileData.equipmentAccess || "full_gym",
          sex: profileData.sex || "male",
          age: calcAge(profileData.birthDate),
          heightCm: parseFloat(profileData.heightCm) || 175,
          weightKg: parseFloat(profileData.weightKg) || 80,
        }),
      });
      if (res.ok) {
        setTrainingPlanCreated(true);
      }
    } catch (err) {
      console.error("Failed to create training plan:", err);
    } finally {
      setCreatingPlan(false);
    }
  };

  // ─── Loading State ───
  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto">
            <Brain className="h-8 w-8 text-white animate-pulse" />
          </div>
          <p className="text-gray-500">{isRtl ? "جارٍ تحميل بياناتك..." : "Loading your data..."}</p>
        </div>
      </div>
    );
  }

  // ─── No Profile — Redirect to complete it ───
  if (!profileData || !profileData.heightCm || !profileData.weightKg) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mx-auto">
            <UserRound className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {isRtl ? "أكمل ملفك الشخصي أولاً" : "Complete Your Profile First"}
          </h2>
          <p className="text-sm text-gray-500">
            {isRtl 
              ? "المدرب الذكي يحتاج بياناتك (الطول، الوزن، العمر) ليقدم لك خطة مخصصة"
              : "The smart coach needs your data (height, weight, age) to create a personalized plan"}
          </p>
          <Link href={`/${locale}/trainee`}>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6">
              {isRtl ? "أكمل الملف الشخصي" : "Complete Profile"}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${locale}/trainee`}>
          <Button variant="ghost" size="icon" className="rounded-lg">
            <ArrowLeft className={`h-5 w-5 ${isRtl ? "rotate-180" : ""}`} />
          </Button>
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t("title")}</h1>
            <p className="text-sm text-slate-500">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      {/* Profile Summary — Coach "knows" you */}
      <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-teal-50/40 mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-800">
              {isRtl ? "أنا أعرفك بالفعل! بياناتك محمّلة تلقائياً" : "I already know you! Your data is loaded automatically"}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/70 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-gray-900">{profileData.displayName || "—"}</div>
              <div className="text-[10px] text-gray-500">{isRtl ? "الاسم" : "Name"}</div>
            </div>
            <div className="bg-white/70 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-gray-900">{calcAge(profileData.birthDate)} {isRtl ? "سنة" : "y"}</div>
              <div className="text-[10px] text-gray-500">{isRtl ? "العمر" : "Age"}</div>
            </div>
            <div className="bg-white/70 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-gray-900">{parseFloat(profileData.heightCm).toFixed(0)} {isRtl ? "سم" : "cm"}</div>
              <div className="text-[10px] text-gray-500">{isRtl ? "الطول" : "Height"}</div>
            </div>
            <div className="bg-white/70 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-gray-900">{parseFloat(profileData.weightKg).toFixed(0)} {isRtl ? "كجم" : "kg"}</div>
              <div className="text-[10px] text-gray-500">{isRtl ? "الوزن" : "Weight"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goal Selection — only if not yet generated */}
      {!result && (
        <Card className="border-slate-100 mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-500" />
              {isRtl ? "ما هدفك اليوم؟" : "What's your goal today?"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g.key}
                  onClick={() => setSelectedGoal(g.key)}
                  className={`p-3 rounded-xl text-sm font-medium border-2 transition-all ${
                    selectedGoal === g.key
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700 scale-[1.02]"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span className="text-xl block mb-1">{g.icon}</span>
                  {locale === "ar" ? g.ar : g.en}
                </button>
              ))}
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!selectedGoal || generating}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-6 text-base"
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 me-2 animate-spin" />
                  {isRtl ? "جارٍ تحليل بياناتك..." : "Analyzing your data..."}
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 me-2" />
                  {isRtl ? "ابدأ خطتي الشاملة (أكل + تدريب)" : "Generate My Full Plan (Food + Training)"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Success Banner */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 text-white">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5" />
              <span className="font-bold">{isRtl ? "خطتك الشاملة جاهزة!" : "Your Full Plan is Ready!"}</span>
            </div>
            <p className="text-sm text-emerald-100">
              {isRtl ? "خطة غذائية + تدريبية مبنية على بياناتك الطبية" : "Nutrition + Training plan built on your medical data"}
            </p>
          </div>

          {/* Ideal Weight */}
          <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-teal-50/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">{t("idealWeightRange")}</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {result.idealWeightMin} – {result.idealWeightMax} {t("kg")}
                  </p>
                </div>
                <div className="text-end">
                  <div className="flex items-center gap-1 justify-end">
                    {result.weightToChange < 0 ? (
                      <TrendingDown className="h-4 w-4 text-orange-500" />
                    ) : result.weightToChange > 0 ? (
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                    ) : null}
                    <p className="text-lg font-bold text-slate-900">
                      {result.weightToChange > 0 ? "+" : ""}
                      {result.weightToChange} {t("kg")}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {result.estimatedWeeks > 0
                      ? `${result.estimatedWeeks} ${t("weeks")}`
                      : t("alreadyIdeal")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Energy & Macros */}
          <div className="grid grid-cols-2 gap-2">
            <Card className="border-slate-100">
              <CardContent className="p-3 text-center">
                <Flame className="h-4 w-4 text-orange-500 mx-auto mb-1" />
                <div className="text-lg font-bold text-slate-900">{result.targetCalories}</div>
                <div className="text-[10px] text-slate-500">{t("targetCalories")}</div>
              </CardContent>
            </Card>
            <Card className="border-slate-100">
              <CardContent className="p-3 text-center">
                <Droplets className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                <div className="text-lg font-bold text-slate-900">{result.hydrationLiters} {t("liters")}</div>
                <div className="text-[10px] text-slate-500">{t("hydration")}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-100">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-rose-600">{result.macros.protein}g</div>
                  <div className="text-[10px] text-slate-500">{t("protein")}</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-amber-600">{result.macros.carbs}g</div>
                  <div className="text-[10px] text-slate-500">{t("carbs")}</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-sky-600">{result.macros.fat}g</div>
                  <div className="text-[10px] text-slate-500">{t("fat")}</div>
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-100">
                <span>BMR: {result.bmr} {t("kcal")}</span>
                <span>TDEE: {result.tdee} {t("kcal")}</span>
              </div>
            </CardContent>
          </Card>

          {/* Meal Plan */}
          <Card className="border-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Utensils className="h-4 w-4 text-emerald-500" />
                {t("mealPlan")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.meals.map((meal, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
                  <Apple className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {locale === "ar" ? meal.nameAr : meal.nameEn}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {t(`timing_${meal.timing}`)} · {meal.calories} {t("kcal")} · P{meal.protein} C{meal.carbs} F{meal.fat}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Supplements */}
          <Card className="border-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Pill className="h-4 w-4 text-emerald-500" />
                {t("supplements")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.supplements.map((sup, i) => (
                <div key={i} className="p-2 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">
                      {locale === "ar" ? sup.nameAr : sup.nameEn}
                    </p>
                    <Badge variant="secondary" className="text-[9px]">
                      {locale === "ar" ? sup.dosageAr : sup.dosageEn}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {locale === "ar" ? sup.reasonAr : sup.reasonEn}
                  </p>
                </div>
              ))}
              <p className="text-[10px] text-slate-400 pt-1">{t("supplementDisclaimer")}</p>
            </CardContent>
          </Card>

          {/* Training Plan CTA */}
          <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                  <Dumbbell className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">
                    {isRtl ? "خطة التدريب" : "Training Plan"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {isRtl ? "خطة تدريبية مخصصة بناءً على هدفك وبياناتك" : "Custom training plan based on your goal and data"}
                  </p>
                </div>
              </div>

              {trainingPlanCreated ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-100 rounded-lg p-3">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">
                      {isRtl ? "تم إنشاء خطة التدريب بنجاح!" : "Training plan created successfully!"}
                    </span>
                  </div>
                  <Link href={`/${locale}/trainee/training`}>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                      <Zap className="h-4 w-4 me-2" />
                      {isRtl ? "ابدأ التدريب الآن" : "Start Training Now"}
                    </Button>
                  </Link>
                </div>
              ) : (
                <Button
                  onClick={handleCreateTrainingPlan}
                  disabled={creatingPlan}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-5"
                >
                  {creatingPlan ? (
                    <>
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                      {isRtl ? "جارٍ إنشاء خطة التدريب..." : "Creating training plan..."}
                    </>
                  ) : (
                    <>
                      <Dumbbell className="h-4 w-4 me-2" />
                      {isRtl ? "أنشئ خطة التدريب المخصصة" : "Create Custom Training Plan"}
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="border-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-emerald-500" />
                {t("tips")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {(locale === "ar" ? result.tipsAr : result.tipsEn).map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-emerald-500 mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
