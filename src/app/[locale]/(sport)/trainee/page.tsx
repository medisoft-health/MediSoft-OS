"use client";
import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Apple,
  BookOpen,
  ChevronRight,
  Flame,
  FlaskConical,
  Footprints,
  Heart,
  MapPin,
  MessageSquare,
  Moon,
  Scale,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Dumbbell,
  Droplets,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MyCoachCard } from "@/components/sport/clients-manager";
import { SportAuthGuard } from "@/components/sport/sport-auth-guard";

/**
 * MediSport Standalone — Trainee Dashboard (v2.0 UI Upgrade)
 *
 * Visual improvements:
 * - Softer background (#F8FAFC)
 * - Cards with subtle shadows instead of heavy borders
 * - Improved spacing and breathing room
 * - Fade-in animations for content sections
 * - Refined color palette with lower saturation backgrounds
 * - Better typography hierarchy
 */
export default function TraineeDashboardPage() {
  const t = useTranslations("SportStandalone");
  const locale = useLocale();
  const isRtl = locale === "ar";

  return (
    <SportAuthGuard requiredRole="trainee">
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 pb-28 md:pb-8">
      {/* Header — more breathing room */}
      <div className="flex items-center justify-between mb-8 ms-animate-in">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t("traineeDashboard")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("traineeDashboardDesc")}</p>
        </div>
        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded-xl px-3 py-1.5">
          <Flame className="h-3.5 w-3.5 me-1.5" />
          {t("streak")}: 7
        </Badge>
      </div>

      {/* Profile Completion Prompt */}
      <Link href={`/${locale}/trainee/profile`}>
        <Card className="border-0 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)] bg-gradient-to-r from-orange-50/80 to-amber-50/60 mb-5 overflow-hidden relative ms-animate-in ms-animate-in-delay-1 rounded-2xl hover:shadow-md transition-all duration-300 cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-800">
                  {locale === "ar" ? "أكمل ملفك الشخصي" : "Complete Your Profile"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {locale === "ar"
                    ? "أكمل بياناتك للحصول على تجربة تدريبية مخصصة بالكامل"
                    : "Complete your data for a fully personalized training experience"}
                </p>
              </div>
              <ChevronRight className={`h-4 w-4 text-orange-400 ${isRtl ? "rotate-180" : ""}`} />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Linked coach (DB-backed, mirrored) */}
      <div className="mb-5 ms-animate-in ms-animate-in-delay-1">
        <MyCoachCard />
      </div>

      {/* Daily Progress Overview — refined gradient */}
      <Card className="border-0 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)] bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 mb-5 ms-animate-in ms-animate-in-delay-2 rounded-2xl">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">{t("todayProgress")}</h3>
            <span className="text-xs text-slate-500 bg-white/80 px-2.5 py-1 rounded-lg">{t("dailyGoal")}: 75%</span>
          </div>
          <Progress value={75} className="h-2 mb-4" />
          <div className="grid grid-cols-4 gap-3">
            <MiniStat icon={Footprints} value="8,240" label={t("steps")} />
            <MiniStat icon={Flame} value="1,850" label={t("calories")} />
            <MiniStat icon={Droplets} value="6/8" label={t("water")} />
            <MiniStat icon={Moon} value="7.5h" label={t("sleep")} />
          </div>
        </CardContent>
      </Card>

      {/* MediSport Personal Coach — premium feel */}
      <Card className="border-0 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)] bg-gradient-to-r from-emerald-50/90 to-teal-50/60 mb-5 overflow-hidden relative ms-animate-in ms-animate-in-delay-3 rounded-2xl">
        <div className="absolute top-0 end-0 w-32 h-32 bg-emerald-200/15 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 start-0 w-20 h-20 bg-teal-200/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <CardContent className="p-5 relative">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200/40">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 text-sm">{t("personalCoach")}</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t("personalCoachDesc")}</p>
            </div>
            <Link href={`/${locale}/trainee/coach`}>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs shadow-sm shadow-emerald-200/50 transition-all duration-200 hover:shadow-md">
                {t("askCoach")}
              </Button>
            </Link>
          </div>
          {/* Today's Insight */}
          <div className="mt-4 p-3.5 rounded-xl bg-white/80 border border-emerald-100/60 backdrop-blur-sm">
            <p className="text-xs text-emerald-700 font-semibold mb-1.5">{t("todayInsight")}:</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              {locale === "ar"
                ? "بناءً على بياناتك الصحية، يُنصح بزيادة تناول البروتين إلى ١٢٠ غرام يومياً لدعم بناء العضلات. حاول إضافة وجبة خفيفة غنية بالبروتين بعد التمرين."
                : "Based on your health data, increasing protein intake to 120g daily is recommended to support muscle building. Try adding a protein-rich snack post-workout."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Feature Grid — improved cards */}
      <div className="grid grid-cols-2 gap-3.5 mb-5 ms-animate-in ms-animate-in-delay-4">
        <FeatureButton
          icon={Dumbbell}
          label={t("training")}
          description={t("trainingDesc")}
          color="emerald"
          href={`/${locale}/trainee/training`}
        />
        <FeatureButton
          icon={Apple}
          label={t("foodLogger")}
          description={t("foodLoggerDesc")}
          color="green"
          href={`/${locale}/trainee/food`}
        />
        <FeatureButton
          icon={MapPin}
          label={t("gpsTracker")}
          description={t("gpsTrackerDesc")}
          color="blue"
          href={`/${locale}/trainee/activity`}
        />
        <FeatureButton
          icon={Heart}
          label={t("bioAge")}
          description={t("bioAgeDesc")}
          color="rose"
          href={`/${locale}/trainee/bio-age`}
        />
        <FeatureButton
          icon={BookOpen}
          label={t("microLessons")}
          description={t("microLessonsDesc")}
          color="purple"
          href={`/${locale}/trainee/lessons`}
        />
        <FeatureButton
          icon={Users}
          label={t("community")}
          description={t("communityDesc")}
          color="green"
          href={`/${locale}/trainee/community`}
        />
        <FeatureButton
          icon={Scale}
          label={t("bodyComposition")}
          description={t("bodyCompositionDesc")}
          color="blue"
          href={`/${locale}/trainee/body`}
        />
        <FeatureButton
          icon={FlaskConical}
          label={t("labResults")}
          description={t("labResultsDesc")}
          color="green"
          href={`/${locale}/trainee/labs`}
        />
        <FeatureButton
          icon={ShieldCheck}
          label={t("findCoach")}
          description={t("findCoachDesc")}
          color="blue"
          href={`/${locale}/trainee/coaches`}
        />
        <FeatureButton
          icon={Dumbbell}
          label={locale === "ar" ? "مكتبة التمارين" : "Exercise Library"}
          description={locale === "ar" ? "تصفح جميع التمارين" : "Browse all exercises"}
          color="emerald"
          href={`/${locale}/trainee/exercises`}
        />
      </div>

      {/* Body Composition Tracker (snapshot — full history at /trainee/body) */}
      <Card className="border-0 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)] mb-5 rounded-2xl">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-sm font-semibold text-slate-800 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Scale className="h-3.5 w-3.5" />
              </div>
              {t("bodyComposition")}
            </span>
            <Link href={`/${locale}/trainee/body`} className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
              {t("viewHistory")}
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-slate-50/80">
              <div className="text-lg font-bold text-slate-800 ms-stat-value">75.2</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{t("weightKg")}</div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">-0.3</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-slate-50/80">
              <div className="text-lg font-bold text-slate-800 ms-stat-value">32.5</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{t("muscleKg")}</div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">+0.2</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-slate-50/80">
              <div className="text-lg font-bold text-slate-800 ms-stat-value">18.4%</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{t("fatPercent")}</div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">-0.5%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coach Connection */}
      <Card className="border-0 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)] mb-5 rounded-2xl">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">{t("myCoach")}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{t("connectWithCoach")}</p>
              </div>
            </div>
            <Link href={`/${locale}/trainee/coaches`}>
              <Button size="sm" variant="outline" className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50 text-xs transition-all duration-200">
                {t("findCoach")}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Social & Challenges */}
      <div className="grid grid-cols-2 gap-3.5 mb-5">
        <Link href={`/${locale}/trainee/community`}>
          <Card className="border-0 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)] hover:shadow-[0_4px_6px_rgba(15,23,42,0.06),0_10px_24px_rgba(15,23,42,0.05)] transition-all duration-300 cursor-pointer rounded-2xl h-full">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Trophy className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-semibold text-slate-800">{t("challenges")}</span>
              </div>
              <p className="text-xs text-slate-500">{t("activeChallenges")}: 2</p>
              <Progress value={60} className="h-1.5 mt-2.5" />
            </CardContent>
          </Card>
        </Link>
        <Link href={`/${locale}/trainee/community`}>
          <Card className="border-0 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)] hover:shadow-[0_4px_6px_rgba(15,23,42,0.06),0_10px_24px_rgba(15,23,42,0.05)] transition-all duration-300 cursor-pointer rounded-2xl h-full">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <MessageSquare className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-semibold text-slate-800">{t("social")}</span>
              </div>
              <p className="text-xs text-slate-500">{t("newPosts")}: 5</p>
              <div className="flex -space-x-1.5 mt-2.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-6 w-6 rounded-full bg-slate-100 border-2 border-white" />
                ))}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* WADA Check */}
      <Link href={`/${locale}/trainee/wada`}>
        <Card className="border-0 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)] bg-amber-50/40 hover:shadow-[0_4px_6px_rgba(15,23,42,0.06),0_10px_24px_rgba(15,23,42,0.05)] transition-all duration-300 cursor-pointer rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100/80 text-amber-600">
                  <FlaskConical className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{t("wadaCheck")}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{t("wadaCheckDesc")}</p>
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 text-slate-400 ${isRtl ? "rotate-180" : ""}`} />
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
    </SportAuthGuard>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

function MiniStat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}) {
  return (
    <div className="text-center p-2 rounded-xl bg-white/60">
      <Icon className="h-4 w-4 text-emerald-600 mx-auto mb-1.5" />
      <div className="text-xs font-bold text-slate-800 ms-stat-value">{value}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function FeatureButton({
  icon: Icon,
  label,
  description,
  color,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  color: string;
  href: string;
}) {
  const colorMap: Record<string, { card: string; icon: string }> = {
    green: { card: "hover:shadow-[0_4px_6px_rgba(15,23,42,0.06),0_10px_24px_rgba(15,23,42,0.05)]", icon: "bg-emerald-50 text-emerald-600" },
    blue: { card: "hover:shadow-[0_4px_6px_rgba(15,23,42,0.06),0_10px_24px_rgba(15,23,42,0.05)]", icon: "bg-blue-50 text-blue-600" },
    rose: { card: "hover:shadow-[0_4px_6px_rgba(15,23,42,0.06),0_10px_24px_rgba(15,23,42,0.05)]", icon: "bg-rose-50 text-rose-600" },
    purple: { card: "hover:shadow-[0_4px_6px_rgba(15,23,42,0.06),0_10px_24px_rgba(15,23,42,0.05)]", icon: "bg-purple-50 text-purple-600" },
    emerald: { card: "hover:shadow-[0_4px_6px_rgba(15,23,42,0.06),0_10px_24px_rgba(15,23,42,0.05)]", icon: "bg-emerald-100 text-emerald-700" },
  };
  const c = colorMap[color] || colorMap.green;

  return (
    <Link href={href}>
      <Card className={`border-0 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)] ${c.card} transition-all duration-300 cursor-pointer h-full rounded-2xl`}>
        <CardContent className="p-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.icon} mb-3`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">{label}</h3>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
