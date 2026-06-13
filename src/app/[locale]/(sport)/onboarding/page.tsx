"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  Camera,
  Check,
  Dumbbell,
  GraduationCap,
  Heart,
  Loader2,
  MapPin,
  Ruler,
  Scale,
  Sparkles,
  Target,
  Trophy,
  Upload,
  User,
  Users,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  COACH_SPECIALTIES,
  DEGREE_LEVELS,
  RELEVANT_STUDY_FIELDS,
} from "@/lib/sport/coach-scoring";

type TraineeStep = "goal" | "body" | "avatar" | "complete";
type CoachStep = "specialties" | "education" | "experience" | "avatar" | "complete";

interface TraineeData {
  goal?: string;
  sex?: string;
  birthDate?: string;
  heightCm?: number;
  weightKg?: number;
  activityLevel?: string;
  displayName?: string;
  avatarUrl?: string;
}

interface CoachData {
  displayName?: string;
  specialties: string[];
  highestDegree?: string;
  studyField?: string;
  university?: string;
  graduationYear?: number;
  yearsExperience?: number;
  bio?: string;
  city?: string;
  country?: string;
  avatarUrl?: string;
}

/**
 * MediSport Standalone — Professional Onboarding Flow (v3.0)
 *
 * Separate multi-step flows for Coach and Trainee:
 * - Coach: Specialties → Education → Experience → Avatar → Complete
 * - Trainee: Goal → Body Metrics → Avatar → Complete
 *
 * Both include avatar upload via /api/sport/upload (kind=avatar).
 * Data is saved to the sport_profiles table via API.
 */
export default function SportOnboardingPage() {
  const t = useTranslations("SportStandalone");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRtl = locale === "ar";
  const role = (searchParams.get("role") as "trainee" | "coach") || "trainee";

  if (role === "coach") {
    return <CoachOnboarding locale={locale} isRtl={isRtl} router={router} t={t} />;
  }
  return <TraineeOnboarding locale={locale} isRtl={isRtl} router={router} t={t} />;
}

// ═══════════════════════════════════════════════════════════════════
// TRAINEE ONBOARDING
// ═══════════════════════════════════════════════════════════════════

