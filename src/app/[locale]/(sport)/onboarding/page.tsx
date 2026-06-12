"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  Dumbbell,
  Heart,
  Loader2,
  MapPin,
  Ruler,
  Scale,
  Target,
  Trophy,
  User,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

type OnboardingStep = "goal" | "info" | "complete";

interface OnboardingData {
  role: "trainee" | "coach";
  goal?: string;
  sport?: string;
  weight?: number;
  height?: number;
  age?: number;
  trainingDays?: number;
  // Coach-specific
  specialization?: string;
  experience?: string;
  certifications?: string;
}

/**
 * MediSport Standalone — Onboarding Flow
 * 
 * Multi-step onboarding that collects:
 * - For Trainees: fitness goal, sport, basic metrics
 * - For Coaches: specialization, experience, certifications
 */
export default function SportOnboardingPage() {
  const t = useTranslations("SportStandalone");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRtl = locale === "ar";

  const role = (searchParams.get("role") as "trainee" | "coach") || "trainee";
  const [step, setStep] = React.useState<OnboardingStep>("goal");
  const [data, setData] = React.useState<OnboardingData>({ role });
  const [loading, setLoading] = React.useState(false);

  const progress = step === "goal" ? 33 : step === "info" ? 66 : 100;

  const traineeGoals = [
    { id: "weight_loss", icon: Scale, label: t("goalWeightLoss") },
    { id: "muscle_gain", icon: Dumbbell, label: t("goalMuscleGain") },
    { id: "endurance", icon: Activity, label: t("goalEndurance") },
    { id: "flexibility", icon: Heart, label: t("goalFlexibility") },
    { id: "competition", icon: Trophy, label: t("goalCompetition") },
    { id: "health", icon: Zap, label: t("goalHealth") },
  ];

  const coachSpecializations = [
    { id: "strength", icon: Dumbbell, label: t("specStrength") },
    { id: "nutrition", icon: Heart, label: t("specNutrition") },
    { id: "sports", icon: Trophy, label: t("specSports") },
    { id: "rehabilitation", icon: Activity, label: t("specRehab") },
    { id: "weight_management", icon: Scale, label: t("specWeight") },
    { id: "general", icon: Users, label: t("specGeneral") },
  ];

  const handleGoalSelect = (goalId: string) => {
    if (role === "trainee") {
      setData({ ...data, goal: goalId });
    } else {
      setData({ ...data, specialization: goalId });
    }
    setStep("info");
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Save onboarding data to localStorage (will be synced to DB later)
      localStorage.setItem("medisport-onboarding", JSON.stringify(data));
      localStorage.setItem("medisport-role", role);
      setStep("complete");
      toast.success(t("onboardingComplete"));

      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/${locale}/sport/${role}`);
      }, 2000);
    } catch (err) {
      toast.error(t("authError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">
              {t("onboardingProgress")}
            </span>
            <span className="text-sm text-slate-400">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step: Goal / Specialization Selection */}
        {step === "goal" && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl ms-grad-brand mx-auto mb-3 shadow-lg shadow-sport-500/20">
                {role === "trainee" ? (
                  <Target className="h-6 w-6 text-white" />
                ) : (
                  <Users className="h-6 w-6 text-white" />
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {role === "trainee" ? t("selectGoal") : t("selectSpecialization")}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {role === "trainee" ? t("selectGoalDesc") : t("selectSpecDesc")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(role === "trainee" ? traineeGoals : coachSpecializations).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleGoalSelect(item.id)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all duration-200 group"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 text-center">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Basic Info */}
        {step === "info" && (
          <Card className="border-slate-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {role === "trainee" ? t("basicInfo") : t("coachInfo")}
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {role === "trainee" ? t("basicInfoDesc") : t("coachInfoDesc")}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep("goal")}>
                  <ArrowLeft className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
                </Button>
              </div>

              {role === "trainee" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">{t("weightKg")}</label>
                      <div className="relative">
                        <Scale className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="number"
                          placeholder="75"
                          value={data.weight || ""}
                          onChange={(e) => setData({ ...data, weight: Number(e.target.value) })}
                          className="ps-10 rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">{t("heightCm")}</label>
                      <div className="relative">
                        <Ruler className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="number"
                          placeholder="175"
                          value={data.height || ""}
                          onChange={(e) => setData({ ...data, height: Number(e.target.value) })}
                          className="ps-10 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">{t("age")}</label>
                      <div className="relative">
                        <User className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="number"
                          placeholder="28"
                          value={data.age || ""}
                          onChange={(e) => setData({ ...data, age: Number(e.target.value) })}
                          className="ps-10 rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">{t("trainingDays")}</label>
                      <div className="relative">
                        <Activity className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="number"
                          placeholder="4"
                          min={1}
                          max={7}
                          value={data.trainingDays || ""}
                          onChange={(e) => setData({ ...data, trainingDays: Number(e.target.value) })}
                          className="ps-10 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">{t("yearsExperience")}</label>
                    <Input
                      type="number"
                      placeholder="5"
                      value={data.experience || ""}
                      onChange={(e) => setData({ ...data, experience: e.target.value })}
                      className="rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">{t("certifications")}</label>
                    <Input
                      type="text"
                      placeholder={t("certificationsPlaceholder")}
                      value={data.certifications || ""}
                      onChange={(e) => setData({ ...data, certifications: e.target.value })}
                      className="rounded-lg"
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={handleComplete}
                disabled={loading}
                className="w-full mt-6 ms-grad-brand hover:opacity-90 text-white rounded-lg h-11 transition-opacity"
              >
                {loading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {t("completeOnboarding")}
                <ArrowRight className={`h-4 w-4 ms-2 ${isRtl ? "rotate-180" : ""}`} />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Complete */}
        {step === "complete" && (
          <div className="text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mx-auto">
              <Check className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{t("welcomeTitle")}</h2>
            <p className="text-slate-600">{t("welcomeDesc")}</p>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("redirecting")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
