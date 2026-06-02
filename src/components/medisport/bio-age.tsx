"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Brain,
  Calendar,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Heart,
  Leaf,
  Moon,
  RefreshCw,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface BioAgeInputs {
  chronologicalAge: number;
  restingHR: number;
  sleepHours: number;
  sleepQuality: number; // 1-5
  exerciseDaysPerWeek: number;
  exerciseMinutesPerDay: number;
  stressLevel: number; // 1-5
  smokingStatus: "never" | "former" | "current";
  alcoholPerWeek: number; // drinks
  bmi: number;
  waistCircumference: number; // cm
  dailyFruitsVeggies: number; // servings
  waterIntake: number; // glasses
  socialConnections: number; // 1-5
  mentalStimulation: number; // 1-5
  chronicConditions: number; // count
}

interface BioAgeResult {
  biologicalAge: number;
  ageDifference: number; // positive = older, negative = younger
  healthspanScore: number; // 0-100
  categories: {
    cardiovascular: number;
    fitness: number;
    recovery: number;
    nutrition: number;
    mentalHealth: number;
    lifestyle: number;
  };
  recommendations: string[];
  strengths: string[];
}

interface BioAgeHistory {
  date: string;
  biologicalAge: number;
  healthspanScore: number;
  inputs: BioAgeInputs;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Bio Age Calculator Logic
// ═══════════════════════════════════════════════════════════════════════════════

function calculateBioAge(inputs: BioAgeInputs): BioAgeResult {
  let ageMod = 0; // modification to chronological age
  const scores = {
    cardiovascular: 0,
    fitness: 0,
    recovery: 0,
    nutrition: 0,
    mentalHealth: 0,
    lifestyle: 0,
  };

  // === Cardiovascular (Resting HR) ===
  // Optimal: 50-60 bpm (athlete), Average: 60-80, Poor: 80+
  if (inputs.restingHR <= 55) { ageMod -= 3; scores.cardiovascular = 95; }
  else if (inputs.restingHR <= 60) { ageMod -= 2; scores.cardiovascular = 90; }
  else if (inputs.restingHR <= 65) { ageMod -= 1; scores.cardiovascular = 80; }
  else if (inputs.restingHR <= 72) { ageMod += 0; scores.cardiovascular = 70; }
  else if (inputs.restingHR <= 80) { ageMod += 1; scores.cardiovascular = 55; }
  else if (inputs.restingHR <= 90) { ageMod += 3; scores.cardiovascular = 40; }
  else { ageMod += 5; scores.cardiovascular = 25; }

  // === Fitness (Exercise) ===
  const weeklyMinutes = inputs.exerciseDaysPerWeek * inputs.exerciseMinutesPerDay;
  if (weeklyMinutes >= 300) { ageMod -= 4; scores.fitness = 95; }
  else if (weeklyMinutes >= 200) { ageMod -= 3; scores.fitness = 85; }
  else if (weeklyMinutes >= 150) { ageMod -= 2; scores.fitness = 75; }
  else if (weeklyMinutes >= 90) { ageMod -= 1; scores.fitness = 60; }
  else if (weeklyMinutes >= 60) { ageMod += 1; scores.fitness = 45; }
  else if (weeklyMinutes >= 30) { ageMod += 2; scores.fitness = 30; }
  else { ageMod += 4; scores.fitness = 15; }

  // === Recovery (Sleep) ===
  const sleepScore = inputs.sleepHours >= 7 && inputs.sleepHours <= 9 ? 1 : 0;
  const qualityBonus = (inputs.sleepQuality - 3) * 0.5;
  if (sleepScore && inputs.sleepQuality >= 4) { ageMod -= 2; scores.recovery = 90; }
  else if (sleepScore && inputs.sleepQuality >= 3) { ageMod -= 1; scores.recovery = 75; }
  else if (inputs.sleepHours >= 6) { ageMod += 1; scores.recovery = 55; }
  else { ageMod += 3; scores.recovery = 30; }

  // === Nutrition ===
  let nutritionScore = 50;
  // Fruits & veggies
  if (inputs.dailyFruitsVeggies >= 5) { ageMod -= 2; nutritionScore += 25; }
  else if (inputs.dailyFruitsVeggies >= 3) { ageMod -= 1; nutritionScore += 15; }
  else if (inputs.dailyFruitsVeggies < 2) { ageMod += 1; nutritionScore -= 10; }
  // Water
  if (inputs.waterIntake >= 8) { nutritionScore += 15; ageMod -= 0.5; }
  else if (inputs.waterIntake >= 6) { nutritionScore += 10; }
  else if (inputs.waterIntake < 4) { nutritionScore -= 10; ageMod += 1; }
  // BMI
  if (inputs.bmi >= 18.5 && inputs.bmi <= 24.9) { nutritionScore += 10; ageMod -= 1; }
  else if (inputs.bmi >= 25 && inputs.bmi <= 29.9) { ageMod += 2; nutritionScore -= 5; }
  else if (inputs.bmi >= 30) { ageMod += 4; nutritionScore -= 15; }
  else if (inputs.bmi < 18.5) { ageMod += 1; nutritionScore -= 5; }
  scores.nutrition = Math.max(0, Math.min(100, nutritionScore));

  // === Mental Health ===
  const stressPenalty = (inputs.stressLevel - 3) * 1.5;
  ageMod += stressPenalty;
  const socialBonus = (inputs.socialConnections - 3) * 0.5;
  ageMod -= socialBonus;
  const mentalBonus = (inputs.mentalStimulation - 3) * 0.3;
  ageMod -= mentalBonus;
  scores.mentalHealth = Math.max(0, Math.min(100,
    50 + (5 - inputs.stressLevel) * 10 + (inputs.socialConnections - 1) * 5 + (inputs.mentalStimulation - 1) * 5
  ));

  // === Lifestyle ===
  let lifestyleScore = 70;
  if (inputs.smokingStatus === "current") { ageMod += 8; lifestyleScore -= 40; }
  else if (inputs.smokingStatus === "former") { ageMod += 2; lifestyleScore -= 10; }
  if (inputs.alcoholPerWeek > 14) { ageMod += 3; lifestyleScore -= 20; }
  else if (inputs.alcoholPerWeek > 7) { ageMod += 1; lifestyleScore -= 10; }
  else if (inputs.alcoholPerWeek <= 2) { lifestyleScore += 10; }
  if (inputs.chronicConditions > 0) { ageMod += inputs.chronicConditions * 2; lifestyleScore -= inputs.chronicConditions * 10; }
  scores.lifestyle = Math.max(0, Math.min(100, lifestyleScore));

  // Calculate final biological age
  const biologicalAge = Math.round(inputs.chronologicalAge + ageMod);
  const ageDifference = Math.round(ageMod);

  // Healthspan Score (weighted average of all categories)
  const healthspanScore = Math.round(
    scores.cardiovascular * 0.2 +
    scores.fitness * 0.2 +
    scores.recovery * 0.15 +
    scores.nutrition * 0.2 +
    scores.mentalHealth * 0.15 +
    scores.lifestyle * 0.1
  );

  // Generate recommendations
  const recommendations: string[] = [];
  const strengths: string[] = [];

  if (scores.cardiovascular >= 80) strengths.push("صحة القلب ممتازة 💪");
  else recommendations.push("مارس كارديو 30 دقيقة 3-4 مرات أسبوعياً لتحسين صحة القلب");

  if (scores.fitness >= 80) strengths.push("مستوى لياقة عالي 🏃");
  else recommendations.push("زود نشاطك البدني تدريجياً — هدفك 150+ دقيقة أسبوعياً");

  if (scores.recovery >= 80) strengths.push("نوم واستشفاء ممتاز 😴");
  else recommendations.push("حسّن نومك: 7-9 ساعات + روتين ثابت + غرفة مظلمة");

  if (scores.nutrition >= 80) strengths.push("تغذية متوازنة 🥗");
  else recommendations.push("زود الفواكه والخضروات لـ 5 حصص يومياً + اشرب 8 أكواب مياه");

  if (scores.mentalHealth >= 80) strengths.push("صحة نفسية قوية 🧠");
  else recommendations.push("مارس التأمل 10 دقائق يومياً + حافظ على علاقاتك الاجتماعية");

  if (inputs.smokingStatus === "current") recommendations.push("الإقلاع عن التدخين هو أهم خطوة — بيقلل عمرك البيولوجي 5-8 سنوات");
  if (inputs.bmi > 30) recommendations.push("خسارة 5-10% من وزنك هتحسن كل المؤشرات بشكل ملحوظ");

  return {
    biologicalAge,
    ageDifference,
    healthspanScore,
    categories: scores,
    recommendations: recommendations.slice(0, 5),
    strengths: strengths.slice(0, 4),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Bio Age Button (Entry Point)
// ═══════════════════════════════════════════════════════════════════════════════

export function BioAgeButton() {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Card className="cursor-pointer border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 hover:shadow-lg transition-all hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base">عمرك البيولوجي</h3>
                <p className="text-xs text-muted-foreground">اكتشف عمر جسمك الحقيقي</p>
              </div>
              <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-300">
                <Activity className="w-3 h-3 mr-1" />
                صحة
              </Badge>
            </div>
          </CardContent>
        </Card>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-right flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-600" />
            حاسبة العمر البيولوجي
          </SheetTitle>
          <SheetDescription className="text-right">
            اكتشف عمر جسمك الحقيقي بناءً على نمط حياتك ومؤشراتك الصحية
          </SheetDescription>
        </SheetHeader>
        <BioAgeContent />
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Bio Age Content
// ═══════════════════════════════════════════════════════════════════════════════

function BioAgeContent() {
  const [step, setStep] = React.useState(1); // 1-4 input steps, 5 = results
  const [inputs, setInputs] = React.useState<BioAgeInputs>({
    chronologicalAge: 30,
    restingHR: 72,
    sleepHours: 7,
    sleepQuality: 3,
    exerciseDaysPerWeek: 3,
    exerciseMinutesPerDay: 30,
    stressLevel: 3,
    smokingStatus: "never",
    alcoholPerWeek: 0,
    bmi: 24,
    waistCircumference: 85,
    dailyFruitsVeggies: 3,
    waterIntake: 6,
    socialConnections: 3,
    mentalStimulation: 3,
    chronicConditions: 0,
  });
  const [result, setResult] = React.useState<BioAgeResult | null>(null);
  const [history, setHistory] = React.useState<BioAgeHistory[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem("medisport_bioage_history");
    return stored ? JSON.parse(stored) : [];
  });

  const updateInput = (key: keyof BioAgeInputs, value: number | string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const calculate = () => {
    const res = calculateBioAge(inputs);
    setResult(res);
    setStep(5);

    // Save to history
    const entry: BioAgeHistory = {
      date: new Date().toISOString().split("T")[0],
      biologicalAge: res.biologicalAge,
      healthspanScore: res.healthspanScore,
      inputs,
    };
    const newHistory = [entry, ...history].slice(0, 12);
    setHistory(newHistory);
    localStorage.setItem("medisport_bioage_history", JSON.stringify(newHistory));
    toast.success("تم حساب عمرك البيولوجي!");
  };

  return (
    <div className="mt-4 space-y-4" dir="rtl">
      {/* Progress Steps */}
      {step < 5 && (
        <div className="flex items-center justify-center gap-1 mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step ? "w-8 bg-rose-500" : s < step ? "w-6 bg-rose-300" : "w-6 bg-gray-200"
              }`}
            />
          ))}
        </div>
      )}

      {/* ═══ Step 1: Basic Info ═══ */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-rose-500" />
              المعلومات الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">عمرك الحالي (سنة)</label>
              <Input
                type="number"
                value={inputs.chronologicalAge}
                onChange={(e) => updateInput("chronologicalAge", parseInt(e.target.value) || 0)}
                className="text-center text-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">نبض القلب أثناء الراحة (bpm)</label>
              <Input
                type="number"
                value={inputs.restingHR}
                onChange={(e) => updateInput("restingHR", parseInt(e.target.value) || 0)}
                className="text-center text-lg"
              />
              <p className="text-xs text-muted-foreground mt-1">قيسه الصبح قبل ما تقوم من السرير</p>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">مؤشر كتلة الجسم (BMI)</label>
              <Input
                type="number"
                step="0.1"
                value={inputs.bmi}
                onChange={(e) => updateInput("bmi", parseFloat(e.target.value) || 0)}
                className="text-center text-lg"
              />
              <p className="text-xs text-muted-foreground mt-1">الطبيعي: 18.5 - 24.9</p>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">محيط الخصر (سم)</label>
              <Input
                type="number"
                value={inputs.waistCircumference}
                onChange={(e) => updateInput("waistCircumference", parseInt(e.target.value) || 0)}
                className="text-center text-lg"
              />
            </div>
            <Button className="w-full" onClick={() => setStep(2)}>
              التالي
              <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ═══ Step 2: Activity & Sleep ═══ */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-blue-500" />
              النشاط والنوم
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">أيام التمرين في الأسبوع</label>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant={inputs.exerciseDaysPerWeek === d ? "default" : "outline"}
                    className="flex-1 h-9"
                    onClick={() => updateInput("exerciseDaysPerWeek", d)}
                  >
                    {d}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">مدة التمرين (دقيقة/يوم)</label>
              <Input
                type="number"
                value={inputs.exerciseMinutesPerDay}
                onChange={(e) => updateInput("exerciseMinutesPerDay", parseInt(e.target.value) || 0)}
                className="text-center"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">ساعات النوم يومياً</label>
              <Input
                type="number"
                step="0.5"
                value={inputs.sleepHours}
                onChange={(e) => updateInput("sleepHours", parseFloat(e.target.value) || 0)}
                className="text-center"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">جودة النوم</label>
              <div className="flex gap-2">
                {[
                  { v: 1, l: "سيئة جداً" },
                  { v: 2, l: "سيئة" },
                  { v: 3, l: "متوسطة" },
                  { v: 4, l: "جيدة" },
                  { v: 5, l: "ممتازة" },
                ].map((opt) => (
                  <Button
                    key={opt.v}
                    size="sm"
                    variant={inputs.sleepQuality === opt.v ? "default" : "outline"}
                    className="flex-1 text-[10px] h-8 px-1"
                    onClick={() => updateInput("sleepQuality", opt.v)}
                  >
                    {opt.l}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                رجوع
              </Button>
              <Button className="flex-1" onClick={() => setStep(3)}>
                التالي
                <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ Step 3: Nutrition ═══ */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Leaf className="w-5 h-5 text-green-500" />
              التغذية ونمط الحياة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">حصص الفواكه والخضروات يومياً</label>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant={inputs.dailyFruitsVeggies === d ? "default" : "outline"}
                    className="flex-1 h-9"
                    onClick={() => updateInput("dailyFruitsVeggies", d)}
                  >
                    {d}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">أكواب المياه يومياً</label>
              <Input
                type="number"
                value={inputs.waterIntake}
                onChange={(e) => updateInput("waterIntake", parseInt(e.target.value) || 0)}
                className="text-center"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">التدخين</label>
              <div className="flex gap-2">
                {[
                  { v: "never" as const, l: "لا أدخن" },
                  { v: "former" as const, l: "توقفت" },
                  { v: "current" as const, l: "مدخن" },
                ].map((opt) => (
                  <Button
                    key={opt.v}
                    size="sm"
                    variant={inputs.smokingStatus === opt.v ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => updateInput("smokingStatus", opt.v)}
                  >
                    {opt.l}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">المشروبات الكحولية أسبوعياً</label>
              <Input
                type="number"
                value={inputs.alcoholPerWeek}
                onChange={(e) => updateInput("alcoholPerWeek", parseInt(e.target.value) || 0)}
                className="text-center"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">أمراض مزمنة (عدد)</label>
              <div className="flex gap-2">
                {[0, 1, 2, 3].map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant={inputs.chronicConditions === d ? "default" : "outline"}
                    className="flex-1 h-9"
                    onClick={() => updateInput("chronicConditions", d)}
                  >
                    {d === 3 ? "3+" : d}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                رجوع
              </Button>
              <Button className="flex-1" onClick={() => setStep(4)}>
                التالي
                <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ Step 4: Mental & Social ═══ */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              الصحة النفسية والاجتماعية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">مستوى التوتر</label>
              <div className="flex gap-2">
                {[
                  { v: 1, l: "منخفض جداً" },
                  { v: 2, l: "منخفض" },
                  { v: 3, l: "متوسط" },
                  { v: 4, l: "عالي" },
                  { v: 5, l: "عالي جداً" },
                ].map((opt) => (
                  <Button
                    key={opt.v}
                    size="sm"
                    variant={inputs.stressLevel === opt.v ? "default" : "outline"}
                    className="flex-1 text-[10px] h-8 px-1"
                    onClick={() => updateInput("stressLevel", opt.v)}
                  >
                    {opt.l}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">العلاقات الاجتماعية</label>
              <div className="flex gap-2">
                {[
                  { v: 1, l: "معزول" },
                  { v: 2, l: "قليلة" },
                  { v: 3, l: "متوسطة" },
                  { v: 4, l: "جيدة" },
                  { v: 5, l: "ممتازة" },
                ].map((opt) => (
                  <Button
                    key={opt.v}
                    size="sm"
                    variant={inputs.socialConnections === opt.v ? "default" : "outline"}
                    className="flex-1 text-[10px] h-8 px-1"
                    onClick={() => updateInput("socialConnections", opt.v)}
                  >
                    {opt.l}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">التحفيز الذهني (قراءة، ألغاز، تعلم)</label>
              <div className="flex gap-2">
                {[
                  { v: 1, l: "نادر" },
                  { v: 2, l: "قليل" },
                  { v: 3, l: "متوسط" },
                  { v: 4, l: "كثير" },
                  { v: 5, l: "يومي" },
                ].map((opt) => (
                  <Button
                    key={opt.v}
                    size="sm"
                    variant={inputs.mentalStimulation === opt.v ? "default" : "outline"}
                    className="flex-1 text-[10px] h-8 px-1"
                    onClick={() => updateInput("mentalStimulation", opt.v)}
                  >
                    {opt.l}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>
                رجوع
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500"
                onClick={calculate}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                احسب عمري البيولوجي
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ Step 5: Results ═══ */}
      {step === 5 && result && (
        <div className="space-y-4">
          {/* Main Result */}
          <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200">
            <CardContent className="p-6 text-center">
              <h3 className="text-sm text-muted-foreground mb-2">عمرك البيولوجي</h3>
              <div className="text-6xl font-bold text-rose-600 mb-1">
                {result.biologicalAge}
              </div>
              <div className="text-sm text-muted-foreground mb-3">
                عمرك الحقيقي: {inputs.chronologicalAge} سنة
              </div>
              <div
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold ${
                  result.ageDifference < 0
                    ? "bg-green-100 text-green-700"
                    : result.ageDifference > 0
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {result.ageDifference < 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4" />
                    جسمك أصغر بـ {Math.abs(result.ageDifference)} سنة!
                  </>
                ) : result.ageDifference > 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    جسمك أكبر بـ {result.ageDifference} سنة
                  </>
                ) : (
                  "جسمك يطابق عمرك"
                )}
              </div>
            </CardContent>
          </Card>

          {/* Healthspan Score */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm">مؤشر الصحة العامة</h4>
                <span className="text-2xl font-bold text-rose-600">{result.healthspanScore}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-full rounded-full transition-all ${
                    result.healthspanScore >= 80
                      ? "bg-green-500"
                      : result.healthspanScore >= 60
                      ? "bg-yellow-500"
                      : result.healthspanScore >= 40
                      ? "bg-orange-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${result.healthspanScore}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                <span>ضعيف</span>
                <span>متوسط</span>
                <span>جيد</span>
                <span>ممتاز</span>
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">تحليل تفصيلي</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2.5">
              {[
                { key: "cardiovascular", label: "صحة القلب", icon: Heart, color: "bg-red-500" },
                { key: "fitness", label: "اللياقة البدنية", icon: Dumbbell, color: "bg-blue-500" },
                { key: "recovery", label: "النوم والاستشفاء", icon: Moon, color: "bg-purple-500" },
                { key: "nutrition", label: "التغذية", icon: Leaf, color: "bg-green-500" },
                { key: "mentalHealth", label: "الصحة النفسية", icon: Brain, color: "bg-amber-500" },
                { key: "lifestyle", label: "نمط الحياة", icon: Zap, color: "bg-indigo-500" },
              ].map((cat) => {
                const score = result.categories[cat.key as keyof typeof result.categories];
                return (
                  <div key={cat.key} className="flex items-center gap-2">
                    <cat.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-xs w-24 shrink-0">{cat.label}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-full rounded-full ${cat.color}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold w-8 text-left">{score}%</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Strengths */}
          {result.strengths.length > 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  نقاط قوتك
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-1.5">
                {result.strengths.map((s, i) => (
                  <div key={i} className="text-sm text-green-700">{s}</div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <Card className="bg-amber-50 border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-800 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  توصيات لتحسين عمرك البيولوجي
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {result.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-amber-800">
                    <span className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    {rec}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* History */}
          {history.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  سجل القياسات
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-1.5">
                  {history.slice(0, 5).map((entry, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded p-2">
                      <span>{entry.date}</span>
                      <div className="flex items-center gap-3">
                        <span>عمر بيولوجي: <strong>{entry.biologicalAge}</strong></span>
                        <Badge variant="outline" className="text-[10px]">
                          {entry.healthspanScore}/100
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recalculate */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => { setStep(1); setResult(null); }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            أعد الحساب
          </Button>
        </div>
      )}
    </div>
  );
}