function TraineeOnboarding({
  locale,
  isRtl,
  router,
  t,
}: {
  locale: string;
  isRtl: boolean;
  router: ReturnType<typeof useRouter>;
  t: (key: string) => string;
}) {
  const [step, setStep] = React.useState<TraineeStep>("goal");
  const [data, setData] = React.useState<TraineeData>({});
  const [loading, setLoading] = React.useState(false);
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const steps: TraineeStep[] = ["goal", "body", "avatar", "complete"];
  const currentIdx = steps.indexOf(step);
  const progress = Math.round(((currentIdx + 1) / steps.length) * 100);

  const goals = [
    { id: "fat_loss", icon: Scale, label: locale === "ar" ? "إنقاص الوزن" : "Fat Loss", color: "bg-orange-50 text-orange-600" },
    { id: "muscle_gain", icon: Dumbbell, label: locale === "ar" ? "بناء العضلات" : "Muscle Gain", color: "bg-blue-50 text-blue-600" },
    { id: "endurance", icon: Activity, label: locale === "ar" ? "التحمّل" : "Endurance", color: "bg-green-50 text-green-600" },
    { id: "flexibility", icon: Heart, label: locale === "ar" ? "المرونة" : "Flexibility", color: "bg-pink-50 text-pink-600" },
    { id: "competition", icon: Trophy, label: locale === "ar" ? "المنافسة" : "Competition", color: "bg-amber-50 text-amber-600" },
    { id: "health", icon: Zap, label: locale === "ar" ? "الصحة العامة" : "General Health", color: "bg-emerald-50 text-emerald-600" },
  ];

  const activityLevels = [
    { id: "sedentary", label: locale === "ar" ? "خامل (مكتبي)" : "Sedentary" },
    { id: "light", label: locale === "ar" ? "نشاط خفيف (١-٢ أيام)" : "Light (1-2 days)" },
    { id: "moderate", label: locale === "ar" ? "نشاط معتدل (٣-٤ أيام)" : "Moderate (3-4 days)" },
    { id: "active", label: locale === "ar" ? "نشط (٥-٦ أيام)" : "Active (5-6 days)" },
    { id: "very_active", label: locale === "ar" ? "نشط جداً (يومياً)" : "Very Active (daily)" },
  ];

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "avatar");
      const res = await fetch("/api/sport/upload", { method: "POST", body: form });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.url) {
          setData({ ...data, avatarUrl: json.data.url });
          toast.success(locale === "ar" ? "تم رفع الصورة بنجاح" : "Photo uploaded!");
        }
      } else {
        toast.error(locale === "ar" ? "فشل رفع الصورة" : "Upload failed");
      }
    } catch {
      toast.error(locale === "ar" ? "خطأ في الاتصال" : "Connection error");
    }
    setAvatarUploading(false);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "trainee-profile-save",
          profile: {
            displayName: data.displayName || null,
            sex: data.sex || null,
            birthDate: data.birthDate || null,
            heightCm: data.heightCm || null,
            weightKg: data.weightKg || null,
            goal: data.goal || null,
            activityLevel: data.activityLevel || null,
            avatarUrl: data.avatarUrl || null,
          },
        }),
      });
      if (res.ok) {
        localStorage.setItem("medisport-role", "trainee");
        setStep("complete");
        toast.success(locale === "ar" ? "تم إكمال الإعداد!" : "Setup complete!");
        setTimeout(() => router.push(`/${locale}/trainee`), 2000);
      } else {
        toast.error(locale === "ar" ? "حدث خطأ" : "Error occurred");
      }
    } catch {
      toast.error(locale === "ar" ? "خطأ في الاتصال" : "Connection error");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {step !== "goal" && step !== "complete" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setStep(steps[currentIdx - 1] as TraineeStep)}
                >
                  <ArrowLeft className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
                </Button>
              )}
              <span className="text-sm font-semibold text-slate-700">
                {locale === "ar" ? "إعداد حسابك" : "Setting up your account"}
              </span>
            </div>
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-xs rounded-lg">
              {currentIdx + 1}/{steps.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step: Goal Selection */}
        {step === "goal" && (
          <div className="space-y-5 ms-animate-in">
            <div className="text-center mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mx-auto mb-4 shadow-lg shadow-emerald-200/40">
                <Target className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {locale === "ar" ? "ما هو هدفك الرياضي؟" : "What's your fitness goal?"}
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                {locale === "ar" ? "سنخصّص تجربتك بناءً على هدفك" : "We'll personalize your experience based on your goal"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {goals.map((g) => (
                <button
                  key={g.id}
                  onClick={() => { setData({ ...data, goal: g.id }); setStep("body"); }}
                  className={`p-4 rounded-2xl border-2 transition-all duration-200 text-start hover:shadow-md ${
                    data.goal === g.id
                      ? "border-emerald-500 bg-emerald-50/50 shadow-md"
                      : "border-slate-100 hover:border-emerald-200 bg-white"
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${g.color} mb-3`}>
                    <g.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{g.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Body Metrics */}
        {step === "body" && (
          <div className="space-y-5 ms-animate-in">
            <div className="text-center mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mx-auto mb-4 shadow-lg shadow-blue-200/40">
                <Ruler className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {locale === "ar" ? "المعلومات الأساسية" : "Basic Information"}
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                {locale === "ar" ? "لنتمكن من حساب مقاييسك بدقة" : "So we can calculate your metrics accurately"}
              </p>
            </div>
            <Card className="border-0 shadow-[0_2px_8px_rgba(15,23,42,0.06)] rounded-2xl">
              <CardContent className="p-5 space-y-4">
                {/* Display Name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    {locale === "ar" ? "الاسم المعروض" : "Display Name"}
                  </label>
                  <Input
                    placeholder={locale === "ar" ? "كيف تريد أن يظهر اسمك؟" : "How should we call you?"}
                    value={data.displayName || ""}
                    onChange={(e) => setData({ ...data, displayName: e.target.value })}
                    className="rounded-xl h-11"
                  />
                </div>
                {/* Sex */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    {locale === "ar" ? "الجنس" : "Sex"}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "male", label: locale === "ar" ? "ذكر" : "Male" },
                      { id: "female", label: locale === "ar" ? "أنثى" : "Female" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setData({ ...data, sex: s.id })}
                        className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                          data.sex === s.id
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-slate-100 text-slate-600 hover:border-emerald-200"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Height & Weight */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      {locale === "ar" ? "الطول (سم)" : "Height (cm)"}
                    </label>
                    <Input
                      type="number"
                      placeholder="175"
                      value={data.heightCm || ""}
                      onChange={(e) => setData({ ...data, heightCm: Number(e.target.value) })}
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      {locale === "ar" ? "الوزن (كجم)" : "Weight (kg)"}
                    </label>
                    <Input
                      type="number"
                      placeholder="75"
                      value={data.weightKg || ""}
                      onChange={(e) => setData({ ...data, weightKg: Number(e.target.value) })}
                      className="rounded-xl h-11"
                    />
                  </div>
                </div>
                {/* Birth Date */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    {locale === "ar" ? "تاريخ الميلاد" : "Birth Date"}
                  </label>
                  <Input
                    type="date"
                    value={data.birthDate || ""}
                    onChange={(e) => setData({ ...data, birthDate: e.target.value })}
                    className="rounded-xl h-11"
                  />
                </div>
                {/* Activity Level */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    {locale === "ar" ? "مستوى النشاط" : "Activity Level"}
                  </label>
                  <div className="space-y-2">
                    {activityLevels.map((level) => (
                      <button
                        key={level.id}
                        onClick={() => setData({ ...data, activityLevel: level.id })}
                        className={`w-full p-3 rounded-xl border-2 text-sm text-start transition-all ${
                          data.activityLevel === level.id
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-medium"
                            : "border-slate-100 text-slate-600 hover:border-emerald-200"
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Button
              onClick={() => setStep("avatar")}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl h-12 shadow-lg shadow-emerald-200/40 transition-all duration-200"
            >
              {locale === "ar" ? "التالي" : "Next"}
              <ArrowRight className={`h-4 w-4 ms-2 ${isRtl ? "rotate-180" : ""}`} />
            </Button>
          </div>
        )}

        {/* Step: Avatar Upload */}
        {step === "avatar" && (
          <div className="space-y-5 ms-animate-in">
            <div className="text-center mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 mx-auto mb-4 shadow-lg shadow-purple-200/40">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {locale === "ar" ? "صورتك الشخصية" : "Your Profile Photo"}
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                {locale === "ar" ? "أضف صورة شخصية لتكون مرئياً للمدربين والمجتمع" : "Add a photo to be visible to coaches and the community"}
              </p>
            </div>
            <Card className="border-0 shadow-[0_2px_8px_rgba(15,23,42,0.06)] rounded-2xl">
              <CardContent className="p-8 flex flex-col items-center">
                {/* Avatar Preview */}
                <div className="relative mb-6">
                  <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-emerald-100 shadow-lg">
                    {data.avatarUrl ? (
                      <Image src={data.avatarUrl} alt="Avatar" width={128} height={128} className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                        <User className="h-12 w-12 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="absolute bottom-0 end-0 h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg hover:bg-emerald-700 transition-colors"
                  >
                    {avatarUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
                <p className="text-xs text-slate-500 text-center">
                  {locale === "ar" ? "JPG أو PNG أو WebP — الحد الأقصى ١٥ ميجابايت" : "JPG, PNG, or WebP — max 15MB"}
                </p>
              </CardContent>
            </Card>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleComplete}
                disabled={loading}
                className="flex-1 rounded-xl h-12 border-slate-200"
              >
                {loading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {locale === "ar" ? "تخطّي" : "Skip"}
              </Button>
              <Button
                onClick={handleComplete}
                disabled={loading || !data.avatarUrl}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl h-12 shadow-lg shadow-emerald-200/40"
              >
                {loading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {locale === "ar" ? "إكمال الإعداد" : "Complete Setup"}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Complete */}
        {step === "complete" && (
          <div className="text-center space-y-5 ms-animate-in">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 mx-auto shadow-lg shadow-emerald-100/50">
              <Check className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {locale === "ar" ? "مرحباً بك في MediSport!" : "Welcome to MediSport!"}
            </h2>
            <p className="text-slate-600">
              {locale === "ar" ? "رحلتك الرياضية المخصصة تبدأ الآن." : "Your personalized fitness journey starts now."}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400 pt-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              {locale === "ar" ? "جارٍ التحويل إلى لوحة التحكم..." : "Redirecting to dashboard..."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COACH ONBOARDING
// ═══════════════════════════════════════════════════════════════════

function CoachOnboarding({
  locale,
  isRtl,
  router,
  t,
}: {
  locale: string;
  isRtl: boolean;
  router: ReturnType<typeof useRouter>;
  t: (key: string) => string;
}) {
  const [step, setStep] = React.useState<CoachStep>("specialties");
  const [data, setData] = React.useState<CoachData>({ specialties: [] });
  const [loading, setLoading] = React.useState(false);
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const steps: CoachStep[] = ["specialties", "education", "experience", "avatar", "complete"];
  const currentIdx = steps.indexOf(step);
  const progress = Math.round(((currentIdx + 1) / steps.length) * 100);

  const toggleSpecialty = (id: string) => {
    setData((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(id)
        ? prev.specialties.filter((s) => s !== id)
        : [...prev.specialties, id],
    }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "avatar");
      const res = await fetch("/api/sport/upload", { method: "POST", body: form });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.url) {
          setData({ ...data, avatarUrl: json.data.url });
          toast.success(locale === "ar" ? "تم رفع الصورة بنجاح" : "Photo uploaded!");
        }
      } else {
        toast.error(locale === "ar" ? "فشل رفع الصورة" : "Upload failed");
      }
    } catch {
      toast.error(locale === "ar" ? "خطأ في الاتصال" : "Connection error");
    }
    setAvatarUploading(false);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "coach-profile-save",
          profile: {
            displayName: data.displayName || null,
            specialties: data.specialties,
            highestDegree: data.highestDegree || null,
            studyField: data.studyField || null,
            university: data.university || null,
            graduationYear: data.graduationYear || null,
            yearsExperience: data.yearsExperience || null,
            bio: data.bio || null,
            city: data.city || null,
            country: data.country || null,
            avatarUrl: data.avatarUrl || null,
          },
        }),
      });
      if (res.ok) {
        localStorage.setItem("medisport-role", "coach");
        setStep("complete");
        toast.success(locale === "ar" ? "تم إكمال الإعداد!" : "Setup complete!");
        setTimeout(() => router.push(`/${locale}/coach`), 2000);
      } else {
        toast.error(locale === "ar" ? "حدث خطأ" : "Error occurred");
      }
    } catch {
      toast.error(locale === "ar" ? "خطأ في الاتصال" : "Connection error");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {step !== "specialties" && step !== "complete" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setStep(steps[currentIdx - 1] as CoachStep)}
                >
                  <ArrowLeft className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
                </Button>
              )}
              <span className="text-sm font-semibold text-slate-700">
                {locale === "ar" ? "إعداد حساب المدرب" : "Coach Account Setup"}
              </span>
            </div>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-xs rounded-lg">
              {currentIdx + 1}/{steps.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step: Specialties */}
        {step === "specialties" && (
          <div className="space-y-5 ms-animate-in">
            <div className="text-center mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mx-auto mb-4 shadow-lg shadow-blue-200/40">
                <Award className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {locale === "ar" ? "تخصصاتك التدريبية" : "Your Coaching Specialties"}
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                {locale === "ar" ? "اختر التخصصات التي تقدمها لعملائك (يمكنك اختيار أكثر من واحد)" : "Select the specialties you offer (multi-select)"}
              </p>
            </div>
            {/* Display Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                {locale === "ar" ? "الاسم المهني" : "Professional Name"}
              </label>
              <Input
                placeholder={locale === "ar" ? "الاسم الذي سيظهر للعملاء" : "Name shown to clients"}
                value={data.displayName || ""}
                onChange={(e) => setData({ ...data, displayName: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {COACH_SPECIALTIES.map((spec) => (
                <button
                  key={spec.id}
                  onClick={() => toggleSpecialty(spec.id)}
                  className={`p-3.5 rounded-xl border-2 text-sm text-start transition-all duration-200 ${
                    data.specialties.includes(spec.id)
                      ? "border-blue-500 bg-blue-50 text-blue-700 font-medium shadow-sm"
                      : "border-slate-100 text-slate-600 hover:border-blue-200"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {data.specialties.includes(spec.id) && <Check className="h-3.5 w-3.5" />}
                    {locale === "ar" ? spec.ar : spec.en}
                  </span>
                </button>
              ))}
            </div>
            <Button
              onClick={() => setStep("education")}
              disabled={data.specialties.length === 0}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl h-12 shadow-lg shadow-blue-200/40 transition-all duration-200"
            >
              {locale === "ar" ? "التالي" : "Next"}
              <ArrowRight className={`h-4 w-4 ms-2 ${isRtl ? "rotate-180" : ""}`} />
            </Button>
          </div>
        )}

        {/* Step: Education */}
        {step === "education" && (
          <div className="space-y-5 ms-animate-in">
            <div className="text-center mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 mx-auto mb-4 shadow-lg shadow-purple-200/40">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {locale === "ar" ? "الخلفية الأكاديمية" : "Academic Background"}
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                {locale === "ar" ? "المؤهلات الأكاديمية تعزز تقييمك كمدرب" : "Academic qualifications boost your coach score"}
              </p>
            </div>
            <Card className="border-0 shadow-[0_2px_8px_rgba(15,23,42,0.06)] rounded-2xl">
              <CardContent className="p-5 space-y-4">
                {/* Degree Level */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    {locale === "ar" ? "أعلى درجة علمية" : "Highest Degree"}
                  </label>
                  <div className="space-y-2">
                    {DEGREE_LEVELS.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setData({ ...data, highestDegree: d.id })}
                        className={`w-full p-3 rounded-xl border-2 text-sm text-start transition-all ${
                          data.highestDegree === d.id
                            ? "border-purple-500 bg-purple-50 text-purple-700 font-medium"
                            : "border-slate-100 text-slate-600 hover:border-purple-200"
                        }`}
                      >
                        {locale === "ar" ? d.ar : d.en}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Study Field */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    {locale === "ar" ? "مجال الدراسة" : "Field of Study"}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {RELEVANT_STUDY_FIELDS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setData({ ...data, studyField: f.id })}
                        className={`p-2.5 rounded-xl border-2 text-xs text-center transition-all ${
                          data.studyField === f.id
                            ? "border-purple-500 bg-purple-50 text-purple-700 font-medium"
                            : "border-slate-100 text-slate-600 hover:border-purple-200"
                        }`}
                      >
                        {locale === "ar" ? f.ar : f.en}
                      </button>
                    ))}
                  </div>
                </div>
                {/* University */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    {locale === "ar" ? "الجامعة" : "University"}
                  </label>
                  <Input
                    placeholder={locale === "ar" ? "اسم الجامعة" : "University name"}
                    value={data.university || ""}
                    onChange={(e) => setData({ ...data, university: e.target.value })}
                    className="rounded-xl h-11"
                  />
                </div>
                {/* Graduation Year */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    {locale === "ar" ? "سنة التخرج" : "Graduation Year"}
                  </label>
                  <Input
                    type="number"
                    placeholder="2020"
                    value={data.graduationYear || ""}
                    onChange={(e) => setData({ ...data, graduationYear: Number(e.target.value) })}
                    className="rounded-xl h-11"
                  />
                </div>
              </CardContent>
            </Card>
            <Button
              onClick={() => setStep("experience")}
              className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-xl h-12 shadow-lg shadow-purple-200/40 transition-all duration-200"
            >
              {locale === "ar" ? "التالي" : "Next"}
              <ArrowRight className={`h-4 w-4 ms-2 ${isRtl ? "rotate-180" : ""}`} />
            </Button>
          </div>
        )}

        {/* Step: Experience */}
        {step === "experience" && (
          <div className="space-y-5 ms-animate-in">
            <div className="text-center mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 mx-auto mb-4 shadow-lg shadow-amber-200/40">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {locale === "ar" ? "الخبرة المهنية" : "Professional Experience"}
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                {locale === "ar" ? "أخبرنا عن خبرتك في مجال التدريب" : "Tell us about your coaching experience"}
              </p>
            </div>
            <Card className="border-0 shadow-[0_2px_8px_rgba(15,23,42,0.06)] rounded-2xl">
              <CardContent className="p-5 space-y-4">
                {/* Years Experience */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    {locale === "ar" ? "سنوات الخبرة" : "Years of Experience"}
                  </label>
                  <Input
                    type="number"
                    placeholder="5"
                    min={0}
                    max={50}
                    value={data.yearsExperience || ""}
                    onChange={(e) => setData({ ...data, yearsExperience: Number(e.target.value) })}
                    className="rounded-xl h-11"
                  />
                </div>
                {/* Bio */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    {locale === "ar" ? "نبذة مهنية" : "Professional Bio"}
                  </label>
                  <textarea
                    placeholder={locale === "ar" ? "اكتب نبذة مختصرة عن خبرتك وأسلوبك التدريبي..." : "Write a brief bio about your experience and coaching style..."}
                    value={data.bio || ""}
                    onChange={(e) => setData({ ...data, bio: e.target.value })}
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
                  />
                </div>
                {/* Location */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      {locale === "ar" ? "المدينة" : "City"}
                    </label>
                    <Input
                      placeholder={locale === "ar" ? "الرياض" : "Riyadh"}
                      value={data.city || ""}
                      onChange={(e) => setData({ ...data, city: e.target.value })}
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      {locale === "ar" ? "الدولة" : "Country"}
                    </label>
                    <Input
                      placeholder={locale === "ar" ? "السعودية" : "Saudi Arabia"}
                      value={data.country || ""}
                      onChange={(e) => setData({ ...data, country: e.target.value })}
                      className="rounded-xl h-11"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Button
              onClick={() => setStep("avatar")}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl h-12 shadow-lg shadow-amber-200/40 transition-all duration-200"
            >
              {locale === "ar" ? "التالي" : "Next"}
              <ArrowRight className={`h-4 w-4 ms-2 ${isRtl ? "rotate-180" : ""}`} />
            </Button>
          </div>
        )}

        {/* Step: Avatar */}
        {step === "avatar" && (
          <div className="space-y-5 ms-animate-in">
            <div className="text-center mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 mx-auto mb-4 shadow-lg shadow-teal-200/40">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {locale === "ar" ? "صورتك المهنية" : "Your Professional Photo"}
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                {locale === "ar" ? "صورة احترافية تزيد ثقة العملاء بك" : "A professional photo builds client trust"}
              </p>
            </div>
            <Card className="border-0 shadow-[0_2px_8px_rgba(15,23,42,0.06)] rounded-2xl">
              <CardContent className="p-8 flex flex-col items-center">
                <div className="relative mb-6">
                  <div className="h-36 w-36 rounded-full overflow-hidden border-4 border-blue-100 shadow-lg">
                    {data.avatarUrl ? (
                      <Image src={data.avatarUrl} alt="Avatar" width={144} height={144} className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                        <User className="h-14 w-14 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="absolute bottom-1 end-1 h-11 w-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
                  >
                    {avatarUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Camera className="h-5 w-5" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
                <p className="text-xs text-slate-500 text-center mb-2">
                  {locale === "ar" ? "JPG أو PNG أو WebP — الحد الأقصى ١٥ ميجابايت" : "JPG, PNG, or WebP — max 15MB"}
                </p>
                <p className="text-xs text-blue-600 text-center font-medium">
                  {locale === "ar" ? "المدربون الذين لديهم صورة يحصلون على عملاء أكثر بنسبة ٤٠٪" : "Coaches with photos get 40% more clients"}
                </p>
              </CardContent>
            </Card>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleComplete}
                disabled={loading}
                className="flex-1 rounded-xl h-12 border-slate-200"
              >
                {loading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {locale === "ar" ? "تخطّي" : "Skip"}
              </Button>
              <Button
                onClick={handleComplete}
                disabled={loading || !data.avatarUrl}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl h-12 shadow-lg shadow-blue-200/40"
              >
                {loading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {locale === "ar" ? "إكمال الإعداد" : "Complete Setup"}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Complete */}
        {step === "complete" && (
          <div className="text-center space-y-5 ms-animate-in">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 mx-auto shadow-lg shadow-blue-100/50">
              <Check className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {locale === "ar" ? "مرحباً بك كمدرب في MediSport!" : "Welcome Coach!"}
            </h2>
            <p className="text-slate-600">
              {locale === "ar"
                ? "حسابك جاهز. يمكنك الآن إكمال ملفك المهني وتقديمه للاعتماد."
                : "Your account is ready. Complete your professional profile for verification."}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400 pt-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              {locale === "ar" ? "جارٍ التحويل إلى لوحة التحكم..." : "Redirecting to dashboard..."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
