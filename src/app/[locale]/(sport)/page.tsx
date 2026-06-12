"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Activity,
  Apple,
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  Dumbbell,
  FlaskConical,
  Heart,
  MapPin,
  Shield,
  Sparkles,
  Star,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * MediSport Standalone — Landing Page
 * 
 * The world's first Clinical Fitness Coaching platform.
 * Showcases the dual-entry model (Coach/Trainee) and key features.
 */
export default function SportLandingPage() {
  const t = useTranslations("SportStandalone");
  const locale = useLocale();
  const isRtl = locale === "ar";

  return (
    <div className="flex flex-col pb-20 md:pb-0">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50/50" />
          <div className="absolute top-20 start-10 h-72 w-72 rounded-full bg-emerald-200/20 blur-3xl" />
          <div className="absolute bottom-10 end-10 h-96 w-96 rounded-full bg-teal-200/20 blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-4 bg-emerald-100 text-emerald-700 border-emerald-200">
            <Sparkles className="h-3 w-3 me-1" />
            {t("heroTag")}
          </Badge>
          
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            {t("heroTitle")}
          </h1>
          
          <p className="mt-4 text-lg text-slate-600 sm:text-xl max-w-2xl mx-auto">
            {t("heroSubtitle")}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={`/${locale}/sport/auth?mode=register&role=trainee`}>
              <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-200/50 rounded-xl px-8">
                <Activity className="h-5 w-5 me-2" />
                {t("joinAsTrainee")}
              </Button>
            </Link>
            <Link href={`/${locale}/sport/auth?mode=register&role=coach`}>
              <Button size="lg" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl px-8">
                <Users className="h-5 w-5 me-2" />
                {t("joinAsCoach")}
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            {t("alreadyHaveAccount")}{" "}
            <Link href={`/${locale}/sport/auth`} className="text-emerald-600 font-medium hover:underline">
              {t("loginHere")}
            </Link>
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              {t("featuresTitle")}
            </h2>
            <p className="mt-2 text-slate-600">
              {t("featuresSubtitle")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={Brain}
              title={t("featureMedicalIntel")}
              description={t("featureMedicalIntelDesc")}
              color="emerald"
            />
            <FeatureCard
              icon={Apple}
              title={t("featureNutrition")}
              description={t("featureNutritionDesc")}
              color="green"
            />
            <FeatureCard
              icon={Activity}
              title={t("featureBioAge")}
              description={t("featureBioAgeDesc")}
              color="teal"
            />
            <FeatureCard
              icon={MapPin}
              title={t("featureGPS")}
              description={t("featureGPSDesc")}
              color="blue"
            />
            <FeatureCard
              icon={BookOpen}
              title={t("featureLessons")}
              description={t("featureLessonsDesc")}
              color="purple"
            />
            <FeatureCard
              icon={Shield}
              title={t("featureWADA")}
              description={t("featureWADADesc")}
              color="amber"
            />
          </div>
        </div>
      </section>

      {/* Dual-Entry Section */}
      <section className="px-4 py-12 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-emerald-50/30">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              {t("dualEntryTitle")}
            </h2>
            <p className="mt-2 text-slate-600">
              {t("dualEntrySubtitle")}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Trainee Card */}
            <Card className="relative overflow-hidden border-emerald-200 hover:shadow-xl hover:shadow-emerald-100/50 transition-all duration-300 group">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
              <CardContent className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                  <Activity className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{t("traineeCardTitle")}</h3>
                <p className="text-slate-600 text-sm mb-4">{t("traineeCardDesc")}</p>
                <ul className="space-y-2 text-sm text-slate-600 mb-6">
                  <li className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    {t("traineeFeature1")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    {t("traineeFeature2")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    {t("traineeFeature3")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    {t("traineeFeature4")}
                  </li>
                </ul>
                <Link href={`/${locale}/sport/auth?mode=register&role=trainee`}>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
                    {t("startAsTrainee")}
                    <ArrowRight className={`h-4 w-4 ms-2 ${isRtl ? "rotate-180" : ""}`} />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Coach Card */}
            <Card className="relative overflow-hidden border-blue-200 hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300 group">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
              <CardContent className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{t("coachCardTitle")}</h3>
                <p className="text-slate-600 text-sm mb-4">{t("coachCardDesc")}</p>
                <ul className="space-y-2 text-sm text-slate-600 mb-6">
                  <li className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    {t("coachFeature1")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    {t("coachFeature2")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    {t("coachFeature3")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    {t("coachFeature4")}
                  </li>
                </ul>
                <Link href={`/${locale}/sport/auth?mode=register&role=coach`}>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                    {t("startAsCoach")}
                    <ArrowRight className={`h-4 w-4 ms-2 ${isRtl ? "rotate-180" : ""}`} />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Subscription Tiers */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              {t("pricingTitle")}
            </h2>
            <p className="mt-2 text-slate-600">
              {t("pricingSubtitle")}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Free Tier */}
            <Card className="border-slate-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <Badge variant="secondary" className="mb-3">{t("tierFree")}</Badge>
                <h3 className="text-2xl font-bold text-slate-900">{t("tierFreePrice")}</h3>
                <p className="text-sm text-slate-500 mt-1 mb-4">{t("tierFreeDesc")}</p>
                <ul className="space-y-2 text-sm text-slate-600 text-start mb-6">
                  <li className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {t("tierFreeFeature1")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {t("tierFreeFeature2")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {t("tierFreeFeature3")}
                  </li>
                </ul>
                <Button variant="outline" className="w-full rounded-lg">
                  {t("getStarted")}
                </Button>
              </CardContent>
            </Card>

            {/* Pro Tier */}
            <Card className="border-emerald-300 ring-2 ring-emerald-100 hover:shadow-xl transition-shadow relative">
              <div className="absolute -top-3 inset-x-0 flex justify-center">
                <Badge className="bg-emerald-600 text-white">{t("mostPopular")}</Badge>
              </div>
              <CardContent className="p-6 text-center">
                <Badge variant="secondary" className="mb-3 bg-emerald-100 text-emerald-700">{t("tierPro")}</Badge>
                <h3 className="text-2xl font-bold text-slate-900">{t("tierProPrice")}</h3>
                <p className="text-sm text-slate-500 mt-1 mb-4">{t("tierProDesc")}</p>
                <ul className="space-y-2 text-sm text-slate-600 text-start mb-6">
                  <li className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    {t("tierProFeature1")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    {t("tierProFeature2")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    {t("tierProFeature3")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    {t("tierProFeature4")}
                  </li>
                </ul>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
                  {t("subscribePro")}
                </Button>
              </CardContent>
            </Card>

            {/* Elite Tier */}
            <Card className="border-blue-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <Badge variant="secondary" className="mb-3 bg-blue-100 text-blue-700">{t("tierElite")}</Badge>
                <h3 className="text-2xl font-bold text-slate-900">{t("tierElitePrice")}</h3>
                <p className="text-sm text-slate-500 mt-1 mb-4">{t("tierEliteDesc")}</p>
                <ul className="space-y-2 text-sm text-slate-600 text-start mb-6">
                  <li className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    {t("tierEliteFeature1")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    {t("tierEliteFeature2")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    {t("tierEliteFeature3")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    {t("tierEliteFeature4")}
                  </li>
                </ul>
                <Button variant="outline" className="w-full rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50">
                  {t("subscribeElite")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Feature Card Component
// ─────────────────────────────────────────────────────────────────

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-600",
    green: "bg-green-100 text-green-600",
    teal: "bg-teal-100 text-teal-600",
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    amber: "bg-amber-100 text-amber-600",
  };

  return (
    <Card className="border-slate-100 hover:shadow-md hover:border-emerald-100 transition-all duration-200 group">
      <CardContent className="p-5">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorMap[color]} mb-3 group-hover:scale-110 transition-transform`}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
        <p className="text-sm text-slate-600">{description}</p>
      </CardContent>
    </Card>
  );
}
