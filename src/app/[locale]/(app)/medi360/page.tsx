"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  FileText,
  Heart,
  Loader2,
  Search,
  Shield,
  TrendingUp,
  Users,
  UserCircle,
  Sparkles,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  PatientContextProvider,
  usePatientContext,
  type SelectedPatient,
} from "@/components/patient-context/patient-context-provider";
import { Patient360Record } from "@/components/patient-context/patient-360-record";
import { PatientSelfReport } from "@/components/patient-context/patient-self-report";

// ═══════════════════════════════════════════════════════════════════════════════
// Medi360 — Universal Patient Profile (Standalone Page)
// ═══════════════════════════════════════════════════════════════════════════════

export default function Medi360Page() {
  return (
    <PatientContextProvider>
      <Medi360Content />
    </PatientContextProvider>
  );
}

function Medi360Content() {
  const { patient, mode } = usePatientContext();
  const [activeView, setActiveView] = React.useState<"dashboard" | "record" | "self-report">("dashboard");

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pb-12 sm:px-6 lg:px-8">
      {/* Header with Medi360 branding */}
      <Medi360Header />

      {/* Patient Selector */}
      {!patient && <PatientSearchPanel />}

      {/* Main content */}
      {patient ? (
        <div className="space-y-6">
          {/* Patient banner */}
          <PatientBanner />

          {/* Navigation tabs */}
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as typeof activeView)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dashboard">
                <BarChart3 className="size-4 me-2" />
                لوحة المعلومات
              </TabsTrigger>
              <TabsTrigger value="record">
                <Brain className="size-4 me-2" />
                السجل 360°
              </TabsTrigger>
              <TabsTrigger value="self-report">
                <UserCircle className="size-4 me-2" />
                التسجيل الذاتي
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <Medi360Dashboard />
            </TabsContent>

            <TabsContent value="record">
              <Patient360Record />
            </TabsContent>

            <TabsContent value="self-report">
              <PatientSelfReport />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <Medi360Landing />
      )}
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Medi360Header() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Image
          src="/images/medi360-icon.png"
          alt="Medi360"
          width={40}
          height={40}
          className="rounded-lg"
        />
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--color-foreground)]">
            Medi360
          </h1>
          <p className="text-sm text-[color:var(--color-muted-foreground)]">
            السجل الطبي الشامل — Universal Patient Profile
          </p>
        </div>
      </div>
      <Image
        src="/images/medi360-logo.png"
        alt="Medi360"
        width={140}
        height={40}
        className="hidden md:block"
      />
    </div>
  );
}

// ─── Patient Search Panel ────────────────────────────────────────────────────

