"use client";

import * as React from "react";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Apple,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Dumbbell,
  FlaskConical,
  Heart,
  Loader2,
  Pill,
  Ruler,
  Scale,
  Sparkles,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
  User,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface CoachProfile {
  gender: "male" | "female";
  age: number;
  height: number;
  weight: number;
  targetWeight: number;
  activityLevel: string;
  bodyType: string;
  muscleMass?: number;
  bodyFatPercent?: number;
  inputMethod: "smart_scale" | "basic" | "visual";
  goal: "lose" | "gain" | "maintain" | "recomp";
}

interface NutritionPlan {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  water: number;
  meals: MealPlan[];
  supplements: Supplement[];
  timeline: string;
  weeklyLoss: number;
}

interface MealPlan {
  name: string;
  time: string;
  calories: number;
  description: string;
  options: string[];
}

interface Supplement {
  name: string;
  dosage: string;
  timing: string;
  reason: string;
  safe: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const BODY_TYPES = [
  { id: "apple", name: "تفاحة", description: "دهون متركزة في البطن", icon: "🍎", svg: "rounded-full w-12 h-14 bg-gradient-to-b from-red-200 to-red-300" },
  { id: "pear", name: "كمثرى", description: "دهون متركزة في الأرداف", icon: "🍐", svg: "rounded-b-full rounded-t-lg w-10 h-14 bg-gradient-to-b from-green-200 to-green-300" },
  { id: "rectangle", name: "مستطيل", description: "توزيع متساوي", icon: "▬", svg: "rounded-lg w-10 h-14 bg-gradient-to-b from-blue-200 to-blue-300" },
  { id: "hourglass", name: "ساعة رملية", description: "أكتاف وأرداف عريضة ووسط نحيف", icon: "⏳", svg: "rounded-full w-12 h-14 bg-gradient-to-b from-purple-200 to-purple-300" },
  { id: "inverted_triangle", name: "مثلث مقلوب", description: "أكتاف عريضة ووسط نحيف", icon: "🔻", svg: "w-12 h-14 bg-gradient-to-b from-amber-200 to-amber-300" },
  { id: "athletic", name: "رياضي", description: "عضلات بارزة ودهون قليلة", icon: "💪", svg: "rounded-lg w-11 h-14 bg-gradient-to-b from-emerald-200 to-emerald-300" },
];

const BODY_FAT_REFS_MALE = [
  { percent: "8-10%", description: "عضلات محددة جداً — مستوى منافسات", level: "elite" },
  { percent: "11-14%", description: "عضلات واضحة — لياقة عالية", level: "fit" },
  { percent: "15-19%", description: "جسم جيد — بعض الدهون", level: "average" },
  { percent: "20-24%", description: "دهون ملحوظة — وزن زائد قليل", level: "above" },
  { percent: "25-30%", description: "سمنة خفيفة", level: "overweight" },
  { percent: "30%+", description: "سمنة", level: "obese" },
];

const BODY_FAT_REFS_FEMALE = [
  { percent: "14-17%", description: "عضلات محددة — مستوى منافسات", level: "elite" },
  { percent: "18-22%", description: "لياقة عالية — جسم رياضي", level: "fit" },
  { percent: "23-27%", description: "جسم جيد — طبيعي", level: "average" },
  { percent: "28-33%", description: "دهون ملحوظة — وزن زائد قليل", level: "above" },
  { percent: "34-39%", description: "سمنة خفيفة", level: "overweight" },
  { percent: "40%+", description: "سمنة", level: "obese" },
];

const ACTIVITY_LEVELS = [
  { id: "sedentary", name: "قليل الحركة", description: "مكتبي — بدون تمرين", factor: 1.2 },
  { id: "light", name: "نشاط خفيف", description: "تمرين 1-2 مرة/أسبوع", factor: 1.375 },
  { id: "moderate", name: "نشاط متوسط", description: "تمرين 3-5 مرات/أسبوع", factor: 1.55 },
  { id: "active", name: "نشيط جداً", description: "تمرين 6-7 مرات/أسبوع", factor: 1.725 },
  { id: "extreme", name: "رياضي محترف", description: "تمرين مرتين يومياً", factor: 1.9 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Calculation Functions
// ═══════════════════════════════════════════════════════════════════════════════

function calculateBMR(gender: string, weight: number, height: number, age: number): number {
  // Mifflin-St Jeor Equation
  if (gender === "male") {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

function calculateTDEE(bmr: number, activityLevel: string): number {
  const factor = ACTIVITY_LEVELS.find(a => a.id === activityLevel)?.factor || 1.55;
  return Math.round(bmr * factor);
}

function calculateIdealWeight(gender: string, height: number): { min: number; max: number; ideal: number } {
  // Devine formula + range
  const heightInches = height / 2.54;
  let ideal: number;
  if (gender === "male") {
    ideal = 50 + 2.3 * (heightInches - 60);
  } else {
    ideal = 45.5 + 2.3 * (heightInches - 60);
  }
  return { min: Math.round(ideal * 0.9), max: Math.round(ideal * 1.1), ideal: Math.round(ideal) };
}

function calculateBMI(weight: number, height: number): { value: number; category: string; color: string } {
  const bmi = weight / Math.pow(height / 100, 2);
  let category = "";
  let color = "";
  if (bmi < 18.5) { category = "نقص وزن"; color = "text-blue-600"; }
  else if (bmi < 25) { category = "طبيعي"; color = "text-green-600"; }
  else if (bmi < 30) { category = "وزن زائد"; color = "text-amber-600"; }
  else { category = "سمنة"; color = "text-red-600"; }
  return { value: Math.round(bmi * 10) / 10, category, color };
}

function generateNutritionPlan(profile: CoachProfile): NutritionPlan {
  const bmr = calculateBMR(profile.gender, profile.weight, profile.height, profile.age);
  const tdee = calculateTDEE(bmr, profile.activityLevel);

  let calories: number;
  let weeklyLoss = 0;
  let timeline = "";

  const diff = Math.abs(profile.weight - profile.targetWeight);

  if (profile.goal === "lose") {
    calories = tdee - 500; // 500 calorie deficit = ~0.5kg/week
    weeklyLoss = 0.5;
    timeline = `${Math.ceil(diff / 0.5)} أسبوع (${Math.ceil(diff / 2)} شهر)`;
  } else if (profile.goal === "gain") {
    calories = tdee + 300; // 300 surplus for lean gain
    weeklyLoss = -0.25;
    timeline = `${Math.ceil(diff / 0.25)} أسبوع (${Math.ceil(diff / 1)} شهر)`;
  } else if (profile.goal === "recomp") {
    calories = tdee;
    weeklyLoss = 0;
    timeline = "12-16 أسبوع لنتائج ملحوظة";
  } else {
    calories = tdee;
    weeklyLoss = 0;
    timeline = "مستمر — حافظ على نمط حياتك";
  }

  // Macros
  const proteinPerKg = profile.goal === "lose" ? 2.2 : profile.goal === "gain" ? 2.0 : 1.8;
  const protein = Math.round(profile.weight * proteinPerKg);
  const fats = Math.round(calories * 0.25 / 9);
  const carbs = Math.round((calories - protein * 4 - fats * 9) / 4);
  const water = Math.round(profile.weight * 0.033 * 10) / 10;

  // Meals
  const meals: MealPlan[] = [
    {
      name: "الفطار",
      time: "7:00 - 8:00",
      calories: Math.round(calories * 0.25),
      description: "وجبة غنية بالبروتين والكربوهيدرات المعقدة",
      options: [
        `${Math.round(protein * 0.25)}g بروتين (بيض، زبادي يوناني، أو شوفان بالواي)`,
        "شوفان + موز + عسل + مكسرات",
        "بيض مسلوق (3-4) + خبز أسمر + أفوكادو",
        "زبادي يوناني + جرانولا + فواكه",
      ],
    },
    {
      name: "سناك صباحي",
      time: "10:00 - 10:30",
      calories: Math.round(calories * 0.1),
      description: "سناك خفيف للحفاظ على الطاقة",
      options: [
        "حفنة مكسرات (لوز أو كاجو) + تفاحة",
        "بروتين بار",
        "زبادي + عسل",
      ],
    },
    {
      name: "الغداء",
      time: "13:00 - 14:00",
      calories: Math.round(calories * 0.30),
      description: "الوجبة الرئيسية — متوازنة بين البروتين والكربوهيدرات",
      options: [
        `${Math.round(protein * 0.30)}g بروتين (صدور فراخ، سمك، أو لحم)`,
        "فراخ مشوية + أرز بني + سلطة خضراء",
        "سمك سلمون + بطاطا حلوة + خضار مشوي",
        "لحم مفروم قليل الدهن + مكرونة + صوص طماطم",
      ],
    },
    {
      name: "سناك ما قبل التمرين",
      time: "16:00 - 16:30",
      calories: Math.round(calories * 0.10),
      description: "طاقة سريعة قبل التمرين بـ 30-60 دقيقة",
      options: [
        "موزة + ملعقة عسل",
        "خبز أبيض + مربى",
        "تمر (3-4 حبات) + قهوة",
      ],
    },
    {
      name: "بعد التمرين",
      time: "بعد التمرين مباشرة",
      calories: Math.round(calories * 0.10),
      description: "بروتين سريع + كربوهيدرات لاستعادة الجليكوجين",
      options: [
        `واي بروتين (${Math.round(protein * 0.2)}g) + موز`,
        "حليب شوكولاتة + بروتين بار",
        "زبادي يوناني + عسل + فواكه",
      ],
    },
    {
      name: "العشاء",
      time: "19:00 - 20:00",
      calories: Math.round(calories * 0.15),
      description: "وجبة خفيفة غنية بالبروتين — قبل النوم بـ 3 ساعات",
      options: [
        "سلطة تونة + خبز أسمر",
        "بيض أومليت + خضار",
        "صدور فراخ + سلطة",
        "شوربة عدس + خبز",
      ],
    },
  ];

  // Supplements
  const supplements: Supplement[] = [
    { name: "واي بروتين (Whey Protein)", dosage: "25-30g", timing: "بعد التمرين", reason: "بناء وإصلاح العضلات", safe: true },
    { name: "كرياتين (Creatine)", dosage: "5g يومياً", timing: "أي وقت", reason: "زيادة القوة والأداء", safe: true },
    { name: "فيتامين D3", dosage: "2000-4000 IU", timing: "مع الفطار", reason: "صحة العظام والمناعة", safe: true },
    { name: "أوميجا 3 (زيت السمك)", dosage: "1000-2000mg", timing: "مع الغداء", reason: "صحة القلب ومضاد للالتهاب", safe: true },
    { name: "مغنيسيوم", dosage: "200-400mg", timing: "قبل النوم", reason: "تعافي العضلات وجودة النوم", safe: true },
  ];

  if (profile.goal === "lose") {
    supplements.push({ name: "ألياف (Psyllium Husk)", dosage: "5-10g", timing: "قبل الوجبات", reason: "الشبع وتنظيم الهضم", safe: true });
  }
  if (profile.goal === "gain") {
    supplements.push({ name: "كازين بروتين", dosage: "30g", timing: "قبل النوم", reason: "بروتين بطيء الامتصاص للبناء أثناء النوم", safe: true });
  }

  return { calories, protein, carbs, fats, water, meals, supplements, timeline, weeklyLoss };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Personal Coach Component
// ═══════════════════════════════════════════════════════════════════════════════

export function PersonalCoachButton() {
  const [open, setOpen] = React.useState(false);
  const [coachStep, setCoachStep] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [showResults, setShowResults] = React.useState(false);

  // Form state
  const [gender, setGender] = React.useState<"male" | "female">("male");
  const [age, setAge] = React.useState("");
  const [height, setHeight] = React.useState("");
  const [weight, setWeight] = React.useState("");
  const [targetWeight, setTargetWeight] = React.useState("");
  const [activityLevel, setActivityLevel] = React.useState("");
  const [bodyType, setBodyType] = React.useState("");
  const [inputMethod, setInputMethod] = React.useState<"smart_scale" | "basic" | "visual">("basic");
  const [muscleMass, setMuscleMass] = React.useState("");
  const [bodyFatPercent, setBodyFatPercent] = React.useState("");
  const [selectedFatRef, setSelectedFatRef] = React.useState("");
  const [goal, setGoal] = React.useState<"lose" | "gain" | "maintain" | "recomp">("lose");

  // Results
  const [plan, setPlan] = React.useState<NutritionPlan | null>(null);
  const [idealWeight, setIdealWeight] = React.useState<{ min: number; max: number; ideal: number } | null>(null);
  const [bmi, setBmi] = React.useState<{ value: number; category: string; color: string } | null>(null);

  const totalSteps = 4;

  const handleGenerate = () => {
    setLoading(true);
    const w = Number(weight);
    const h = Number(height);
    const a = Number(age);
    const tw = Number(targetWeight) || w;

    // Determine goal
    let autoGoal = goal;
    if (tw < w - 2) autoGoal = "lose";
    else if (tw > w + 2) autoGoal = "gain";
    else autoGoal = "maintain";

    const profile: CoachProfile = {
      gender,
      age: a,
      height: h,
      weight: w,
      targetWeight: tw,
      activityLevel,
      bodyType,
      muscleMass: muscleMass ? Number(muscleMass) : undefined,
      bodyFatPercent: bodyFatPercent ? Number(bodyFatPercent) : selectedFatRef ? parseFloat(selectedFatRef) : undefined,
      inputMethod,
      goal: autoGoal,
    };

    const generatedPlan = generateNutritionPlan(profile);
    const iw = calculateIdealWeight(gender, h);
    const bmiResult = calculateBMI(w, h);

    setPlan(generatedPlan);
    setIdealWeight(iw);
    setBmi(bmiResult);

    setTimeout(() => {
      setLoading(false);
      setShowResults(true);
      toast.success("تم إعداد خطتك الشخصية! 🎉");
    }, 1500);
  };

  const handleReset = () => {
    setCoachStep(1);
    setShowResults(false);
    setPlan(null);
    setIdealWeight(null);
    setBmi(null);
  };

  const canProceed = () => {
    if (coachStep === 1) return gender && age && height && weight;
    if (coachStep === 2) return !!inputMethod;
    if (coachStep === 3) return activityLevel !== "";
    if (coachStep === 4) return targetWeight !== "";
    return false;
  };

  const bodyFatRefs = gender === "male" ? BODY_FAT_REFS_MALE : BODY_FAT_REFS_FEMALE;

  return (
    <>
      {/* Coach Button Card */}
      <Card
        className="cursor-pointer border-2 border-dashed border-pink-300 hover:border-pink-500 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-pink-50 via-white to-blue-50"
        onClick={() => setOpen(true)}
      >
        <CardContent className="flex items-center gap-4 p-4">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-blue-600 text-white shadow-lg">
            <User className="h-7 w-7" />
            <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
              <Sparkles className="h-3 w-3" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm bg-gradient-to-r from-pink-600 to-blue-600 bg-clip-text text-transparent">
                MediSport Personal Coach
              </p>
              <Badge className="bg-gradient-to-r from-pink-500 to-blue-500 text-white text-[9px] px-1.5">
                جديد
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              مدربك الشخصي — خطة تغذية + وزن مثالي + مكملات مخصصة ليك
            </p>
          </div>
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </CardContent>
      </Card>

      {/* Coach Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="text-right pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-blue-600 text-white">
                <User className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-right">MediSport Personal Coach</SheetTitle>
                <SheetDescription className="text-right">مدربك الشخصي الذكي</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Show Results */}
            {showResults && plan && idealWeight && bmi ? (
              <div className="space-y-4">
                {/* BMI & Ideal Weight */}
                <Card className="border-blue-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Scale className="h-4 w-4 text-blue-600" /> تحليل جسمك
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-gray-50 p-2">
                        <p className={`text-lg font-bold ${bmi.color}`}>{bmi.value}</p>
                        <p className="text-[10px] text-muted-foreground">BMI</p>
                        <p className={`text-[10px] font-medium ${bmi.color}`}>{bmi.category}</p>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-2">
                        <p className="text-lg font-bold text-blue-700">{weight}</p>
                        <p className="text-[10px] text-muted-foreground">وزنك الحالي</p>
                        <p className="text-[10px]">كجم</p>
                      </div>
                      <div className="rounded-lg bg-green-50 p-2">
                        <p className="text-lg font-bold text-green-700">{idealWeight.ideal}</p>
                        <p className="text-[10px] text-muted-foreground">الوزن المثالي</p>
                        <p className="text-[10px]">{idealWeight.min}-{idealWeight.max} كجم</p>
                      </div>
                    </div>

                    {/* Weight difference message */}
                    <div className={`rounded-lg p-3 text-xs ${
                      Number(weight) > idealWeight.max ? "bg-amber-50 border border-amber-200" :
                      Number(weight) < idealWeight.min ? "bg-blue-50 border border-blue-200" :
                      "bg-green-50 border border-green-200"
                    }`}>
                      {Number(weight) > idealWeight.max ? (
                        <p className="text-amber-800">
                          <span className="font-bold">محتاج تنزل {Number(weight) - idealWeight.ideal} كجم</span> عشان توصل لوزنك المثالي.
                          {plan.timeline && <span className="block mt-1">⏱️ المدة المتوقعة: <strong>{plan.timeline}</strong></span>}
                        </p>
                      ) : Number(weight) < idealWeight.min ? (
                        <p className="text-blue-800">
                          <span className="font-bold">محتاج تزود {idealWeight.ideal - Number(weight)} كجم</span> عشان توصل لوزنك المثالي.
                          {plan.timeline && <span className="block mt-1">⏱️ المدة المتوقعة: <strong>{plan.timeline}</strong></span>}
                        </p>
                      ) : (
                        <p className="text-green-800">
                          <span className="font-bold">ممتاز! وزنك في المعدل المثالي 🎉</span>
                          <span className="block mt-1">حافظ على نمط حياتك الحالي.</span>
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Daily Calories & Macros */}
                <Card className="border-green-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Apple className="h-4 w-4 text-green-600" /> خطة التغذية اليومية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="rounded-lg bg-red-50 p-2">
                        <p className="text-lg font-bold text-red-700">{plan.calories}</p>
                        <p className="text-[9px] text-muted-foreground">سعرات/يوم</p>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-2">
                        <p className="text-lg font-bold text-blue-700">{plan.protein}g</p>
                        <p className="text-[9px] text-muted-foreground">بروتين</p>
                      </div>
                      <div className="rounded-lg bg-amber-50 p-2">
                        <p className="text-lg font-bold text-amber-700">{plan.carbs}g</p>
                        <p className="text-[9px] text-muted-foreground">كربوهيدرات</p>
                      </div>
                      <div className="rounded-lg bg-green-50 p-2">
                        <p className="text-lg font-bold text-green-700">{plan.fats}g</p>
                        <p className="text-[9px] text-muted-foreground">دهون</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-2 text-xs">
                      <span>💧</span>
                      <span>اشرب <strong>{plan.water} لتر</strong> مياه يومياً ({Math.round(plan.water / 0.25)} كوب)</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Meal Plan */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Timer className="h-4 w-4 text-orange-600" /> الوجبات المقترحة
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {plan.meals.map((meal, i) => (
                      <div key={i} className="rounded-lg border p-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold">{meal.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px]">{meal.time}</Badge>
                            <Badge className="bg-red-100 text-red-700 text-[9px]">{meal.calories} سعرة</Badge>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-1">{meal.description}</p>
                        <div className="space-y-0.5">
                          {meal.options.map((opt, j) => (
                            <p key={j} className="text-[10px] text-gray-600 flex items-start gap-1">
                              <span className="text-green-500 mt-0.5">•</span> {opt}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Supplements */}
                <Card className="border-purple-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Pill className="h-4 w-4 text-purple-600" /> المكملات الغذائية المقترحة
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {plan.supplements.map((sup, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg border p-2.5">
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">{sup.name}</span>
                            <Badge variant="outline" className="text-[9px]">{sup.dosage}</Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{sup.reason}</p>
                          <p className="text-[10px] text-blue-600">⏰ {sup.timing}</p>
                        </div>
                      </div>
                    ))}
                    <div className="rounded-lg bg-green-50 p-2 text-[10px] text-green-800">
                      ✅ كل المكملات المقترحة آمنة ومسموح بيها من WADA
                    </div>
                  </CardContent>
                </Card>

                {/* Weekly Plan Summary */}
                <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-emerald-800 space-y-1">
                        <p className="font-bold text-sm">ملخص خطتك:</p>
                        <p>• السعرات اليومية: <strong>{plan.calories}</strong> سعرة</p>
                        <p>• البروتين: <strong>{plan.protein}g</strong> ({(plan.protein / Number(weight)).toFixed(1)}g لكل كجم)</p>
                        {plan.weeklyLoss > 0 && <p>• معدل النزول المتوقع: <strong>{plan.weeklyLoss} كجم/أسبوع</strong></p>}
                        {plan.weeklyLoss < 0 && <p>• معدل الزيادة المتوقع: <strong>{Math.abs(plan.weeklyLoss)} كجم/أسبوع</strong></p>}
                        <p>• المدة للوصول للهدف: <strong>{plan.timeline}</strong></p>
                        <p>• المياه: <strong>{plan.water} لتر/يوم</strong></p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button onClick={handleReset} variant="outline" className="flex-1" size="sm">
                    إعادة الحساب
                  </Button>
                  <Button onClick={() => { toast.success("تم حفظ الخطة!"); setOpen(false); }} className="flex-1 bg-gradient-to-r from-pink-500 to-blue-600" size="sm">
                    حفظ الخطة
                  </Button>
                </div>
              </div>
            ) : loading ? (
              /* Loading */
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-r from-pink-500 to-blue-600 animate-pulse flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-white animate-spin" />
                  </div>
                </div>
                <p className="text-sm font-medium">جاري إعداد خطتك الشخصية...</p>
                <p className="text-xs text-muted-foreground">بنحسب السعرات والماكروز والوجبات المناسبة ليك</p>
              </div>
            ) : (
              /* Steps */
              <>
                {/* Progress */}
                <div className="flex items-center justify-center gap-2">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i + 1 <= coachStep ? "w-10 bg-gradient-to-r from-pink-500 to-blue-600" : "w-6 bg-gray-200"
                      }`}
                    />
                  ))}
                </div>

                {/* Step 1: Basic Info */}
                {coachStep === 1 && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="font-bold">معلوماتك الأساسية</h3>
                      <p className="text-xs text-muted-foreground">عشان نحسبلك الوزن المثالي والسعرات</p>
                    </div>

                    {/* Gender */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setGender("male")}
                        className={`rounded-xl border-2 p-3 text-center transition-all ${
                          gender === "male" ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span className="text-2xl">👨</span>
                        <p className="text-xs font-medium mt-1">ذكر</p>
                      </button>
                      <button
                        onClick={() => setGender("female")}
                        className={`rounded-xl border-2 p-3 text-center transition-all ${
                          gender === "female" ? "border-pink-500 bg-pink-50 ring-2 ring-pink-200" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span className="text-2xl">👩</span>
                        <p className="text-xs font-medium mt-1">أنثى</p>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium mb-1 block">العمر</label>
                        <Input type="number" placeholder="25" value={age} onChange={(e) => setAge(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">الطول (سم)</label>
                        <Input type="number" placeholder="175" value={height} onChange={(e) => setHeight(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">الوزن (كجم)</label>
                        <Input type="number" placeholder="80" value={weight} onChange={(e) => setWeight(e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Body Composition Method */}
                {coachStep === 2 && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="font-bold">تحليل جسمك</h3>
                      <p className="text-xs text-muted-foreground">اختار الطريقة المتاحة ليك</p>
                    </div>

                    {/* Input Method Selection */}
                    <div className="space-y-2">
                      <button
                        onClick={() => setInputMethod("smart_scale")}
                        className={`w-full rounded-xl border-2 p-3 text-right transition-all ${
                          inputMethod === "smart_scale" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Scale className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-xs font-bold">ميزان ذكي (Smart Scale)</p>
                            <p className="text-[10px] text-muted-foreground">عندي بيانات الكتلة العضلية ونسبة الدهون</p>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => setInputMethod("visual")}
                        className={`w-full rounded-xl border-2 p-3 text-right transition-all ${
                          inputMethod === "visual" ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-purple-600" />
                          <div>
                            <p className="text-xs font-bold">شكل الجسم (Visual)</p>
                            <p className="text-[10px] text-muted-foreground">هختار شكل جسمي + نسبة الدهون التقريبية</p>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => setInputMethod("basic")}
                        className={`w-full rounded-xl border-2 p-3 text-right transition-all ${
                          inputMethod === "basic" ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Ruler className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-xs font-bold">أساسي (الوزن والطول فقط)</p>
                            <p className="text-[10px] text-muted-foreground">هنحسب تقديري بناءً على BMI</p>
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Smart Scale Inputs */}
                    {inputMethod === "smart_scale" && (
                      <div className="space-y-3 rounded-lg border p-3">
                        <p className="text-xs font-medium text-blue-800">أدخل قراءات الميزان الذكي:</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-muted-foreground mb-1 block">كتلة عضلية (كجم)</label>
                            <Input type="number" placeholder="55" value={muscleMass} onChange={(e) => setMuscleMass(e.target.value)} className="h-9" />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground mb-1 block">نسبة الدهون (%)</label>
                            <Input type="number" placeholder="18" value={bodyFatPercent} onChange={(e) => setBodyFatPercent(e.target.value)} className="h-9" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Visual Selection */}
                    {inputMethod === "visual" && (
                      <div className="space-y-4">
                        {/* Body Shape */}
                        <div>
                          <p className="text-xs font-medium mb-2">اختار شكل جسمك:</p>
                          <div className="grid grid-cols-3 gap-2">
                            {BODY_TYPES.map((bt) => (
                              <button
                                key={bt.id}
                                onClick={() => setBodyType(bt.id)}
                                className={`rounded-lg border-2 p-2 text-center transition-all ${
                                  bodyType === bt.id ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-gray-300"
                                }`}
                              >
                                <span className="text-2xl">{bt.icon}</span>
                                <p className="text-[10px] font-medium mt-1">{bt.name}</p>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Body Fat Reference */}
                        <div>
                          <p className="text-xs font-medium mb-2">اختار نسبة الدهون الأقرب ليك:</p>
                          <div className="space-y-1.5">
                            {bodyFatRefs.map((ref) => (
                              <button
                                key={ref.percent}
                                onClick={() => setSelectedFatRef(ref.percent.split("-")[0].replace("%", "").replace("+", ""))}
                                className={`w-full rounded-lg border-2 p-2 text-right transition-all flex items-center justify-between ${
                                  selectedFatRef === ref.percent.split("-")[0].replace("%", "").replace("+", "")
                                    ? "border-purple-500 bg-purple-50"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                              >
                                <div>
                                  <span className="text-xs font-bold">{ref.percent}</span>
                                  <span className="text-[10px] text-muted-foreground mr-2">— {ref.description}</span>
                                </div>
                                <div className={`h-3 w-3 rounded-full ${
                                  ref.level === "elite" ? "bg-green-500" :
                                  ref.level === "fit" ? "bg-blue-500" :
                                  ref.level === "average" ? "bg-yellow-500" :
                                  ref.level === "above" ? "bg-orange-500" :
                                  "bg-red-500"
                                }`} />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Basic - just show BMI preview */}
                    {inputMethod === "basic" && weight && height && (
                      <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
                        <p className="text-xs text-green-800">
                          BMI الخاص بك: <strong>{calculateBMI(Number(weight), Number(height)).value}</strong> — {calculateBMI(Number(weight), Number(height)).category}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Activity Level */}
                {coachStep === 3 && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="font-bold">مستوى نشاطك</h3>
                      <p className="text-xs text-muted-foreground">ده بيأثر على السعرات اللي جسمك بيحرقها</p>
                    </div>

                    <div className="space-y-2">
                      {ACTIVITY_LEVELS.map((level) => (
                        <button
                          key={level.id}
                          onClick={() => setActivityLevel(level.id)}
                          className={`w-full rounded-xl border-2 p-3 text-right transition-all ${
                            activityLevel === level.id ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <p className="text-xs font-bold">{level.name}</p>
                          <p className="text-[10px] text-muted-foreground">{level.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 4: Target Weight & Goal */}
                {coachStep === 4 && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="font-bold">هدفك</h3>
                      <p className="text-xs text-muted-foreground">عاوز توصل لوزن كام؟</p>
                    </div>

                    {/* Show ideal weight hint */}
                    {height && (
                      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-center text-xs text-blue-800">
                        <p>بناءً على طولك ({height} سم)، وزنك المثالي هو:</p>
                        <p className="text-lg font-bold mt-1">
                          {calculateIdealWeight(gender, Number(height)).min} - {calculateIdealWeight(gender, Number(height)).max} كجم
                        </p>
                        <p className="text-[10px] mt-1">(المثالي: {calculateIdealWeight(gender, Number(height)).ideal} كجم)</p>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-medium mb-1.5 block">الوزن المستهدف (كجم)</label>
                      <Input
                        type="number"
                        placeholder={`مثال: ${calculateIdealWeight(gender, Number(height) || 170).ideal}`}
                        value={targetWeight}
                        onChange={(e) => setTargetWeight(e.target.value)}
                      />
                      {targetWeight && weight && (
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          {Number(targetWeight) < Number(weight)
                            ? `📉 محتاج تنزل ${Number(weight) - Number(targetWeight)} كجم`
                            : Number(targetWeight) > Number(weight)
                            ? `📈 محتاج تزود ${Number(targetWeight) - Number(weight)} كجم`
                            : "⚖️ هتحافظ على وزنك الحالي"}
                        </p>
                      )}
                    </div>

                    {/* Goal Selection */}
                    <div>
                      <label className="text-xs font-medium mb-2 block">الهدف الأساسي:</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "lose" as const, name: "إنقاص وزن", icon: "📉", color: "border-red-500 bg-red-50" },
                          { id: "gain" as const, name: "زيادة وزن/عضلات", icon: "📈", color: "border-blue-500 bg-blue-50" },
                          { id: "recomp" as const, name: "إعادة تكوين", icon: "🔄", color: "border-purple-500 bg-purple-50" },
                          { id: "maintain" as const, name: "الحفاظ", icon: "⚖️", color: "border-green-500 bg-green-50" },
                        ].map((g) => (
                          <button
                            key={g.id}
                            onClick={() => setGoal(g.id)}
                            className={`rounded-lg border-2 p-2.5 text-center transition-all ${
                              goal === g.id ? g.color + " ring-2 ring-offset-1" : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <span className="text-xl">{g.icon}</span>
                            <p className="text-[10px] font-medium mt-1">{g.name}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCoachStep(Math.max(1, coachStep - 1))}
                    disabled={coachStep === 1}
                  >
                    <ArrowRight className="ml-1 h-4 w-4" />
                    رجوع
                  </Button>
                  <span className="text-xs text-muted-foreground">{coachStep} / {totalSteps}</span>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (coachStep < totalSteps) {
                        setCoachStep(coachStep + 1);
                      } else {
                        handleGenerate();
                      }
                    }}
                    disabled={!canProceed()}
                    className="bg-gradient-to-r from-pink-500 to-blue-600"
                  >
                    {coachStep === totalSteps ? (
                      <>
                        <Sparkles className="ml-1 h-4 w-4" />
                        احسب خطتي
                      </>
                    ) : (
                      <>
                        التالي
                        <ArrowLeft className="mr-1 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
