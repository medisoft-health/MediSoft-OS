"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Activity,
  Apple,
  ArrowRight,
  BookOpen,
  Brain,
  MapPin,
  Shield,
  Sparkles,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/auth-client";

/**
 * MediSport Standalone — Landing Page
 * 
 * The world's first Clinical Fitness Coaching platform.
 * Showcases the dual-entry model (Coach/Trainee) and key features.
 *
 * ENCLOSED EXPERIENCE: If user is already logged in, redirect them
 * to their private dashboard immediately. The public landing page
 * is only for unauthenticated visitors.
 */
export default function SportLandingPage() {
  const t = useTranslations("SportStandalone");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const router = useRouter();
  const { data: session, isPending } = useSession();

  // Enclosed experience: redirect logged-in users to their private world
  React.useEffect(() => {
    if (!isPending && session?.user) {
      router.replace(`/${locale}/trainee`);
    }
  }, [session, isPending, locale, router]);

  return (
    <div className="flex flex-col pb-20 md:pb-0">
      {/* Hero Section — Slate 900 with brand radial glows (brand guide) */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28 lg:px-8 bg-slate-900">
        <div className="absolute inset-0 -z-0">
          <div className="absolute top-[-10%] end-[8%] h-[36rem] w-[36rem] rounded-full bg-[var(--color-sport-500)]/30 blur-3xl" />
          <div className="absolute bottom-[-15%] start-[6%] h-[28rem] w-[28rem] rounded-full bg-[var(--color-energy-500)]/18 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <span className="ms-grad-brand mb-5 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold text-white shadow-lg">
            <Sparkles className="h-3.5 w-3.5" />
            {t("heroTag")}
          </span>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {t("heroTitle")}
          </h1>

          <p className="mt-5 text-lg text-slate-300 sm:text-xl max-w-2xl mx-auto">
            {t("heroSubtitle")}
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={`/${locale}/auth?mode=register&role=trainee`}>
              <Button size="lg" className="ms-glide ms-grad-brand text-white shadow-lg shadow-[var(--color-sport-500)]/30 rounded-xl px-8 hover:brightness-105">
                <Activity className="h-5 w-5 me-2" />
                {t("joinAsTrainee")}
              </Button>
            </Link>
            <Link href={`/${locale}/auth?mode=register&role=coach`}>
              <Button size="lg" variant="outline" className="ms-glide rounded-xl px-8 border-white/25 bg-white/5 text-white hover:bg-white/10">
                <Users className="h-5 w-5 me-2" />
                {t("joinAsCoach")}
              </Button>
            </Link>
          </div>

          <p className="mt-5 text-sm text-slate-400">
            {t("alreadyHaveAccount")}{" "}
            <Link href={`/${locale}/auth`} className="font-semibold text-[var(--color-sport-400)] hover:underline">
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
      <section className="px-4 py-12 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-[var(--color-sport-50)]">
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
            <Card className="ms-glide relative overflow-hidden border-[var(--color-sport-300)] hover:shadow-xl hover:shadow-[var(--color-sport-100)] transition-all duration-300 group">
              <div className="absolute top-0 inset-x-0 h-1 ms-grad-brand" />
              <CardContent className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-sport-100)] text-[var(--color-sport-600)] mb-4 group-hover:scale-110 transition-transform">
                  <Activity className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{t("traineeCardTitle")}</h3>
                <p className="text-slate-600 text-sm mb-4">{t("traineeCardDesc")}</p>
                <ul className="space-y-2 text-sm text-slate-600 mb-6">
                  <li className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-[var(--color-sport-500)] shrink-0" />
                    {t("traineeFeature1")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-[var(--color-sport-500)] shrink-0" />
                    {t("traineeFeature2")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-[var(--color-sport-500)] shrink-0" />
                    {t("traineeFeature3")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-[var(--color-sport-500)] shrink-0" />
                    {t("traineeFeature4")}
                  </li>
                </ul>
                <Link href={`/${locale}/auth?mode=register&role=trainee`}>
                  <Button className="ms-glide w-full bg-[var(--color-sport-600)] hover:bg-[var(--color-sport-700)] text-white rounded-lg">
                    {t("startAsTrainee")}
                    <ArrowRight className={`h-4 w-4 ms-2 ${isRtl ? "rotate-180" : ""}`} />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Coach Card */}
            <Card className="ms-glide relative overflow-hidden border-[var(--color-coach-300)] hover:shadow-xl hover:shadow-[var(--color-coach-100)] transition-all duration-300 group">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[var(--color-coach-500)] to-[var(--color-coach-700)]" />
              <CardContent className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-coach-100)] text-[var(--color-coach-500)] mb-4 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{t("coachCardTitle")}</h3>
                <p className="text-slate-600 text-sm mb-4">{t("coachCardDesc")}</p>
                <ul className="space-y-2 text-sm text-slate-600 mb-6">
                  <li className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-[var(--color-coach-500)] shrink-0" />
                    {t("coachFeature1")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-[var(--color-coach-500)] shrink-0" />
                    {t("coachFeature2")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-[var(--color-coach-500)] shrink-0" />
                    {t("coachFeature3")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-[var(--color-coach-500)] shrink-0" />
                    {t("coachFeature4")}
                  </li>
                </ul>
                <Link href={`/${locale}/auth?mode=register&role=coach`}>
                  <Button className="ms-glide w-full bg-[var(--color-coach-500)] hover:bg-[var(--color-coach-600)] text-white rounded-lg">
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
            <Card className="border-[var(--color-sport-300)] ring-2 ring-[var(--color-sport-100)] hover:shadow-xl transition-shadow relative">
              <div className="absolute -top-3 inset-x-0 flex justify-center">
                <Badge className="bg-[var(--color-sport-600)] text-white">{t("mostPopular")}</Badge>
              </div>
              <CardContent className="p-6 text-center">
                <Badge variant="secondary" className="mb-3 bg-[var(--color-sport-100)] text-[var(--color-sport-700)]">{t("tierPro")}</Badge>
                <h3 className="text-2xl font-bold text-slate-900">{t("tierProPrice")}</h3>
                <p className="text-sm text-slate-500 mt-1 mb-4">{t("tierProDesc")}</p>
                <ul className="space-y-2 text-sm text-slate-600 text-start mb-6">
                  <li className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-[var(--color-sport-500)] shrink-0" />
                    {t("tierProFeature1")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-[var(--color-sport-500)] shrink-0" />
                    {t("tierProFeature2")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-[var(--color-sport-500)] shrink-0" />
                    {t("tierProFeature3")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-[var(--color-sport-500)] shrink-0" />
                    {t("tierProFeature4")}
                  </li>
                </ul>
                <Button className="ms-glide w-full bg-[var(--color-sport-600)] hover:bg-[var(--color-sport-700)] text-white rounded-lg">
                  {t("subscribePro")}
                </Button>
              </CardContent>
            </Card>

            {/* Elite Tier */}
            <Card className="border-[var(--color-coach-300)] hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <Badge variant="secondary" className="mb-3 bg-[var(--color-coach-100)] text-[var(--color-coach-600)]">{t("tierElite")}</Badge>
                <h3 className="text-2xl font-bold text-slate-900">{t("tierElitePrice")}</h3>
                <p className="text-sm text-slate-500 mt-1 mb-4">{t("tierEliteDesc")}</p>
                <ul className="space-y-2 text-sm text-slate-600 text-start mb-6">
                  <li className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-[var(--color-coach-500)] shrink-0" />
                    {t("tierEliteFeature1")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-[var(--color-coach-500)] shrink-0" />
                    {t("tierEliteFeature2")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-[var(--color-coach-500)] shrink-0" />
                    {t("tierEliteFeature3")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-[var(--color-coach-500)] shrink-0" />
                    {t("tierEliteFeature4")}
                  </li>
                </ul>
                <Button variant="outline" className="ms-glide w-full rounded-lg border-[var(--color-coach-300)] text-[var(--color-coach-600)] hover:bg-[var(--color-coach-100)]">
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
    emerald: "bg-[var(--color-sport-100)] text-[var(--color-sport-600)]",
    green: "bg-[var(--color-sport-100)] text-[var(--color-sport-700)]",
    teal: "bg-[var(--color-sport-100)] text-[var(--color-sport-500)]",
    blue: "bg-[var(--color-coach-100)] text-[var(--color-coach-500)]",
    purple: "bg-[var(--color-energy-100)] text-[var(--color-energy-600)]",
    amber: "bg-amber-100 text-amber-600",
  };

  return (
    <Card className="ms-glide border-slate-100 hover:shadow-md hover:border-[var(--color-sport-100)] transition-all duration-200 group">
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
