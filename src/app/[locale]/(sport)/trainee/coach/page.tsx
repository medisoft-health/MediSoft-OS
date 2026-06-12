"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  Apple,
  Droplets,
  Dumbbell,
  Flame,
  Pill,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UserRound,
  Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  generateCoachPlan,
  type ActivityLevel,
  type CoachInput,
  type CoachResult,
  type Goal,
  type Sex,
} from "@/lib/sport/personal-coach";

const ACTIVITY_OPTIONS: { key: ActivityLevel; ar: string; en: string }[] = [
  { key: "sedentary", ar: "خامل", en: "Sedentary" },
  { key: "light", ar: "نشاط خفيف", en: "Light" },
  { key: "moderate", ar: "نشاط متوسط", en: "Moderate" },
  { key: "active", ar: "نشيط", en: "Active" },
  { key: "very_active", ar: "نشيط جداً", en: "Very Active" },
];

const GOAL_OPTIONS: { key: Goal; ar: string; en: string }[] = [
  { key: "fat_loss", ar: "خسارة الدهون", en: "Fat Loss" },
  { key: "muscle_gain", ar: "بناء العضلات", en: "Muscle Gain" },
  { key: "maintain", ar: "الحفاظ على الوزن", en: "Maintain" },
  { key: "performance", ar: "تحسين الأداء", en: "Performance" },
];

/**
 * MediSport Personal Coach
 * Nutrition + ideal-weight guidance, meal & supplement suggestions.
 */
export default function PersonalCoachPage() {
  const t = useTranslations("SportCoach");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const [form, setForm] = React.useState<CoachInput>({
    sex: "male",
    age: 28,
    height: 175,
    weight: 80,
    activityLevel: "moderate",
    goal: "fat_loss",
  });
  const [result, setResult] = React.useState<CoachResult | null>(null);

  const update = <K extends keyof CoachInput>(key: K, value: CoachInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleGenerate = () => {
    setResult(generateCoachPlan(form));
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${locale}/sport/trainee`}>
          <Button variant="ghost" size="icon" className="rounded-lg">
            <ArrowLeft className={`h-5 w-5 ${isRtl ? "rotate-180" : ""}`} />
          </Button>
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
            <UserRound className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t("title")}</h1>
            <p className="text-sm text-slate-500">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <Card className="border-slate-100 mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-500" />
            {t("yourData")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sex */}
          <div>
            <Label className="text-sm">{t("sex")}</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {(["male", "female"] as Sex[]).map((s) => (
                <button
                  key={s}
                  onClick={() => update("sex", s)}
                  className={`py-2 rounded-lg text-sm font-medium border ${
                    form.sex === s
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  {t(s)}
                </button>
              ))}
            </div>
          </div>

          {/* Age / Height / Weight */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">{t("age")}</Label>
              <Input
                type="number"
                value={form.age}
                onChange={(e) => update("age", Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">{t("height")}</Label>
              <Input
                type="number"
                value={form.height}
                onChange={(e) => update("height", Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">{t("weight")}</Label>
              <Input
                type="number"
                value={form.weight}
                onChange={(e) => update("weight", Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>

          {/* Optional body composition */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-slate-500">{t("bodyFatOptional")}</Label>
              <Input
                type="number"
                value={form.bodyFatPercentage ?? ""}
                onChange={(e) =>
                  update("bodyFatPercentage", e.target.value ? Number(e.target.value) : undefined)
                }
                placeholder="—"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500">{t("muscleMassOptional")}</Label>
              <Input
                type="number"
                value={form.muscleMass ?? ""}
                onChange={(e) =>
                  update("muscleMass", e.target.value ? Number(e.target.value) : undefined)
                }
                placeholder="—"
                className="mt-1"
              />
            </div>
          </div>

          {/* Activity level */}
          <div>
            <Label className="text-sm">{t("activityLevel")}</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {ACTIVITY_OPTIONS.map((a) => (
                <button
                  key={a.key}
                  onClick={() => update("activityLevel", a.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                    form.activityLevel === a.key
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  {locale === "ar" ? a.ar : a.en}
                </button>
              ))}
            </div>
          </div>

          {/* Goal */}
          <div>
            <Label className="text-sm">{t("goal")}</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g.key}
                  onClick={() => update("goal", g.key)}
                  className={`py-2 rounded-lg text-sm font-medium border ${
                    form.goal === g.key
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  {locale === "ar" ? g.ar : g.en}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Sparkles className="h-4 w-4 me-1.5" />
            {t("generatePlan")}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4">
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
