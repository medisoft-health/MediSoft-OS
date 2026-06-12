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
  Droplets,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MyCoachCard } from "@/components/sport/clients-manager";

/**
 * MediSport Standalone — Trainee Dashboard
 * 
 * Mirrors the existing MediSport module features:
 * - Food Logger
 * - Bio-Age Calculator
 * - Micro-Lessons
 * - GPS Activity Tracker
 * - Social Feed
 * - MediSport Personal Coach (Medical Intelligence-driven insights)
 * - Coach Connection Portal
 */
export default function TraineeDashboardPage() {
  const t = useTranslations("SportStandalone");
  const locale = useLocale();
  const isRtl = locale === "ar";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t("traineeDashboard")}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t("traineeDashboardDesc")}</p>
        </div>
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
          <Flame className="h-3 w-3 me-1" />
          {t("streak")}: 7
        </Badge>
      </div>

      {/* Linked coach (DB-backed, mirrored) */}
      <div className="mb-4">
        <MyCoachCard />
      </div>

      {/* Daily Progress Overview */}
      <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">{t("todayProgress")}</h3>
            <span className="text-xs text-slate-500">{t("dailyGoal")}: 75%</span>
          </div>
          <Progress value={75} className="h-2 mb-3" />
          <div className="grid grid-cols-4 gap-2">
            <MiniStat icon={Footprints} value="8,240" label={t("steps")} />
            <MiniStat icon={Flame} value="1,850" label={t("calories")} />
            <MiniStat icon={Droplets} value="6/8" label={t("water")} />
            <MiniStat icon={Moon} value="7.5h" label={t("sleep")} />
          </div>
        </CardContent>
      </Card>

      {/* MediSport Personal Coach */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 mb-4 overflow-hidden relative">
        <div className="absolute top-0 end-0 w-24 h-24 bg-emerald-200/20 rounded-full -translate-y-1/2 translate-x-1/2" />
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200/50">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 text-sm">{t("personalCoach")}</h3>
              <p className="text-xs text-slate-600 mt-0.5">{t("personalCoachDesc")}</p>
            </div>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs">
              {t("askCoach")}
            </Button>
          </div>
          {/* Today's Insight */}
          <div className="mt-3 p-3 rounded-lg bg-white/70 border border-emerald-100">
            <p className="text-xs text-emerald-800 font-medium mb-1">{t("todayInsight")}:</p>
            <p className="text-xs text-slate-600">
              {locale === "ar"
                ? "بناءً على بياناتك الصحية، يُنصح بزيادة تناول البروتين إلى ١٢٠ غرام يومياً لدعم بناء العضلات. حاول إضافة وجبة خفيفة غنية بالبروتين بعد التمرين."
                : "Based on your health data, increasing protein intake to 120g daily is recommended to support muscle building. Try adding a protein-rich snack post-workout."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Feature Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
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
      </div>

      {/* Body Composition Tracker (snapshot — full history at /trainee/body) */}
      <Card className="border-slate-100 mb-4">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-blue-500" />
              {t("bodyComposition")}
            </span>
            <Link href={`/${locale}/trainee/body`} className="text-xs font-normal text-emerald-600 hover:underline">
              {t("viewHistory")}
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-lg bg-slate-50">
              <div className="text-lg font-bold text-slate-900">75.2</div>
              <div className="text-[10px] text-slate-500">{t("weightKg")}</div>
              <div className="text-[10px] text-emerald-600 font-medium">-0.3</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-slate-50">
              <div className="text-lg font-bold text-slate-900">32.5</div>
              <div className="text-[10px] text-slate-500">{t("muscleKg")}</div>
              <div className="text-[10px] text-emerald-600 font-medium">+0.2</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-slate-50">
              <div className="text-lg font-bold text-slate-900">18.4%</div>
              <div className="text-[10px] text-slate-500">{t("fatPercent")}</div>
              <div className="text-[10px] text-emerald-600 font-medium">-0.5%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coach Connection */}
      <Card className="border-blue-100 mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{t("myCoach")}</h3>
                <p className="text-xs text-slate-500">{t("connectWithCoach")}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50 text-xs">
              {t("findCoach")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Social & Challenges */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className="border-slate-100 hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-slate-900">{t("challenges")}</span>
            </div>
            <p className="text-xs text-slate-500">{t("activeChallenges")}: 2</p>
            <Progress value={60} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card className="border-slate-100 hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-slate-900">{t("social")}</span>
            </div>
            <p className="text-xs text-slate-500">{t("newPosts")}: 5</p>
            <div className="flex -space-x-1 mt-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-5 w-5 rounded-full bg-slate-200 border border-white" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* WADA Check */}
      <Card className="border-amber-100 bg-amber-50/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <FlaskConical className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{t("wadaCheck")}</h3>
                <p className="text-xs text-slate-500">{t("wadaCheckDesc")}</p>
              </div>
            </div>
            <ChevronRight className={`h-4 w-4 text-slate-400 ${isRtl ? "rotate-180" : ""}`} />
          </div>
        </CardContent>
      </Card>
    </div>
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
    <div className="text-center">
      <Icon className="h-3.5 w-3.5 text-emerald-600 mx-auto mb-1" />
      <div className="text-xs font-bold text-slate-900">{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
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
  const colorMap: Record<string, { bg: string; icon: string }> = {
    green: { bg: "bg-green-50 hover:bg-green-100/50 border-green-100", icon: "bg-green-100 text-green-600" },
    blue: { bg: "bg-blue-50 hover:bg-blue-100/50 border-blue-100", icon: "bg-blue-100 text-blue-600" },
    rose: { bg: "bg-rose-50 hover:bg-rose-100/50 border-rose-100", icon: "bg-rose-100 text-rose-600" },
    purple: { bg: "bg-purple-50 hover:bg-purple-100/50 border-purple-100", icon: "bg-purple-100 text-purple-600" },
  };
  const c = colorMap[color];

  return (
    <Link href={href}>
      <Card className={`border ${c.bg} hover:shadow-md transition-all duration-200 cursor-pointer h-full`}>
        <CardContent className="p-4">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.icon} mb-2`}>
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
