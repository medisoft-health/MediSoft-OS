"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Activity,
  ArrowLeft,
  Brain,
  ChevronRight,
  Dna,
  Flame,
  Heart,
  Scale,
  Sparkles,
  Timer,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  calculateBioAge,
  getOptimalRanges,
  type BioAgeInputs,
  type BioAgeResult,
} from "@/lib/sport/bio-age-calculator";

/**
 * MediSport — Bio-Age Calculator
 *
 * 16-input scientific biological age estimation with:
 * - Multi-step form (4 sections)
 * - Visual result dashboard
 * - Domain breakdown (cardiovascular, metabolic, body composition, fitness, lifestyle)
 * - Personalized recommendations
 */
export default function BioAgePage() {
  const t = useTranslations("SportStandalone");
  const tBio = useTranslations("SportBioAge");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const [step, setStep] = React.useState(1);
  const [result, setResult] = React.useState<BioAgeResult | null>(null);
  const [inputs, setInputs] = React.useState<BioAgeInputs>({
    chronologicalAge: 30,
    sex: "male",
    height: 175,
    weight: 78,
    bodyFatPercentage: 18,
    muscleMass: 35,
    waistCircumference: 85,
    restingHeartRate: 65,
    systolicBP: 120,
    diastolicBP: 78,
    vo2Max: 42,
    fastingGlucose: 90,
    hba1c: 5.2,
    totalCholesterol: 190,
    sleepHours: 7,
    exerciseMinutesPerWeek: 180,
  });

  const updateInput = (key: keyof BioAgeInputs, value: number | string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleCalculate = () => {
    const bioResult = calculateBioAge(inputs);
    setResult(bioResult);
    setStep(5); // Results step
  };

  const totalSteps = 4;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${locale}/sport/trainee`}>
          <Button variant="ghost" size="icon" className="rounded-lg">
            <ArrowLeft className={`h-5 w-5 ${isRtl ? "rotate-180" : ""}`} />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{tBio("title")}</h1>
          <p className="text-sm text-slate-500">{tBio("subtitle")}</p>
        </div>
      </div>

      {/* Results View */}
      {result && step === 5 ? (
        <BioAgeResults result={result} locale={locale} tBio={tBio} onReset={() => { setResult(null); setStep(1); }} />
      ) : (
        <>
          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">
                {tBio("step")} {step}/{totalSteps}
              </span>
              <span className="text-xs text-emerald-600 font-medium">
                {Math.round((step / totalSteps) * 100)}%
              </span>
            </div>
            <Progress value={(step / totalSteps) * 100} className="h-2" />
          </div>

          {/* Step 1: Demographics */}
          {step === 1 && (
            <Card className="border-slate-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Scale className="h-4 w-4 text-emerald-500" />
                  {tBio("demographics")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">{tBio("age")}</Label>
                    <Input
                      type="number"
                      value={inputs.chronologicalAge}
                      onChange={(e) => updateInput("chronologicalAge", Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">{tBio("sex")}</Label>
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => updateInput("sex", "male")}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          inputs.sex === "male"
                            ? "bg-blue-100 border-blue-300 text-blue-700"
                            : "border-slate-200 text-slate-600"
                        }`}
                      >
                        {tBio("male")}
                      </button>
                      <button
                        onClick={() => updateInput("sex", "female")}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          inputs.sex === "female"
                            ? "bg-pink-100 border-pink-300 text-pink-700"
                            : "border-slate-200 text-slate-600"
                        }`}
                      >
                        {tBio("female")}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">{tBio("height")} (cm)</Label>
                    <Input
                      type="number"
                      value={inputs.height}
                      onChange={(e) => updateInput("height", Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">{tBio("weight")} (kg)</Label>
                    <Input
                      type="number"
                      value={inputs.weight}
                      onChange={(e) => updateInput("weight", Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Body Composition */}
          {step === 2 && (
            <Card className="border-slate-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  {tBio("bodyComposition")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">{tBio("bodyFat")} (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={inputs.bodyFatPercentage}
                      onChange={(e) => updateInput("bodyFatPercentage", Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">{tBio("muscleMass")} (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={inputs.muscleMass}
                      onChange={(e) => updateInput("muscleMass", Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">{tBio("waist")} (cm)</Label>
                    <Input
                      type="number"
                      value={inputs.waistCircumference}
                      onChange={(e) => updateInput("waistCircumference", Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">{tBio("restingHR")} (bpm)</Label>
                    <Input
                      type="number"
                      value={inputs.restingHeartRate}
                      onChange={(e) => updateInput("restingHeartRate", Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Cardiovascular & Metabolic */}
          {step === 3 && (
            <Card className="border-slate-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  {tBio("cardiovascularMetabolic")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">{tBio("systolicBP")} (mmHg)</Label>
                    <Input
                      type="number"
                      value={inputs.systolicBP}
                      onChange={(e) => updateInput("systolicBP", Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">{tBio("diastolicBP")} (mmHg)</Label>
                    <Input
                      type="number"
                      value={inputs.diastolicBP}
                      onChange={(e) => updateInput("diastolicBP", Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">{tBio("vo2max")} (mL/kg/min)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={inputs.vo2Max}
                      onChange={(e) => updateInput("vo2Max", Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">{tBio("fastingGlucose")} (mg/dL)</Label>
                    <Input
                      type="number"
                      value={inputs.fastingGlucose}
                      onChange={(e) => updateInput("fastingGlucose", Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">{tBio("hba1c")} (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={inputs.hba1c}
                      onChange={(e) => updateInput("hba1c", Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">{tBio("cholesterol")} (mg/dL)</Label>
                    <Input
                      type="number"
                      value={inputs.totalCholesterol}
                      onChange={(e) => updateInput("totalCholesterol", Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Fitness & Lifestyle */}
          {step === 4 && (
            <Card className="border-slate-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  {tBio("fitnessLifestyle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">{tBio("sleepHours")}</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={inputs.sleepHours}
                      onChange={(e) => updateInput("sleepHours", Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">{tBio("exerciseMinutes")}</Label>
                    <Input
                      type="number"
                      value={inputs.exerciseMinutesPerWeek}
                      onChange={(e) => updateInput("exerciseMinutesPerWeek", Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="rounded-lg"
            >
              {tBio("previous")}
            </Button>
            {step < totalSteps ? (
              <Button
                onClick={() => setStep(step + 1)}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {tBio("next")}
              </Button>
            ) : (
              <Button
                onClick={handleCalculate}
                className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
              >
                <Sparkles className="h-4 w-4 me-2" />
                {tBio("calculate")}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Results Component
// ─────────────────────────────────────────────────────────────────

function BioAgeResults({
  result,
  locale,
  tBio,
  onReset,
}: {
  result: BioAgeResult;
  locale: string;
  tBio: ReturnType<typeof useTranslations>;
  onReset: () => void;
}) {
  const isRtl = locale === "ar";
  const isYounger = result.ageDifference < 0;

  const categoryColors: Record<string, string> = {
    exceptional: "from-emerald-500 to-teal-500",
    excellent: "from-green-500 to-emerald-500",
    good: "from-blue-500 to-cyan-500",
    average: "from-yellow-500 to-orange-500",
    below_average: "from-orange-500 to-red-500",
    poor: "from-red-500 to-rose-600",
  };

  const domainIcons: Record<string, React.ReactNode> = {
    cardiovascular: <Heart className="h-4 w-4 text-red-500" />,
    metabolic: <Flame className="h-4 w-4 text-orange-500" />,
    bodyComposition: <Scale className="h-4 w-4 text-blue-500" />,
    fitness: <Activity className="h-4 w-4 text-green-500" />,
    lifestyle: <Brain className="h-4 w-4 text-purple-500" />,
  };

  return (
    <div className="space-y-4">
      {/* Main Result Card */}
      <Card className={`border-0 bg-gradient-to-br ${categoryColors[result.category]} text-white overflow-hidden`}>
        <CardContent className="p-6 text-center relative">
          <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
          <div className="relative">
            <Dna className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-sm opacity-80 mb-1">{tBio("yourBioAge")}</p>
            <div className="text-5xl font-black mb-1">{result.biologicalAge}</div>
            <p className="text-sm opacity-80">{tBio("years")}</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              {isYounger ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {Math.abs(result.ageDifference)} {tBio("yearsOffset")}{" "}
                {isYounger ? tBio("younger") : tBio("older")}
              </span>
            </div>
            <div className="mt-2">
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                {tBio(result.category)} — {tBio("percentile")} {result.percentile}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chronological vs Biological */}
      <Card className="border-slate-100">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-xs text-slate-500">{tBio("chronological")}</p>
              <p className="text-2xl font-bold text-slate-700">{result.chronologicalAge}</p>
            </div>
            <div className="text-center px-4">
              <div className={`text-sm font-bold ${isYounger ? "text-emerald-600" : "text-red-500"}`}>
                {isYounger ? "←" : "→"} {Math.abs(result.ageDifference)}
              </div>
            </div>
            <div className="text-center flex-1">
              <p className="text-xs text-slate-500">{tBio("biological")}</p>
              <p className={`text-2xl font-bold ${isYounger ? "text-emerald-600" : "text-red-500"}`}>
                {result.biologicalAge}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Domain Breakdown */}
      <Card className="border-slate-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{tBio("breakdown")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(result.breakdown).map(([key, domain]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {domainIcons[key]}
                  <span className="text-sm text-slate-700">{tBio(key)}</span>
                </div>
                <span className="text-xs font-medium text-slate-500">{domain.score}/100</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    domain.score >= 70
                      ? "bg-emerald-500"
                      : domain.score >= 50
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${domain.score}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <Card className="border-emerald-100 bg-emerald-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              {tBio("recommendations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <ChevronRight className={`h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0 ${isRtl ? "rotate-180" : ""}`} />
                  {tBio(`rec_${rec}`)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Reset Button */}
      <Button
        variant="outline"
        onClick={onReset}
        className="w-full rounded-lg"
      >
        {tBio("recalculate")}
      </Button>
    </div>
  );
}
