"use client";

import * as React from "react";
import Image from "next/image";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  AlertTriangle,
  Apple,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BedDouble,
  Bike,
  CheckCircle2,
  Dumbbell,
  FileText,
  FlaskConical,
  Footprints,
  Heart,
  Leaf,
  Loader2,
  Medal,
  Moon,
  Search,
  Shield,
  Sparkles,
  Swords,
  Target,
  ThumbsUp,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  Waves,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { PersonalCoachButton } from "@/components/medisport/personal-coach";
import { DailyCheckIn, StreakDisplay, JourneyTimeline, WeeklyChallenges, AchievementsDisplay, WeeklyPlan, SmartNotifications, BeforeAfterTracker, MoodEnergyChart } from "@/components/medisport/engagement";
import { FoodLoggerButton } from "@/components/medisport/food-logger";
import { MicroLessonsButton } from "@/components/medisport/micro-lessons";
import { BioAgeButton } from "@/components/medisport/bio-age";
import { SocialFeedButton } from "@/components/medisport/social";
import { GpsTrackerButton } from "@/components/medisport/gps-tracker";
import { BodyCompositionTracker } from "@/components/medisport/body-composition-tracker";
import { LabComparison } from "@/components/medisport/lab-comparison";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

type AthleteCategory = "professional" | "gym" | "amateur" | "healthy" | null;
type Sport = string;

