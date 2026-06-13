"use client";
import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Bot,
  Crown,
  Sparkles,
  Star,
  Users,
  Zap,
  CheckCircle2,
  Shield,
  TrendingUp,
  Clock,
  Dumbbell,
  Heart,
  Apple,
} from "lucide-react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CoachDirectory } from "@/components/sport/coach-directory";

/**
 * MediSport Standalone — Coach Marketplace
 *
 * Two sections:
 * 1. Virtual MediSport Coach (always available, no subscription needed for basic)
 * 2. Real Coaches Directory (verified coaches with ratings)
 *
 * The trainee can choose between the virtual coach (MediSport's built-in
 * nutrition/training engine) or browse and request a real human coach.
 */
export default function TraineeCoachesPage() {
  const locale = useLocale() as "ar" | "en";
  const isAr = locale === "ar";
  const [tab, setTab] = React.useState<"marketplace" | "directory">("marketplace");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/${locale}/trainee`}>
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg shadow-emerald-200/30">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isAr ? "سوق المدربين" : "Coach Marketplace"}
            </h1>
            <p className="text-sm text-slate-500">
              {isAr
                ? "اختر مدربك المثالي — افتراضي أو حقيقي"
                : "Choose your ideal coach — virtual or real"}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="mb-6 flex gap-2 p-1 bg-slate-100 rounded-xl">
        <button
          onClick={() => setTab("marketplace")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            tab === "marketplace"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {isAr ? "نظرة عامة" : "Overview"}
        </button>
        <button
          onClick={() => setTab("directory")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            tab === "directory"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {isAr ? "المدربون الحقيقيون" : "Real Coaches"}
        </button>
      </div>

      {tab === "marketplace" ? (
        <div className="space-y-6">
          {/* Virtual MediSport Coach Card */}
          <Card className="border-0 shadow-[0_4px_20px_rgba(16,185,129,0.12)] rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 start-0 end-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200/40 shrink-0">
                  <Sparkles className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-slate-900">
                      {isAr ? "مدرب MediSport" : "MediSport Coach"}
                    </h3>
                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px] rounded-full">
                      {isAr ? "متاح دائماً" : "Always Available"}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    {isAr
                      ? "مدربك الشخصي المبني على أحدث المعايير العلمية في التغذية والتدريب الرياضي."
                      : "Your personal coach built on the latest scientific standards in nutrition and sports training."}
                  </p>
                </div>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  {
                    icon: Apple,
                    label: isAr ? "خطة تغذية مخصصة" : "Custom Nutrition Plan",
                    color: "text-green-600 bg-green-50",
                  },
                  {
                    icon: Dumbbell,
                    label: isAr ? "برامج تدريبية" : "Training Programs",
                    color: "text-blue-600 bg-blue-50",
                  },
                  {
                    icon: TrendingUp,
                    label: isAr ? "تتبع التقدم" : "Progress Tracking",
                    color: "text-purple-600 bg-purple-50",
                  },
                  {
                    icon: Clock,
                    label: isAr ? "متاح ٢٤/٧" : "Available 24/7",
                    color: "text-amber-600 bg-amber-50",
                  },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50/80">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${f.color}`}>
                      <f.icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium text-slate-700">{f.label}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Link href={`/${locale}/trainee/coach`}>
                <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl h-12 shadow-lg shadow-emerald-200/30 transition-all duration-200 gap-2">
                  <Sparkles className="h-4 w-4" />
                  {isAr ? "ابدأ مع مدرب MediSport" : "Start with MediSport Coach"}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {isAr ? "أو" : "OR"}
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Real Coaches Promo */}
          <Card className="border-0 shadow-[0_2px_12px_rgba(15,23,42,0.06)] rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200/40 shrink-0">
                  <Shield className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-slate-900">
                      {isAr ? "مدربون حقيقيون معتمدون" : "Verified Real Coaches"}
                    </h3>
                    <Badge className="bg-blue-100 text-blue-700 text-[10px] rounded-full">
                      <Crown className="h-3 w-3 me-0.5" />
                      {isAr ? "بشري" : "Human"}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    {isAr
                      ? "مدربون محترفون تم اعتمادهم من MediSport — خبرة حقيقية ومتابعة شخصية."
                      : "Professional coaches verified by MediSport — real expertise and personal follow-up."}
                  </p>
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-2.5 mb-5">
                {[
                  { icon: CheckCircle2, text: isAr ? "متابعة شخصية أسبوعية" : "Weekly personal follow-up" },
                  { icon: CheckCircle2, text: isAr ? "برامج مخصصة لحالتك" : "Programs tailored to your case" },
                  { icon: CheckCircle2, text: isAr ? "تواصل مباشر مع المدرب" : "Direct communication with coach" },
                  { icon: CheckCircle2, text: isAr ? "شهادات معتمدة دولياً" : "Internationally certified" },
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
                    <b.icon className="h-4 w-4 text-blue-500 shrink-0" />
                    <span>{b.text}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Button
                onClick={() => setTab("directory")}
                variant="outline"
                className="w-full rounded-xl h-12 border-blue-200 text-blue-700 hover:bg-blue-50 transition-all duration-200 gap-2"
              >
                <Users className="h-4 w-4" />
                {isAr ? "تصفح المدربين المعتمدين" : "Browse Verified Coaches"}
              </Button>
            </CardContent>
          </Card>

          {/* Comparison Table */}
          <Card className="border-0 shadow-[0_2px_8px_rgba(15,23,42,0.04)] rounded-2xl">
            <CardContent className="p-5">
              <h4 className="text-sm font-bold text-slate-800 mb-4 text-center">
                {isAr ? "مقارنة سريعة" : "Quick Comparison"}
              </h4>
              <div className="overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="p-3 text-start text-slate-500 font-medium">
                        {isAr ? "الميزة" : "Feature"}
                      </th>
                      <th className="p-3 text-center text-emerald-700 font-medium">
                        <Sparkles className="h-3 w-3 inline me-1" />
                        MediSport
                      </th>
                      <th className="p-3 text-center text-blue-700 font-medium">
                        <Shield className="h-3 w-3 inline me-1" />
                        {isAr ? "حقيقي" : "Real"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { feature: isAr ? "خطة تغذية" : "Nutrition Plan", virtual: true, real: true },
                      { feature: isAr ? "برنامج تدريبي" : "Training Program", virtual: true, real: true },
                      { feature: isAr ? "متاح ٢٤/٧" : "24/7 Available", virtual: true, real: false },
                      { feature: isAr ? "متابعة شخصية" : "Personal Follow-up", virtual: false, real: true },
                      { feature: isAr ? "تعديل فوري" : "Instant Adjustment", virtual: true, real: false },
                      { feature: isAr ? "خبرة بشرية" : "Human Expertise", virtual: false, real: true },
                      { feature: isAr ? "التكلفة" : "Cost", virtual: isAr ? "مجاني" : "Free", real: isAr ? "حسب المدرب" : "Per Coach" },
                    ].map((row, i) => (
                      <tr key={i}>
                        <td className="p-3 text-slate-700 font-medium">{row.feature}</td>
                        <td className="p-3 text-center">
                          {typeof row.virtual === "boolean" ? (
                            row.virtual ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                            ) : (
                              <span className="text-slate-300">—</span>
                            )
                          ) : (
                            <span className="text-emerald-600 font-medium">{row.virtual}</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {typeof row.real === "boolean" ? (
                            row.real ? (
                              <CheckCircle2 className="h-4 w-4 text-blue-500 mx-auto" />
                            ) : (
                              <span className="text-slate-300">—</span>
                            )
                          ) : (
                            <span className="text-blue-600 font-medium">{row.real}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Real Coaches Directory Tab */
        <CoachDirectory locale={locale} />
      )}
    </div>
  );
}
