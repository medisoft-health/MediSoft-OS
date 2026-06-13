"use client";
import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Activity,
  BarChart3,
  ClipboardList,
  Dumbbell,
  FileText,
  FlaskConical,
  Heart,
  Loader2,
  MoreHorizontal,
  Search,
  Shield,
  ShieldCheck,
  Star,
  TrendingUp,
  UserPlus,
  Users,
  Utensils,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ClientsManager } from "@/components/sport/clients-manager";
import { CoachNotificationBell } from "@/components/sport/coach-notification-bell";
import { CoachVerificationForm } from "@/components/sport/coach-verification-form";
import { CoachRequestsPanel } from "@/components/sport/coach-requests-panel";
import { CoachAnalytics } from "@/components/sport/coach-analytics";

/**
 * MediSport Standalone — Coach Dashboard (v2.0 UI Upgrade)
 *
 * Key improvements:
 * - Stats overview fetches REAL data from coach-analytics API
 * - Clients list fetches from my-clients API
 * - Softer backgrounds, rounded-2xl cards, subtle shadows
 * - Improved spacing and micro-interactions
 * - Loading states with skeleton shimmer
 */
export default function CoachDashboardPage() {
  const t = useTranslations("SportStandalone");
  const locale = useLocale();

  // ── Real data: coach analytics (stats) ──
  const [stats, setStats] = React.useState<{
    totalClients: number;
    pendingRequests: number;
    ratingAvg: number;
    ratingCount: number;
    score: number;
    tier: string | null;
  } | null>(null);
  const [statsLoading, setStatsLoading] = React.useState(true);

  // ── Real data: clients list ──
  const [clients, setClients] = React.useState<Array<{
    linkId: string;
    status: string;
    notes: string | null;
    createdAt: string;
    traineeId: string;
    traineeName: string;
    traineeEmail: string;
  }>>([]);
  const [clientsLoading, setClientsLoading] = React.useState(true);

  React.useEffect(() => {
    // Fetch coach analytics for stats
    (async () => {
      try {
        const res = await fetch("/api/sport?action=coach-analytics", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const d = json.data;
            setStats({
              totalClients: (d.clients?.active ?? 0),
              pendingRequests: (d.clients?.pending ?? 0),
              ratingAvg: d.current?.ratingAvg ?? 0,
              ratingCount: d.current?.ratingCount ?? 0,
              score: d.current?.score ?? 0,
              tier: d.current?.tier ?? null,
            });
          }
        }
      } catch {}
      setStatsLoading(false);
    })();

    // Fetch real clients
    (async () => {
      try {
        const res = await fetch("/api/sport?action=my-clients", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setClients(json.data);
          }
        }
      } catch {}
      setClientsLoading(false);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 pb-28 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 ms-animate-in">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t("coachDashboard")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("coachDashboardDesc")}</p>
        </div>
        <div className="flex items-center gap-2">
          <CoachNotificationBell locale={locale as "ar" | "en"} />
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm shadow-blue-200/50 transition-all duration-200 hover:shadow-md">
            <UserPlus className="h-4 w-4 me-1.5" />
            {t("addClient")}
          </Button>
        </div>
      </div>

      {/* Stats Overview — Real data from API */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-8 ms-animate-in ms-animate-in-delay-1">
        <StatCard
          icon={Users}
          label={t("totalClients")}
          value={statsLoading ? "—" : String(stats?.totalClients ?? 0)}
          trend={stats?.pendingRequests ? `+${stats.pendingRequests} ${t("pending")}` : ""}
          color="blue"
          loading={statsLoading}
        />
        <StatCard
          icon={Activity}
          label={t("activeToday")}
          value={statsLoading ? "—" : String(clients.filter(c => c.status === "active").length)}
          trend=""
          color="emerald"
          loading={statsLoading}
        />
        <StatCard
          icon={TrendingUp}
          label={locale === "ar" ? "نقاط التوثيق" : "Verification Score"}
          value={statsLoading ? "—" : String(stats?.score ?? 0)}
          trend={stats?.tier ? `${stats.tier}` : ""}
          color="purple"
          loading={statsLoading}
        />
        <StatCard
          icon={Star}
          label={t("avgRating")}
          value={statsLoading ? "—" : (stats?.ratingAvg ? stats.ratingAvg.toFixed(1) : "—")}
          trend={stats?.ratingCount ? `(${stats.ratingCount})` : ""}
          color="amber"
          loading={statsLoading}
        />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="clients" className="space-y-5 ms-animate-in ms-animate-in-delay-2">
        <TabsList className="bg-slate-100/80 rounded-xl p-1 shadow-sm">
          <TabsTrigger value="clients" className="rounded-lg text-sm data-[state=active]:shadow-sm">
            <Users className="h-4 w-4 me-1.5" />
            {t("clients")}
          </TabsTrigger>
          <TabsTrigger value="programs" className="rounded-lg text-sm data-[state=active]:shadow-sm">
            <ClipboardList className="h-4 w-4 me-1.5" />
            {t("programs")}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-lg text-sm data-[state=active]:shadow-sm">
            <BarChart3 className="h-4 w-4 me-1.5" />
            {t("analytics")}
          </TabsTrigger>
          <TabsTrigger value="medical" className="rounded-lg text-sm data-[state=active]:shadow-sm">
            <FlaskConical className="h-4 w-4 me-1.5" />
            {t("medicalContext")}
          </TabsTrigger>
          <TabsTrigger value="verification" className="rounded-lg text-sm data-[state=active]:shadow-sm">
            <ShieldCheck className="h-4 w-4 me-1.5" />
            {locale === "ar" ? "التوثيق" : "Verification"}
          </TabsTrigger>
        </TabsList>

        {/* Clients Tab — Real data */}
        <TabsContent value="clients" className="space-y-4">
          {/* Incoming trainee connection requests (accept/decline) */}
          <CoachRequestsPanel locale={locale} />
          {/* Real DB-backed roster (mirrored with integrated module) */}
          <ClientsManager />

          {/* Real client list from API */}
          {clientsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : clients.length > 0 ? (
            <div className="grid gap-3">
              {clients.map((client) => (
                <Card key={client.linkId} className="border-0 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)] hover:shadow-[0_4px_6px_rgba(15,23,42,0.06),0_10px_24px_rgba(15,23,42,0.05)] transition-all duration-300 rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-semibold text-sm">
                          {client.traineeName?.charAt(0) || "?"}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-800 text-sm">{client.traineeName}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{client.traineeEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={`rounded-lg text-[10px] ${
                          client.status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {client.status === "active" ? t("statusActive") : client.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-0 shadow-[0_1px_3px_rgba(15,23,42,0.04)] rounded-2xl">
              <CardContent className="p-8 text-center">
                <Users className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  {locale === "ar" ? "لا يوجد متدربون مرتبطون بعد" : "No linked trainees yet"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Programs Tab */}
        <TabsContent value="programs" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">{t("programBuilder")}</h3>
            <Link href={`/${locale}/coach/program-builder`}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm shadow-blue-200/50 transition-all duration-200">
                <Zap className="h-4 w-4 me-1.5" />
                {t("createProgram")}
              </Button>
            </Link>
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
          <CoachAnalytics locale={locale as "ar" | "en"} />
        </TabsContent>

        {/* Verification Tab */}
        <TabsContent value="verification" className="space-y-4">
          <CoachVerificationForm />
        </TabsContent>

        {/* Medical Context Tab */}
        <TabsContent value="medical" className="space-y-4">
          <Card className="border-0 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)] bg-blue-50/40 rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100/80 text-blue-600">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{t("medicalContextTitle")}</h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{t("medicalContextDesc")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-3">
            {/* Medical Context Request Cards */}
            <Card className="border-0 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)] rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <FlaskConical className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-800">
                        {locale === "ar" ? "نورة القحطاني — تحاليل الدهون" : "Noura Al-Qahtani — Lipid Panel"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">{t("requestPending")}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-amber-50 text-amber-700 rounded-lg">{t("pending")}</Badge>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)] rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-800">
                        {locale === "ar" ? "أحمد محمد — تاريخ الإصابات" : "Ahmed Mohammed — Injury History"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">{t("requestApproved")}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 rounded-lg">{t("approved")}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
          <Button variant="outline" className="w-full rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50 transition-all duration-200">
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
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  trend: string;
  color: string;
  loading?: boolean;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    purple: "bg-purple-50 text-purple-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <Card className="border-0 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)] rounded-2xl">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${colorMap[color]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        {loading ? (
          <div className="h-7 w-16 ms-skeleton mb-1" />
        ) : (
          <div className="text-xl font-bold text-slate-800 ms-stat-value">{value}</div>
        )}
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-slate-500">{label}</span>
          {trend && <span className="text-[10px] font-medium text-emerald-600">{trend}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: "bg-emerald-50", text: "text-emerald-700", label: t("statusActive") },
    needs_attention: { bg: "bg-amber-50", text: "text-amber-700", label: t("statusAttention") },
    medical_review: { bg: "bg-blue-50", text: "text-blue-700", label: t("statusMedical") },
  };
  const c = config[status] || config.active;
  return (
    <Badge variant="secondary" className={`${c.bg} ${c.text} text-[10px] rounded-lg hidden sm:inline-flex`}>
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
  t: (key: string) => string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    green: "bg-green-50 text-green-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <Card className="border-0 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)] hover:shadow-[0_4px_6px_rgba(15,23,42,0.06),0_10px_24px_rgba(15,23,42,0.05)] transition-all duration-300 cursor-pointer rounded-2xl">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[color]}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 text-sm">{title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">{clients} {t("clientsCount")}</span>
                <span className="text-xs text-slate-300">•</span>
                <span className="text-xs text-slate-500">{duration}</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