function PatientSearchPanel() {
  const { selectPatient } = usePatientContext();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SelectedPatient[]>([]);
  const [loading, setLoading] = React.useState(false);

  const handleSearch = React.useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.patients ?? []);
      }
    } catch {
      toast.error("خطأ في البحث");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => handleSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="size-5" />
          اختر مريضاً لعرض السجل الشامل
        </CardTitle>
        <CardDescription>
          ابحث بالاسم أو رقم الملف الطبي أو رقم الهوية
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-[color:var(--color-muted-foreground)]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن مريض..."
            className="ps-10"
          />
          {loading && (
            <Loader2 className="absolute end-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-[color:var(--color-muted-foreground)]" />
          )}
        </div>

        {results.length > 0 && (
          <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border divide-y">
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() => selectPatient(p)}
                className="flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-[color:var(--color-accent)] transition-colors"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] font-bold text-sm">
                  {p.firstNameAr?.[0] ?? p.firstName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {p.firstNameAr && p.lastNameAr
                      ? `${p.firstNameAr} ${p.lastNameAr}`
                      : `${p.firstName} ${p.lastName}`}
                  </p>
                  <p className="text-xs text-[color:var(--color-muted-foreground)]">
                    {p.mrn && `MRN: ${p.mrn} · `}{p.age} سنة · {p.sex === "male" ? "ذكر" : "أنثى"}
                  </p>
                </div>
                <ArrowRight className="size-4 text-[color:var(--color-muted-foreground)]" />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Patient Banner ──────────────────────────────────────────────────────────

function PatientBanner() {
  const { patient, clearPatient, getDisplayName } = usePatientContext();
  if (!patient) return null;

  return (
    <Card className="border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary)]/5">
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-[color:var(--color-primary)] text-white font-bold text-lg">
            {patient.firstNameAr?.[0] ?? patient.firstName[0]}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{getDisplayName()}</h3>
            <div className="flex items-center gap-3 text-sm text-[color:var(--color-muted-foreground)]">
              {patient.mrn && <span>MRN: {patient.mrn}</span>}
              <span>{patient.age} سنة</span>
              <span>{patient.sex === "male" ? "ذكر" : "أنثى"}</span>
              {patient.bloodType && patient.bloodType !== "unknown" && (
                <Badge variant="outline">{patient.bloodType}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/ar/patients/${patient.id}?tab=patient360`}>
            <Button variant="outline" size="sm">
              <FileText className="size-4 me-1" />
              الملف الكامل
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={clearPatient}>
            تغيير المريض
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Medi360 Dashboard (Quick Overview) ──────────────────────────────────────

function Medi360Dashboard() {
  const { patient } = usePatientContext();
  const [stats, setStats] = React.useState<{
    healthScore: number;
    activeAlerts: number;
    riskLevel: string;
    lastVisit: string;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!patient) return;
    setLoading(true);
    fetch(`/api/patient-360?patientId=${patient.id}&action=summary`)
      .then((r) => r.json())
      .then((data) => {
        setStats({
          healthScore: data.healthScore ?? 75,
          activeAlerts: data.alerts?.length ?? 0,
          riskLevel: data.riskLevel ?? "منخفض",
          lastVisit: data.lastVisit ?? "غير متوفر",
        });
      })
      .catch(() => {
        setStats({
          healthScore: 75,
          activeAlerts: 0,
          riskLevel: "منخفض",
          lastVisit: "غير متوفر",
        });
      })
      .finally(() => setLoading(false));
  }, [patient]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-[color:var(--color-primary)]" />
        <span className="ms-3 text-[color:var(--color-muted-foreground)]">جارٍ تحليل البيانات...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
              <Heart className="size-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.healthScore ?? "—"}</p>
              <p className="text-xs text-[color:var(--color-muted-foreground)]">درجة الصحة</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="size-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.activeAlerts ?? 0}</p>
              <p className="text-xs text-[color:var(--color-muted-foreground)]">تنبيهات نشطة</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Shield className="size-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.riskLevel ?? "—"}</p>
              <p className="text-xs text-[color:var(--color-muted-foreground)]">مستوى المخاطر</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
              <Activity className="size-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.lastVisit ?? "—"}</p>
              <p className="text-xs text-[color:var(--color-muted-foreground)]">آخر زيارة</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href={`/ar/patients/${patient?.id}?tab=patient360`}>
              <Button variant="outline" className="w-full h-auto flex-col gap-2 py-4">
                <Brain className="size-6 text-[color:var(--color-primary)]" />
                <span>الملخص الذكي</span>
              </Button>
            </Link>
            <Link href={`/ar/patients/${patient?.id}?tab=vitals`}>
              <Button variant="outline" className="w-full h-auto flex-col gap-2 py-4">
                <TrendingUp className="size-6 text-green-600" />
                <span>العلامات الحيوية</span>
              </Button>
            </Link>
            <Link href={`/ar/medilab/${patient?.id}`}>
              <Button variant="outline" className="w-full h-auto flex-col gap-2 py-4">
                <ClipboardList className="size-6 text-blue-600" />
                <span>نتائج المختبر</span>
              </Button>
            </Link>
            <Link href={`/ar/mediscan`}>
              <Button variant="outline" className="w-full h-auto flex-col gap-2 py-4">
                <Sparkles className="size-6 text-purple-600" />
                <span>الأشعة والصور</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Patient Info Summary */}
      {patient && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Allergies */}
          {patient.allergies && patient.allergies.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="size-4 text-red-500" />
                  الحساسيات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {patient.allergies.map((a, i) => (
                    <Badge key={i} variant="destructive" className="text-xs">
                      {a.substance}
                      {a.severity && ` (${a.severity})`}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chronic Conditions */}
          {patient.chronicConditions && patient.chronicConditions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="size-4 text-amber-500" />
                  الأمراض المزمنة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {patient.chronicConditions.map((c, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {c.description}
                      {c.icdCode && ` [${c.icdCode}]`}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Landing Page (No Patient Selected) ──────────────────────────────────────

function Medi360Landing() {
  return (
    <div className="space-y-8">
      {/* Hero section */}
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Image
            src="/images/medi360-logo.png"
            alt="Medi360"
            width={280}
            height={80}
            className="mb-6"
          />
          <h2 className="text-2xl font-bold mb-2">السجل الطبي الشامل</h2>
          <p className="text-[color:var(--color-muted-foreground)] max-w-lg">
            منصة الملف الطبي الموحد — تجمع كل بيانات المريض في مكان واحد مع تحليل ذكي
            وتنبيهات استباقية ورؤى قابلة للتنفيذ
          </p>
          <p className="text-sm text-[color:var(--color-muted-foreground)] mt-2" dir="ltr">
            Universal Patient Profile — Comprehensive Data Synthesis, Outcome Improvement, Workflow Optimization
          </p>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          icon={<Brain className="size-6 text-[color:var(--color-primary)]" />}
          title="الملخص الذكي"
          titleEn="AI Executive Summary"
          description="ملخص شامل للحالة الصحية مع درجة الصحة والتوصيات"
        />
        <FeatureCard
          icon={<TrendingUp className="size-6 text-green-600" />}
          title="تحليل الاتجاهات"
          titleEn="Trend Analysis"
          description="رسوم بيانية تفاعلية لمتابعة تطور المؤشرات الحيوية والمخبرية"
        />
        <FeatureCard
          icon={<BarChart3 className="size-6 text-blue-600" />}
          title="مقارنة النتائج"
          titleEn="Lab Comparison"
          description="مقارنة ذكية بين نتائج التحاليل القديمة والجديدة"
        />
        <FeatureCard
          icon={<Shield className="size-6 text-amber-600" />}
          title="التنبؤ بالمخاطر"
          titleEn="Risk Prediction"
          description="محرك تنبؤ يكتشف المخاطر المحتملة قبل حدوثها"
        />
        <FeatureCard
          icon={<AlertTriangle className="size-6 text-red-600" />}
          title="التنبيهات الذكية"
          titleEn="Smart Alerts"
          description="تنبيهات فورية للقيم الحرجة وتفاعلات الأدوية"
        />
        <FeatureCard
          icon={<Sparkles className="size-6 text-purple-600" />}
          title="الذكاء التراكمي"
          titleEn="Cumulative Intelligence"
          description="أنماط مخفية واستنتاجات من تاريخ المريض الكامل"
        />
      </div>

      {/* Recent patients quick access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            ابدأ باختيار مريض من القائمة أعلاه
          </CardTitle>
          <CardDescription>
            أو انتقل إلى صفحة المرضى لاختيار مريض محدد
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/ar/patients">
            <Button>
              <Users className="size-4 me-2" />
              عرض قائمة المرضى
              <ArrowRight className="size-4 ms-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Feature Card ────────────────────────────────────────────────────────────

function FeatureCard({
  icon,
  title,
  titleEn,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  titleEn: string;
  description: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="flex flex-col gap-3 py-5">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="font-semibold text-sm">{title}</p>
            <p className="text-xs text-[color:var(--color-muted-foreground)]">{titleEn}</p>
          </div>
        </div>
        <p className="text-sm text-[color:var(--color-muted-foreground)]">{description}</p>
      </CardContent>
    </Card>
  );
}
