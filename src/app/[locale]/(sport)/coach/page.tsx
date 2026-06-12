"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Activity,
  BarChart3,
  Bell,
  Calendar,
  ChevronDown,
  ClipboardList,
  Dumbbell,
  FileText,
  FlaskConical,
  Heart,
  LineChart,
  MessageSquare,
  MoreHorizontal,
  Search,
  Shield,
  Star,
  TrendingUp,
  User,
  UserPlus,
  Users,
  Utensils,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

/**
 * MediSport Standalone — Coach Dashboard
 * 
 * Features:
 * - Client Management CRM (Overview of all trainees)
 * - Program Builder (Workouts & Nutrition)
 * - Progress Tracking & Analytics
 * - Medical Context Request (unique MediSport feature)
 */
export default function CoachDashboardPage() {
  const t = useTranslations("SportStandalone");
  const locale = useLocale();
  const isRtl = locale === "ar";

  // Mock data for demonstration
  const clients = [
    {
      id: "1",
      name: locale === "ar" ? "أحمد محمد" : "Ahmed Mohammed",
      goal: locale === "ar" ? "بناء عضلات" : "Muscle Building",
      adherence: 87,
      lastActive: "2h",
      status: "active" as const,
      plan: locale === "ar" ? "برنامج القوة المتقدم" : "Advanced Strength Program",
    },
    {
      id: "2",
      name: locale === "ar" ? "سارة العلي" : "Sara Al-Ali",
      goal: locale === "ar" ? "إنقاص الوزن" : "Weight Loss",
      adherence: 92,
      lastActive: "30m",
      status: "active" as const,
      plan: locale === "ar" ? "برنامج حرق الدهون" : "Fat Burn Program",
    },
    {
      id: "3",
      name: locale === "ar" ? "خالد الرشيدي" : "Khaled Al-Rashidi",
      goal: locale === "ar" ? "تحسين اللياقة" : "Improve Fitness",
      adherence: 65,
      lastActive: "1d",
      status: "needs_attention" as const,
      plan: locale === "ar" ? "برنامج اللياقة العامة" : "General Fitness Program",
    },
    {
      id: "4",
      name: locale === "ar" ? "نورة القحطاني" : "Noura Al-Qahtani",
      goal: locale === "ar" ? "تأهيل إصابة" : "Injury Rehab",
      adherence: 78,
      lastActive: "5h",
      status: "medical_review" as const,
      plan: locale === "ar" ? "برنامج التأهيل" : "Rehabilitation Program",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("coachDashboard")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("coachDashboardDesc")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-lg">
            <Bell className="h-4 w-4 me-1.5" />
            <span className="hidden sm:inline">{t("notifications")}</span>
            <Badge className="ms-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] p-0 flex items-center justify-center">3</Badge>
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            <UserPlus className="h-4 w-4 me-1.5" />
            {t("addClient")}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={Users}
          label={t("totalClients")}
          value="12"
          trend="+2"
          color="blue"
        />
        <StatCard
          icon={Activity}
          label={t("activeToday")}
          value="8"
          trend="+3"
          color="emerald"
        />
        <StatCard
          icon={TrendingUp}
          label={t("avgAdherence")}
          value="81%"
          trend="+5%"
          color="purple"
        />
        <StatCard
          icon={Star}
          label={t("avgRating")}
          value="4.8"
          trend="+0.2"
          color="amber"
        />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="clients" className="space-y-4">
        <TabsList className="bg-slate-100 rounded-lg p-1">
          <TabsTrigger value="clients" className="rounded-md text-sm">
            <Users className="h-4 w-4 me-1.5" />
            {t("clients")}
          </TabsTrigger>
          <TabsTrigger value="programs" className="rounded-md text-sm">
            <ClipboardList className="h-4 w-4 me-1.5" />
            {t("programs")}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-md text-sm">
            <BarChart3 className="h-4 w-4 me-1.5" />
            {t("analytics")}
          </TabsTrigger>
          <TabsTrigger value="medical" className="rounded-md text-sm">
            <FlaskConical className="h-4 w-4 me-1.5" />
            {t("medicalContext")}
          </TabsTrigger>
        </TabsList>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={t("searchClients")}
              className="ps-10 rounded-lg"
            />
          </div>

          {/* Client Cards */}
          <div className="grid gap-3">
            {clients.map((client) => (
              <Card key={client.id} className="border-slate-100 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900">{client.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500">{client.goal}</span>
                          <span className="text-xs text-slate-300">•</span>
                          <span className="text-xs text-slate-400">{client.plan}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-slate-700">{client.adherence}%</span>
                          <span className="text-xs text-slate-400">{t("adherence")}</span>
                        </div>
                        <Progress value={client.adherence} className="h-1.5 w-20 mt-1" />
                      </div>
                      <StatusBadge status={client.status} t={t} />
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Programs Tab */}
        <TabsContent value="programs" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">{t("programBuilder")}</h3>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
              <Zap className="h-4 w-4 me-1.5" />
              {t("createProgram")}
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ProgramCard
              icon={Dumbbell}
              title={locale === "ar" ? "برنامج القوة المتقدم" : "Advanced Strength Program"}
              clients={5}
              duration={locale === "ar" ? "١٢ أسبوع" : "12 weeks"}
              color="blue"
              t={t}
            />
            <ProgramCard
              icon={Activity}
              title={locale === "ar" ? "برنامج حرق الدهون" : "Fat Burn Program"}
              clients={4}
              duration={locale === "ar" ? "٨ أسابيع" : "8 weeks"}
              color="emerald"
              t={t}
            />
            <ProgramCard
              icon={Utensils}
              title={locale === "ar" ? "خطة التغذية المتوازنة" : "Balanced Nutrition Plan"}
              clients={8}
              duration={locale === "ar" ? "٤ أسابيع" : "4 weeks"}
              color="green"
              t={t}
            />
            <ProgramCard
              icon={Heart}
              title={locale === "ar" ? "برنامج التأهيل" : "Rehabilitation Program"}
              clients={2}
              duration={locale === "ar" ? "٦ أسابيع" : "6 weeks"}
              color="rose"
              t={t}
            />
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-slate-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <LineChart className="h-4 w-4 text-blue-500" />
                  {t("clientProgress")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-40 flex items-center justify-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
                  {t("chartPlaceholder")}
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-500" />
                  {t("adherenceOverview")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-40 flex items-center justify-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
                  {t("chartPlaceholder")}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Medical Context Tab */}
        <TabsContent value="medical" className="space-y-4">
          <Card className="border-blue-100 bg-blue-50/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{t("medicalContextTitle")}</h3>
                  <p className="text-sm text-slate-600 mt-1">{t("medicalContextDesc")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3">
            {/* Medical Context Request Cards */}
            <Card className="border-slate-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                      <FlaskConical className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-900">
                        {locale === "ar" ? "نورة القحطاني — تحاليل الدهون" : "Noura Al-Qahtani — Lipid Panel"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">{t("requestPending")}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700">{t("pending")}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-900">
                        {locale === "ar" ? "أحمد محمد — تاريخ الإصابات" : "Ahmed Mohammed — Injury History"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">{t("requestApproved")}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">{t("approved")}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Button variant="outline" className="w-full rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50">
            <FlaskConical className="h-4 w-4 me-2" />
            {t("requestMedicalData")}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  trend: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    emerald: "bg-emerald-100 text-emerald-600",
    purple: "bg-purple-100 text-purple-600",
    amber: "bg-amber-100 text-amber-600",
  };

  return (
    <Card className="border-slate-100">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${colorMap[color]}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="text-xl font-bold text-slate-900">{value}</div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs text-slate-500">{label}</span>
          <span className="text-xs font-medium text-emerald-600">{trend}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status, t }: { status: string; t: any }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: "bg-emerald-100", text: "text-emerald-700", label: t("statusActive") },
    needs_attention: { bg: "bg-amber-100", text: "text-amber-700", label: t("statusAttention") },
    medical_review: { bg: "bg-blue-100", text: "text-blue-700", label: t("statusMedical") },
  };
  const c = config[status] || config.active;
  return (
    <Badge variant="secondary" className={`${c.bg} ${c.text} text-[10px] hidden sm:inline-flex`}>
      {c.label}
    </Badge>
  );
}

function ProgramCard({
  icon: Icon,
  title,
  clients,
  duration,
  color,
  t,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  clients: number;
  duration: string;
  color: string;
  t: any;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    emerald: "bg-emerald-100 text-emerald-600",
    green: "bg-green-100 text-green-600",
    rose: "bg-rose-100 text-rose-600",
  };

  return (
    <Card className="border-slate-100 hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorMap[color]}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-medium text-slate-900 text-sm">{title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">{clients} {t("clientsCount")}</span>
                <span className="text-xs text-slate-300">•</span>
                <span className="text-xs text-slate-500">{duration}</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