interface AthleteProfile {
  category: AthleteCategory;
  sport: Sport;
  weight: string;
  height: string;
  age: string;
  trainingDays: string;
  goal: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORIES = [
  {
    id: "professional" as const,
    title: "رياضي محترف",
    titleEn: "Professional Athlete",
    description: "بلعب في فريق أو بشارك في بطولات رسمية",
    icon: Trophy,
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-50 border-amber-200 hover:border-amber-400",
    selectedBg: "bg-amber-100 border-amber-500 ring-2 ring-amber-300",
  },
  {
    id: "gym" as const,
    title: "جيم / كمال أجسام",
    titleEn: "Gym & Bodybuilding",
    description: "بتمرن بانتظام وعاوز أبني جسمي وعضلاتي",
    icon: Dumbbell,
    color: "from-blue-500 to-indigo-600",
    bgColor: "bg-blue-50 border-blue-200 hover:border-blue-400",
    selectedBg: "bg-blue-100 border-blue-500 ring-2 ring-blue-300",
  },
  {
    id: "amateur" as const,
    title: "رياضي هاوي",
    titleEn: "Amateur Athlete",
    description: "بمارس رياضة بانتظام لكن مش محترف",
    icon: Medal,
    color: "from-green-500 to-emerald-600",
    bgColor: "bg-green-50 border-green-200 hover:border-green-400",
    selectedBg: "bg-green-100 border-green-500 ring-2 ring-green-300",
  },
  {
    id: "healthy" as const,
    title: "أسلوب حياة صحي",
    titleEn: "Healthy Lifestyle",
    description: "عاوز أحافظ على صحتي وجسمي ولياقتي",
    icon: Leaf,
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-50 border-emerald-200 hover:border-emerald-400",
    selectedBg: "bg-emerald-100 border-emerald-500 ring-2 ring-emerald-300",
  },
];

const SPORTS = [
  { id: "football", name: "كرة قدم", icon: "⚽" },
  { id: "basketball", name: "كرة سلة", icon: "🏀" },
  { id: "swimming", name: "سباحة", icon: "🏊" },
  { id: "athletics", name: "ألعاب قوى", icon: "🏃" },
  { id: "tennis", name: "تنس", icon: "🎾" },
  { id: "martial_arts", name: "فنون قتالية", icon: "🥊" },
  { id: "gymnastics", name: "جمباز", icon: "🤸" },
  { id: "cycling", name: "دراجات", icon: "🚴" },
  { id: "volleyball", name: "كرة طائرة", icon: "🏐" },
  { id: "handball", name: "كرة يد", icon: "🤾" },
  { id: "endurance", name: "ماراثون / ترايثلون", icon: "🏅" },
  { id: "weightlifting", name: "رفع أثقال", icon: "🏋️" },
  { id: "padel", name: "بادل", icon: "🏓" },
  { id: "other", name: "رياضة أخرى", icon: "🎯" },
];

const GYM_GOALS = [
  { id: "muscle_gain", name: "بناء عضلات", icon: "💪" },
  { id: "fat_loss", name: "حرق دهون", icon: "🔥" },
  { id: "strength", name: "زيادة قوة", icon: "🏋️" },
  { id: "recomp", name: "إعادة تكوين الجسم", icon: "⚡" },
  { id: "general_fitness", name: "لياقة عامة", icon: "🎯" },
];

const HEALTHY_GOALS = [
  { id: "weight_loss", name: "إنقاص وزن", icon: "⬇️" },
  { id: "maintain", name: "الحفاظ على وزني", icon: "⚖️" },
  { id: "energy", name: "زيادة طاقتي", icon: "⚡" },
  { id: "sleep_better", name: "نوم أفضل", icon: "😴" },
  { id: "overall_health", name: "صحة عامة أفضل", icon: "🌱" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Onboarding Component
// ═══════════════════════════════════════════════════════════════════════════════

function OnboardingScreen({ onComplete }: { onComplete: (profile: AthleteProfile) => void }) {
  const [step, setStep] = React.useState(1);
  const [category, setCategory] = React.useState<AthleteCategory>(null);
  const [sport, setSport] = React.useState("");
  const [weight, setWeight] = React.useState("");
  const [height, setHeight] = React.useState("");
  const [age, setAge] = React.useState("");
  const [trainingDays, setTrainingDays] = React.useState("");
  const [goal, setGoal] = React.useState("");

  const totalSteps = category === "professional" || category === "amateur" ? 3 : category === "gym" ? 3 : 3;

  const canProceed = () => {
    if (step === 1) return category !== null;
    if (step === 2) {
      if (category === "professional" || category === "amateur") return sport !== "";
      if (category === "gym") return goal !== "";
      if (category === "healthy") return goal !== "";
    }
    if (step === 3) return weight !== "" && height !== "" && age !== "";
    return false;
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onComplete({ category, sport, weight, height, age, trainingDays, goal });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <div className="w-full max-w-2xl">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <Image
            src="/brand/medisport-logo.png"
            alt="MediSport"
            width={220}
            height={50}
            className="mx-auto h-12 w-auto mb-4"
            priority
          />
          <p className="text-muted-foreground">نظام الطب الرياضي الذكي — مخصص ليك</p>
        </div>

        {/* Personal Coach - Always visible */}
        <div className="mb-6">
          <PersonalCoachButton />
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i + 1 <= step ? "w-12 bg-blue-600" : "w-8 bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Choose Category */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center mb-2">ايه هدفك الرياضي؟</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">اختار اللي يوصفك أكتر عشان نخصصلك التجربة</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setCategory(cat.id); setSport(""); setGoal(""); }}
                  className={`relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-right transition-all duration-200 ${
                    category === cat.id ? cat.selectedBg : cat.bgColor
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${cat.color} text-white`}>
                    <cat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{cat.title}</p>
                    <p className="text-xs text-muted-foreground">{cat.description}</p>
                  </div>
                  {category === cat.id && (
                    <CheckCircle2 className="absolute top-3 left-3 h-5 w-5 text-green-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Choose Sport / Goal */}
        {step === 2 && (category === "professional" || category === "amateur") && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center mb-2">ايه رياضتك؟</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">اختار الرياضة اللي بتمارسها</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SPORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSport(s.id)}
                  className={`flex items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                    sport === s.id
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-sm font-medium">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && category === "gym" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center mb-2">ايه هدفك في الجيم؟</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">اختار الهدف الأساسي</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GYM_GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={`flex items-center gap-3 rounded-lg border-2 p-4 transition-all ${
                    goal === g.id
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl">{g.icon}</span>
                  <span className="font-medium">{g.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && category === "healthy" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center mb-2">ايه هدفك الصحي؟</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">اختار اللي عاوز تحققه</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {HEALTHY_GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={`flex items-center gap-3 rounded-lg border-2 p-4 transition-all ${
                    goal === g.id
                      ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl">{g.icon}</span>
                  <span className="font-medium">{g.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Basic Info */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center mb-2">معلومات أساسية</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">عشان نحسبلك المؤشرات بدقة</p>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div>
                <label className="text-sm font-medium mb-1.5 block">الوزن (كجم)</label>
                <Input
                  type="number"
                  placeholder="75"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">الطول (سم)</label>
                <Input
                  type="number"
                  placeholder="175"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">العمر</label>
                <Input
                  type="number"
                  placeholder="25"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">أيام التمرين/أسبوع</label>
                <Select value={trainingDays} onValueChange={setTrainingDays}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1-2 يوم</SelectItem>
                    <SelectItem value="3">3-4 أيام</SelectItem>
                    <SelectItem value="5">5-6 أيام</SelectItem>
                    <SelectItem value="7">يومياً</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            رجوع
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {step === totalSteps ? "ابدأ" : "التالي"}
            {step === totalSteps ? <Sparkles className="mr-2 h-4 w-4" /> : <ArrowLeft className="mr-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Professional Athlete Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

function ProfessionalDashboard({ profile }: { profile: AthleteProfile }) {
  const [activeTab, setActiveTab] = React.useState("dashboard");
  const [wadaMedication, setWadaMedication] = React.useState("");
  const [wadaResult, setWadaResult] = React.useState<any>(null);
  const [wadaLoading, setWadaLoading] = React.useState(false);
  const [trainingRPE, setTrainingRPE] = React.useState("");
  const [trainingDuration, setTrainingDuration] = React.useState("");
  const [trainingType, setTrainingType] = React.useState("training");
  const [trainingLogged, setTrainingLogged] = React.useState(false);
  const [sleepHours, setSleepHours] = React.useState("");
  const [sleepQuality, setSleepQuality] = React.useState("");
  const [sleepLogged, setSleepLogged] = React.useState(false);
  const [wellnessSubmitted, setWellnessSubmitted] = React.useState(false);
  const [wellness, setWellness] = React.useState({ mood: 3, muscleSoreness: 3, energy: 3, stress: 3, sleep: 3 });

  const readinessScore = 82;
  const injuryRisk = 28;
  const sleepScore = 76;
  const acwr = 1.15;

  const labTrends = [
    { marker: "CK (Creatine Kinase)", current: 320, previous: 280, unit: "U/L", range: "38-174", status: "high", trend: "up" },
    { marker: "Ferritin", current: 45, previous: 52, unit: "ng/mL", range: "30-400", status: "normal", trend: "down" },
    { marker: "Testosterone", current: 580, previous: 620, unit: "ng/dL", range: "300-1000", status: "normal", trend: "down" },
    { marker: "Vitamin D", current: 28, previous: 22, unit: "ng/mL", range: "30-100", status: "low", trend: "up" },
    { marker: "Hemoglobin", current: 15.2, previous: 14.8, unit: "g/dL", range: "13.5-17.5", status: "normal", trend: "up" },
    { marker: "hs-CRP", current: 1.8, previous: 0.9, unit: "mg/L", range: "<3", status: "watch", trend: "up" },
  ];

  const bodyComp = { weight: 78.5, leanMass: 65.2, bodyFat: 13.3, prevWeight: 79.1, prevLeanMass: 64.8, prevBodyFat: 14.3 };

  const alerts = [
    { type: "warning", message: "CK مرتفع — تأكد من التعافي الكافي قبل التمرين القادم", icon: AlertTriangle },
    { type: "info", message: "فيتامين D أقل من المعدل الطبيعي — راجع دكتورك", icon: FlaskConical },
    { type: "success", message: "نسبة الدهون انخفضت 1% عن الشهر الماضي — ممتاز!", icon: ThumbsUp },
    { type: "warning", message: "ACWR = 1.15 — في المنطقة الحدية، خفف الحمل قليلاً", icon: Activity },
  ];

  const handleWadaCheck = async () => {
    if (!wadaMedication.trim()) return;
    setWadaLoading(true);
    setWadaResult(null);
    try {
      const res = await fetch("/api/medisport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check-wada", data: { medication: wadaMedication, ingredients: [wadaMedication.toLowerCase()] } }),
      });
      const data = await res.json();
      setWadaResult(data.results);
    } catch { toast.error("حدث خطأ أثناء الفحص"); }
    finally { setWadaLoading(false); }
  };

  const sportName = SPORTS.find(s => s.id === profile.sport)?.name || profile.sport;

  return (
    <div className="space-y-4">
      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="text-center">
          <CardContent className="pt-5 pb-4">
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-green-400 bg-green-50">
              <span className="text-xl font-bold text-green-700">{readinessScore}</span>
            </div>
            <p className="mt-2 text-xs font-medium">جاهزية التمرين</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-5 pb-4">
            <div className={`relative mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 ${injuryRisk < 30 ? "border-green-400 bg-green-50" : "border-yellow-400 bg-yellow-50"}`}>
              <span className={`text-xl font-bold ${injuryRisk < 30 ? "text-green-700" : "text-yellow-700"}`}>{injuryRisk}%</span>
            </div>
            <p className="mt-2 text-xs font-medium">خطر الإصابة</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-5 pb-4">
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-blue-400 bg-blue-50">
              <Moon className="h-6 w-6 text-blue-600" />
            </div>
            <p className="mt-2 text-xs font-medium">نوم: {sleepScore}/100</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-5 pb-4">
            <div className={`relative mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 ${acwr <= 1.3 ? "border-green-400 bg-green-50" : "border-yellow-400 bg-yellow-50"}`}>
              <span className="text-lg font-bold">{acwr}</span>
            </div>
            <p className="mt-2 text-xs font-medium">ACWR</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendation */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="flex items-start gap-3 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 text-blue-600 shrink-0" />
          <div>
            <p className="font-medium text-blue-900 text-sm">توصية AI — {sportName}</p>
            <p className="mt-1 text-xs text-blue-800">
              جاهزيتك اليوم ممتازة (82/100). يمكنك التدريب بشكل طبيعي مع الانتباه لأن الـ CK مرتفع قليلاً — 
              ركز على الإحماء الجيد وشرب السوائل. تجنب التمارين عالية الشدة لأكثر من 75 دقيقة.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="text-[11px] sm:text-xs">حالتي</TabsTrigger>
          <TabsTrigger value="labs" className="text-[11px] sm:text-xs">تحاليلي</TabsTrigger>
          <TabsTrigger value="wada" className="text-[11px] sm:text-xs">WADA</TabsTrigger>
          <TabsTrigger value="training" className="text-[11px] sm:text-xs">تدريب</TabsTrigger>
          <TabsTrigger value="reports" className="text-[11px] sm:text-xs">تقاريري</TabsTrigger>
        </TabsList>

        {/* Alerts Tab */}
        <TabsContent value="dashboard" className="mt-3 space-y-3">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-start gap-2 rounded-lg p-3 text-sm ${alert.type === "warning" ? "bg-amber-50" : alert.type === "success" ? "bg-green-50" : "bg-blue-50"}`}>
              <alert.icon className={`mt-0.5 h-4 w-4 shrink-0 ${alert.type === "warning" ? "text-amber-600" : alert.type === "success" ? "text-green-600" : "text-blue-600"}`} />
              <span>{alert.message}</span>
            </div>
          ))}
          {/* Wellness */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">تقييم ذاتي سريع</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: "mood", label: "المزاج", emoji: ["😫","😟","😐","🙂","😄"] },
                { key: "muscleSoreness", label: "ألم العضلات", emoji: ["🔥🔥","🔥","😐","💪","💪💪"] },
                { key: "energy", label: "الطاقة", emoji: ["🪫","🔋","🔋🔋","⚡","⚡⚡"] },
                { key: "stress", label: "الضغط", emoji: ["😰😰","😰","😐","😌","🧘"] },
                { key: "sleep", label: "النوم", emoji: ["😵","😪","😐","😴","💤💤"] },
              ].map(({ key, label, emoji }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs">{label}</span>
                    <span className="text-sm">{emoji[(wellness as any)[key] - 1]}</span>
                  </div>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(val => (
                      <button key={val} onClick={() => setWellness(w => ({...w, [key]: val}))}
                        className={`flex-1 h-7 rounded text-xs font-medium ${(wellness as any)[key] === val ? "bg-blue-600 text-white" : "bg-muted hover:bg-muted/80"}`}>
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <Button onClick={() => { setWellnessSubmitted(true); toast.success("تم!"); }} className="w-full" size="sm" disabled={wellnessSubmitted}>
                {wellnessSubmitted ? "تم الإرسال ✓" : "إرسال التقييم"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Labs Tab */}
        <TabsContent value="labs" className="mt-3 space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Dumbbell className="h-4 w-4" /> البنية الجسدية</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center rounded-lg border p-2">
                  <p className="text-lg font-bold">{bodyComp.weight}</p>
                  <p className="text-[10px] text-muted-foreground">الوزن (كجم)</p>
                  <p className="text-[10px] text-green-600">-{(bodyComp.prevWeight - bodyComp.weight).toFixed(1)}</p>
                </div>
                <div className="text-center rounded-lg border p-2">
                  <p className="text-lg font-bold text-blue-600">{bodyComp.leanMass}</p>
                  <p className="text-[10px] text-muted-foreground">عضلات (كجم)</p>
                  <p className="text-[10px] text-green-600">+{(bodyComp.leanMass - bodyComp.prevLeanMass).toFixed(1)}</p>
                </div>
                <div className="text-center rounded-lg border p-2">
                  <p className="text-lg font-bold text-orange-600">{bodyComp.bodyFat}%</p>
                  <p className="text-[10px] text-muted-foreground">دهون</p>
                  <p className="text-[10px] text-green-600">-{(bodyComp.prevBodyFat - bodyComp.bodyFat).toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FlaskConical className="h-4 w-4" /> التحاليل</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {labTrends.map((lab, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-2.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium">{lab.marker}</span>
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 ${lab.status === "high" ? "border-red-300 text-red-600" : lab.status === "low" ? "border-amber-300 text-amber-600" : lab.status === "watch" ? "border-yellow-300 text-yellow-600" : "border-green-300 text-green-600"}`}>
                        {lab.status === "high" ? "مرتفع" : lab.status === "low" ? "منخفض" : lab.status === "watch" ? "مراقبة" : "طبيعي"}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">المعدل: {lab.range}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">{lab.current}</span>
                    {lab.trend === "up" ? <TrendingUp className={`h-3.5 w-3.5 ${lab.status === "high" || lab.status === "watch" ? "text-red-500" : "text-green-500"}`} /> : <TrendingDown className={`h-3.5 w-3.5 ${lab.status === "low" ? "text-amber-500" : "text-green-500"}`} />}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* WADA Tab */}
        <TabsContent value="wada" className="mt-3 space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-purple-600" /> فحص WADA</CardTitle>
              <CardDescription className="text-xs">تأكد إن الدواء أو المكمل مش ممنوع</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="اسم الدواء أو المكمل..." value={wadaMedication} onChange={(e) => setWadaMedication(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleWadaCheck()} className="flex-1" />
                <Button onClick={handleWadaCheck} disabled={wadaLoading} size="sm" className="bg-purple-600 hover:bg-purple-700">
                  {wadaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {wadaResult && (
                <div className={`rounded-lg p-3 ${wadaResult.status === "prohibited" ? "bg-red-50 border border-red-200" : wadaResult.status === "permitted" ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
                  <div className="flex items-center gap-2">
                    <Badge className={wadaResult.status === "prohibited" ? "bg-red-600" : wadaResult.status === "permitted" ? "bg-green-600" : "bg-yellow-600"}>
                      {wadaResult.status === "prohibited" ? "ممنوع ❌" : wadaResult.status === "permitted" ? "مسموح ✅" : "يحتاج تحقق ⚠️"}
                    </Badge>
                    <span className="font-medium text-xs">{wadaResult.medication}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{wadaResult.details}</p>
                </div>
              )}
              <div className="rounded-lg bg-purple-50 p-3">
                <p className="text-xs font-medium text-purple-800 mb-1">أمثلة للتجربة:</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Paracetamol", "Prednisolone", "Salbutamol", "Caffeine", "Creatine", "Testosterone"].map(med => (
                    <button key={med} onClick={() => { setWadaMedication(med); }} className="text-[10px] px-2 py-1 rounded bg-white border hover:bg-purple-100 transition-colors">{med}</button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training" className="mt-3 space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-red-600" /> سجل تمرينك</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">الشدة (RPE)</label>
                  <Select value={trainingRPE} onValueChange={setTrainingRPE}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="1-10" /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">المدة (دقيقة)</label>
                  <Input type="number" placeholder="90" value={trainingDuration} onChange={(e) => setTrainingDuration(e.target.value)} className="h-9" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">النوع</label>
                  <Select value={trainingType} onValueChange={setTrainingType}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="training">تدريب</SelectItem>
                      <SelectItem value="match">مباراة</SelectItem>
                      <SelectItem value="gym">جيم</SelectItem>
                      <SelectItem value="recovery">تعافي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {trainingRPE && trainingDuration && (
                <p className="text-xs text-center text-muted-foreground">Training Load = {Number(trainingRPE) * Number(trainingDuration)}</p>
              )}
              <Button onClick={() => { setTrainingLogged(true); toast.success("تم تسجيل التمرين!"); }} className="w-full bg-red-600 hover:bg-red-700" size="sm" disabled={trainingLogged || !trainingRPE || !trainingDuration}>
                {trainingLogged ? "تم ✓" : "سجل التمرين"}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Moon className="h-4 w-4 text-indigo-600" /> سجل نومك</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">الساعات</label>
                  <Input type="number" placeholder="8" step="0.5" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} className="h-9" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">الجودة</label>
                  <Select value={sleepQuality} onValueChange={setSleepQuality}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">ممتاز</SelectItem>
                      <SelectItem value="good">جيد</SelectItem>
                      <SelectItem value="fair">متوسط</SelectItem>
                      <SelectItem value="poor">سيء</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => { setSleepLogged(true); toast.success("تم!"); }} className="w-full bg-indigo-600 hover:bg-indigo-700" size="sm" disabled={sleepLogged || !sleepHours}>
                {sleepLogged ? "تم ✓" : "سجل النوم"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-3 space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> ملخص الشهر</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-lg bg-blue-50 p-2 text-center"><p className="text-lg font-bold text-blue-700">18</p><p className="text-[10px]">تمرين</p></div>
                <div className="rounded-lg bg-green-50 p-2 text-center"><p className="text-lg font-bold text-green-700">7.2h</p><p className="text-[10px]">نوم</p></div>
                <div className="rounded-lg bg-purple-50 p-2 text-center"><p className="text-lg font-bold text-purple-700">85%</p><p className="text-[10px]">جاهزية</p></div>
                <div className="rounded-lg bg-orange-50 p-2 text-center"><p className="text-lg font-bold text-orange-700">0</p><p className="text-[10px]">إصابات</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-600" /> تقرير ذكي</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-3 space-y-2 text-xs text-blue-800">
                <p className="font-medium">ملخص: أداؤك هذا الشهر ممتاز — حمل تدريبي متوازن مع تحسن في البنية الجسدية.</p>
                <p><span className="font-medium">إنجازات:</span> نسبة الدهون ↓1% | كتلة عضلية ↑0.4kg | 0 إصابات</p>
                <p><span className="font-medium">انتبه:</span> Vitamin D منخفض | CK مرتفع | متوسط النوم 7.2h (حاول 8+)</p>
                <p><span className="font-medium">توصيات:</span> زود النوم | أضف يوم تعافي نشط | أعد تحليل Vit D بعد أسبوعين</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Enhanced Sport Mode — Body Composition & Lab Comparison */}
      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-bold">وضع الرياضي المتقدم</h3>
          <Badge className="bg-blue-600 text-[9px]">Sport Mode</Badge>
        </div>
        <BodyCompositionTracker category="professional" sex="male" />
        <LabComparison sport={profile.sport} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Gym / Bodybuilding Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

function GymDashboard({ profile }: { profile: AthleteProfile }) {
  const [supplementName, setSupplementName] = React.useState("");
  const [supplementResult, setSupplementResult] = React.useState<any>(null);
  const [supplementLoading, setSupplementLoading] = React.useState(false);

  const bodyComp = { weight: Number(profile.weight) || 78, leanMass: 62.4, bodyFat: 18.2, prevWeight: 79.5, prevLeanMass: 61.8, prevBodyFat: 19.1 };
  const goalName = GYM_GOALS.find(g => g.id === profile.goal)?.name || "لياقة عامة";

  const handleSupplementCheck = async () => {
    if (!supplementName.trim()) return;
    setSupplementLoading(true);
    try {
      const res = await fetch("/api/medisport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check-wada", data: { medication: supplementName, ingredients: [supplementName.toLowerCase()] } }),
      });
      const data = await res.json();
      setSupplementResult(data.results);
    } catch { toast.error("حدث خطأ"); }
    finally { setSupplementLoading(false); }
  };

  return (
    <div className="space-y-4">
      {/* Goal Banner */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white">
            <Dumbbell className="h-6 w-6" />
          </div>
          <div>
            <p className="font-bold text-blue-900">هدفك: {goalName}</p>
            <p className="text-xs text-blue-700">متابعة يومية لتقدمك نحو الهدف</p>
          </div>
        </CardContent>
      </Card>

      {/* Body Composition - Main Focus */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Dumbbell className="h-5 w-5 text-blue-600" /> البنية الجسدية</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center rounded-xl border-2 border-blue-200 bg-blue-50 p-3">
              <p className="text-2xl font-bold text-blue-700">{bodyComp.weight}</p>
              <p className="text-xs text-muted-foreground">الوزن (كجم)</p>
              <p className="text-xs text-green-600 mt-1">↓ {(bodyComp.prevWeight - bodyComp.weight).toFixed(1)}</p>
            </div>
            <div className="text-center rounded-xl border-2 border-indigo-200 bg-indigo-50 p-3">
              <p className="text-2xl font-bold text-indigo-700">{bodyComp.leanMass}</p>
              <p className="text-xs text-muted-foreground">عضلات (كجم)</p>
              <p className="text-xs text-green-600 mt-1">↑ {(bodyComp.leanMass - bodyComp.prevLeanMass).toFixed(1)}</p>
            </div>
            <div className="text-center rounded-xl border-2 border-orange-200 bg-orange-50 p-3">
              <p className="text-2xl font-bold text-orange-700">{bodyComp.bodyFat}%</p>
              <p className="text-xs text-muted-foreground">دهون</p>
              <p className="text-xs text-green-600 mt-1">↓ {(bodyComp.prevBodyFat - bodyComp.bodyFat).toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nutrition Macros */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Apple className="h-4 w-4 text-green-600" /> التغذية اليومية المقترحة</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-lg bg-red-50 p-2 text-center"><p className="text-lg font-bold text-red-700">2,650</p><p className="text-[10px]">سعرات</p></div>
            <div className="rounded-lg bg-blue-50 p-2 text-center"><p className="text-lg font-bold text-blue-700">165g</p><p className="text-[10px]">بروتين</p></div>
            <div className="rounded-lg bg-amber-50 p-2 text-center"><p className="text-lg font-bold text-amber-700">280g</p><p className="text-[10px]">كربوهيدرات</p></div>
            <div className="rounded-lg bg-green-50 p-2 text-center"><p className="text-lg font-bold text-green-700">75g</p><p className="text-[10px]">دهون</p></div>
          </div>
          <div className="mt-3 rounded-lg border p-2 text-xs space-y-1">
            <p><span className="font-medium">قبل التمرين:</span> 40g كربوهيدرات + 20g بروتين</p>
            <p><span className="font-medium">بعد التمرين:</span> 40g بروتين + 50g كربوهيدرات سريعة</p>
            <p><span className="font-medium">قبل النوم:</span> 30g كازين بروتين</p>
          </div>
        </CardContent>
      </Card>

      {/* Supplement Safety Check */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-purple-600" /> فحص سلامة المكملات</CardTitle>
          <CardDescription className="text-xs">تأكد إن المكمل آمن ومش فيه مواد ممنوعة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="اسم المكمل..." value={supplementName} onChange={(e) => setSupplementName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSupplementCheck()} />
            <Button onClick={handleSupplementCheck} disabled={supplementLoading} size="sm" className="bg-purple-600 hover:bg-purple-700">
              {supplementLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "فحص"}
            </Button>
          </div>
          {supplementResult && (
            <div className={`rounded-lg p-3 text-sm ${supplementResult.status === "prohibited" ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
              <Badge className={supplementResult.status === "prohibited" ? "bg-red-600" : "bg-green-600"}>
                {supplementResult.status === "prohibited" ? "خطر ❌" : "آمن ✅"}
              </Badge>
              <p className="mt-1 text-xs">{supplementResult.details}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 1RM Estimator */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-red-600" /> مقاييس القوة</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border p-2"><p className="text-lg font-bold">120</p><p className="text-[10px] text-muted-foreground">Bench (كجم)</p></div>
            <div className="rounded-lg border p-2"><p className="text-lg font-bold">160</p><p className="text-[10px] text-muted-foreground">Squat (كجم)</p></div>
            <div className="rounded-lg border p-2"><p className="text-lg font-bold">180</p><p className="text-[10px] text-muted-foreground">Deadlift (كجم)</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Sport Mode — Body Composition & Lab Comparison */}
      <div className="mt-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Dumbbell className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-bold">تتبع متقدم</h3>
          <Badge className="bg-blue-600 text-[9px]">Sport Mode</Badge>
        </div>
        <BodyCompositionTracker category="gym" sex="male" />
        <LabComparison sport="bodybuilding" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Amateur Athlete Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

function AmateurDashboard({ profile }: { profile: AthleteProfile }) {
  const [trainingRPE, setTrainingRPE] = React.useState("");
  const [trainingDuration, setTrainingDuration] = React.useState("");
  const [logged, setLogged] = React.useState(false);
  const sportName = SPORTS.find(s => s.id === profile.sport)?.name || profile.sport;

  return (
    <div className="space-y-4">
      {/* Sport Banner */}
      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-white">
            <Medal className="h-6 w-6" />
          </div>
          <div>
            <p className="font-bold text-green-900">{sportName}</p>
            <p className="text-xs text-green-700">تابع تقدمك وحافظ على صحتك</p>
          </div>
        </CardContent>
      </Card>

      {/* Performance Score */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <CardContent className="pt-4 pb-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-4 border-green-400 bg-green-50">
              <span className="text-lg font-bold text-green-700">78</span>
            </div>
            <p className="mt-1.5 text-[10px] font-medium">لياقة عامة</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4 pb-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-4 border-blue-400 bg-blue-50">
              <span className="text-lg font-bold text-blue-700">12</span>
            </div>
            <p className="mt-1.5 text-[10px] font-medium">تمرين/شهر</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4 pb-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-4 border-purple-400 bg-purple-50">
              <span className="text-lg font-bold text-purple-700">↑15%</span>
            </div>
            <p className="mt-1.5 text-[10px] font-medium">تحسن</p>
          </CardContent>
        </Card>
      </div>

      {/* Log Training */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-green-600" /> سجل تمرينك</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">الشدة (1-10)</label>
              <Select value={trainingRPE} onValueChange={setTrainingRPE}>
                <SelectTrigger className="h-9"><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>{[1,2,3,4,5,6,7,8,9,10].map(n => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">المدة (دقيقة)</label>
              <Input type="number" placeholder="60" value={trainingDuration} onChange={(e) => setTrainingDuration(e.target.value)} className="h-9" />
            </div>
          </div>
          <Button onClick={() => { setLogged(true); toast.success("تم!"); }} className="w-full bg-green-600 hover:bg-green-700" size="sm" disabled={logged || !trainingRPE}>
            {logged ? "تم التسجيل ✓" : "سجل"}
          </Button>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-600" /> نصائح طبية</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="rounded-lg bg-blue-50 p-2.5">💡 حاول تزود مدة التمرين تدريجياً — 10% كل أسبوع</div>
          <div className="rounded-lg bg-green-50 p-2.5">🥗 اشرب مياه كافية قبل وأثناء وبعد التمرين</div>
          <div className="rounded-lg bg-purple-50 p-2.5">😴 النوم 7-9 ساعات ضروري للتعافي والأداء</div>
        </CardContent>
      </Card>

      {/* Injury Prevention */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-amber-600" /> الوقاية من الإصابات</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-2">
          <div className="flex items-center gap-2 p-2 rounded-lg border"><CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" /><span>إحماء 10 دقائق قبل كل تمرين</span></div>
          <div className="flex items-center gap-2 p-2 rounded-lg border"><CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" /><span>تمارين إطالة بعد التمرين</span></div>
          <div className="flex items-center gap-2 p-2 rounded-lg border"><CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" /><span>راحة يوم على الأقل بين التمارين المكثفة</span></div>
        </CardContent>
      </Card>

      {/* Body Composition Tracking for Amateurs */}
      <BodyCompositionTracker category="amateur" sex="male" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Healthy Lifestyle Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

function HealthyDashboard({ profile }: { profile: AthleteProfile }) {
  const [waterCups, setWaterCups] = React.useState(0);
  const [steps, setSteps] = React.useState("");
  const [stepsLogged, setStepsLogged] = React.useState(false);
  const goalName = HEALTHY_GOALS.find(g => g.id === profile.goal)?.name || "صحة عامة";

  return (
    <div className="space-y-4">
      {/* Goal Banner */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
            <Leaf className="h-6 w-6" />
          </div>
          <div>
            <p className="font-bold text-emerald-900">هدفك: {goalName}</p>
            <p className="text-xs text-emerald-700">خطوة بخطوة نحو حياة أصح</p>
          </div>
        </CardContent>
      </Card>

      {/* Health Score */}
      <Card className="text-center">
        <CardContent className="pt-6 pb-4">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-emerald-400 bg-emerald-50">
            <div>
              <span className="text-3xl font-bold text-emerald-700">72</span>
              <p className="text-[10px] text-emerald-600">/100</p>
            </div>
          </div>
          <p className="mt-3 font-medium">مؤشر الصحة العامة</p>
          <p className="text-xs text-muted-foreground">جيد — في تحسن مستمر!</p>
        </CardContent>
      </Card>

      {/* Daily Habits */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Heart className="h-4 w-4 text-pink-600" /> عاداتي اليومية</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Water */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium">💧 المياه ({waterCups}/8 أكواب)</span>
              <span className="text-xs text-muted-foreground">{Math.round((waterCups/8)*100)}%</span>
            </div>
            <div className="flex gap-1">
              {Array.from({length: 8}).map((_, i) => (
                <button key={i} onClick={() => setWaterCups(i + 1)}
                  className={`flex-1 h-6 rounded transition-all ${i < waterCups ? "bg-blue-500" : "bg-gray-200"}`} />
              ))}
            </div>
          </div>

          {/* Steps */}
          <div>
            <label className="text-xs font-medium mb-1.5 block">🚶 خطوات اليوم</label>
            <div className="flex gap-2">
              <Input type="number" placeholder="مثال: 7500" value={steps} onChange={(e) => setSteps(e.target.value)} className="h-9" />
              <Button size="sm" onClick={() => { setStepsLogged(true); toast.success("تم!"); }} disabled={stepsLogged || !steps} className="bg-emerald-600 hover:bg-emerald-700">
                {stepsLogged ? "✓" : "سجل"}
              </Button>
            </div>
            {steps && <p className="text-[10px] text-muted-foreground mt-1">الهدف: 10,000 خطوة — {Number(steps) >= 10000 ? "ممتاز! 🎉" : `باقي ${(10000 - Number(steps)).toLocaleString()} خطوة`}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Weight Tracking */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-blue-600" /> تتبع الوزن</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border p-2"><p className="text-xs text-muted-foreground">البداية</p><p className="text-lg font-bold">{Number(profile.weight) || 80}</p></div>
            <div className="rounded-lg border p-2"><p className="text-xs text-muted-foreground">الحالي</p><p className="text-lg font-bold text-blue-600">{(Number(profile.weight) || 80) - 1.5}</p></div>
            <div className="rounded-lg border p-2"><p className="text-xs text-muted-foreground">الهدف</p><p className="text-lg font-bold text-green-600">{(Number(profile.weight) || 80) - 5}</p></div>
          </div>
        </CardContent>
      </Card>

      {/* AI Coach */}
      <Card className="border-emerald-200">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-emerald-600" /> مدربك الذكي</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="rounded-lg bg-emerald-50 p-3">
            <p className="font-medium text-emerald-800 mb-1">نصيحة اليوم:</p>
            <p className="text-emerald-700">حاول تمشي 30 دقيقة بعد الغداء — ده بيحسن الهضم وبيحرق 150 سعرة إضافية. كمان بيحسن المزاج والتركيز!</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="font-medium text-blue-800 mb-1">تحدي الأسبوع:</p>
            <p className="text-blue-700">اشرب 8 أكواب مياه يومياً لمدة 7 أيام متواصلة 💧</p>
          </div>
        </CardContent>
      </Card>

      {/* Simple Nutrition */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Apple className="h-4 w-4 text-green-600" /> نصائح تغذية</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-2">
          <div className="flex items-start gap-2 p-2 rounded-lg bg-green-50"><span>🥗</span><span>كل خضار في كل وجبة — حتى لو حاجة بسيطة</span></div>
          <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-50"><span>🥤</span><span>قلل المشروبات الغازية والعصائر المعلبة</span></div>
          <div className="flex items-start gap-2 p-2 rounded-lg bg-purple-50"><span>🍗</span><span>بروتين في كل وجبة (بيض، فراخ، سمك، بقوليات)</span></div>
          <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50"><span>⏰</span><span>حاول تاكل آخر وجبة قبل النوم بـ 3 ساعات</span></div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function MediSportPage() {
  const t = useTranslations("MediSport");
  const [profile, setProfile] = React.useState<AthleteProfile | null>(null);
  const [onboarded, setOnboarded] = React.useState(false);

  // Check localStorage for saved profile
  React.useEffect(() => {
    const saved = localStorage.getItem("medisport-profile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfile(parsed);
        setOnboarded(true);
      } catch {}
    }
  }, []);

  const handleOnboardingComplete = (p: AthleteProfile) => {
    setProfile(p);
    setOnboarded(true);
    localStorage.setItem("medisport-profile", JSON.stringify(p));
    toast.success(t("welcomeMessage"));
  };

  const handleReset = () => {
    localStorage.removeItem("medisport-profile");
    setProfile(null);
    setOnboarded(false);
  };

  // Show onboarding if not completed
  if (!onboarded || !profile) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  // Show adaptive dashboard based on category
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/brand/medisport-logo.png" alt="MediSport" width={150} height={35} className="h-8 w-auto" priority />
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs text-muted-foreground">
          {t("changeProfile")}
        </Button>
      </div>

      {/* Daily Check-in + Streak */}
      <DailyCheckIn />
      <StreakDisplay />

      {/* Smart Notifications */}
      <SmartNotifications />

      {/* Personal Coach */}
      <PersonalCoachButton />

      {/* New Feature Cards */}
      <div className="grid gap-3 md:grid-cols-2">
        <FoodLoggerButton />
        <GpsTrackerButton />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <MicroLessonsButton />
        <BioAgeButton />
      </div>
      <SocialFeedButton />

      {/* Weekly Challenges + Achievements */}
      <div className="grid gap-4 md:grid-cols-2">
        <WeeklyChallenges />
        <AchievementsDisplay />
      </div>

      {/* Before/After + Mood Chart */}
      <div className="grid gap-4 md:grid-cols-2">
        <BeforeAfterTracker />
        <MoodEnergyChart />
      </div>

      {/* Weekly Plan + Journey */}
      <div className="grid gap-4 md:grid-cols-2">
        <WeeklyPlan />
        <JourneyTimeline />
      </div>

      {/* Render dashboard based on category */}
      {profile.category === "professional" && <ProfessionalDashboard profile={profile} />}
      {profile.category === "gym" && <GymDashboard profile={profile} />}
      {profile.category === "amateur" && <AmateurDashboard profile={profile} />}
      {profile.category === "healthy" && <HealthyDashboard profile={profile} />}
    </div>
  );
}
