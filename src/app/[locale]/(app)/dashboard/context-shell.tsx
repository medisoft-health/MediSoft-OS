"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Activity,
  ArrowRight,
  Calendar,
  Pill,
  TrendingUp,
  Users,
  Heart,
  Thermometer,
  Droplets,
  Wind,
  AlertTriangle,
  FlaskConical,
  ScanLine,
  Dumbbell,

} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAdaptiveContext } from "@/components/ui/adaptive-context";
import type { DashboardStats, RecentActivityItem, TodayEncounterItem } from "@/lib/queries/dashboard";
import { formatPatientId, getInitials } from "@/lib/utils";


// ─────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────

interface DashboardContextShellProps {
  stats: DashboardStats;
  todayEncounters: TodayEncounterItem[];
  recentActivity: RecentActivityItem[];
}

// ─────────────────────────────────────────────────────────────────
//  Emergency Vitals Demo Data
// ─────────────────────────────────────────────────────────────────

const emergencyVitals = [
  { label: "Heart Rate", value: "112", unit: "bpm", status: "high" as const, icon: Heart },
  { label: "Blood Pressure", value: "165/95", unit: "mmHg", status: "critical" as const, icon: Activity },
  { label: "Temperature", value: "38.7", unit: "°C", status: "high" as const, icon: Thermometer },
  { label: "SpO2", value: "94", unit: "%", status: "borderline" as const, icon: Droplets },
  { label: "Resp Rate", value: "24", unit: "/min", status: "high" as const, icon: Wind },
];

const statusStyles = {
  normal: "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30",
  borderline: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
  high: "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30",
  critical: "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/30 shadow-lg shadow-red-100 dark:shadow-red-900/20",
};

const statusTextStyles = {
  normal: "text-emerald-700 dark:text-emerald-300",
  borderline: "text-amber-700 dark:text-amber-300",
  high: "text-orange-700 dark:text-orange-300",
  critical: "text-red-700 dark:text-red-300",
};

// ─────────────────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────────────────

export function DashboardContextShell({
  stats,
  todayEncounters,
  recentActivity,
}: DashboardContextShellProps) {
  const { context } = useAdaptiveContext();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      {/* ─────────── Emergency Banner ─────────── */}
      {context === "emergency" && (
        <div className={cn(
          "rounded-2xl border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 p-5",
          "transition-all duration-500",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
              <AlertTriangle className="size-5 text-red-600 dark:text-red-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-800 dark:text-red-200">
                Emergency Mode Active
              </h3>
              <p className="text-xs text-red-600 dark:text-red-400">
                Critical vitals and allergies are prominently displayed. Quick actions prioritized.
              </p>
            </div>
          </div>

          {/* Vitals Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {emergencyVitals.map((vital, i) => {
              const Icon = vital.icon;
              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl p-3 border-2 transition-all duration-300",
                    statusStyles[vital.status],
                    mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
                  )}
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon className={cn("size-3.5", statusTextStyles[vital.status])} />
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {vital.label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={cn("text-2xl font-black tabular-nums", statusTextStyles[vital.status])}>
                      {vital.value}
                    </span>
                    <span className="text-[10px] text-slate-400">{vital.unit}</span>
                  </div>
                  <span className={cn(
                    "mt-1 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                    vital.status === "critical" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                    vital.status === "high" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  )}>
                    {vital.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────── Sport Mode Banner ─────────── */}
      {context === "sport" && (
        <div className={cn(
          "rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-5",
          "transition-all duration-500",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
              <Dumbbell className="size-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-indigo-800 dark:text-indigo-200">
                Sports Medicine Mode
              </h3>
              <p className="text-xs text-indigo-600 dark:text-indigo-400">
                Performance metrics, body composition, and injury tracking prioritized.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── Radiology Mode Banner ─────────── */}
      {context === "radiology" && (
        <div className={cn(
          "rounded-2xl border border-slate-600 dark:border-slate-500 bg-slate-900 dark:bg-slate-950 p-5",
          "transition-all duration-500",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-slate-800 flex items-center justify-center">
              <ScanLine className="size-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Radiology Mode
              </h3>
              <p className="text-xs text-slate-400">
                Dark mode optimized for medical imaging. High contrast for DICOM viewing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── Greeting ─────────── */}
      <div className={cn(
        "flex flex-wrap items-end justify-between gap-3 transition-all duration-500",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}>
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
            Today
          </div>
          <h1 className="mt-1 text-3xl font-black tracking-tight">
            Welcome to <span className="grad-text">MediSoft</span>
          </h1>
          <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
            {stats.todayEncounters > 0
              ? `${stats.todayEncounters} encounter${stats.todayEncounters === 1 ? "" : "s"} today · ${stats.pendingPrescriptions} prescription${stats.pendingPrescriptions === 1 ? "" : "s"} awaiting review.`
              : "You have a clear day. A great time to review pending records."}
          </p>
        </div>
        <Badge variant="success" className="gap-1.5 px-3 py-1">
          <span className="pulse-dot size-2 rounded-full bg-emerald-500" />
          All systems operational
        </Badge>
      </div>

      {/* ─────────── KPI Cards with Stagger Animation ─────────── */}
      <section
        aria-label="Key performance indicators"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {[
          { label: "Today's encounters", value: stats.todayEncounters, icon: Calendar, trendLabel: "Live count", tone: "neutral" },
          { label: "Active patients", value: stats.activePatients, icon: Users, trendLabel: "All records", tone: "neutral" },
          { label: "Pending prescriptions", value: stats.pendingPrescriptions, icon: Pill, trendLabel: stats.pendingPrescriptions > 0 ? "Needs review" : "All clear", tone: stats.pendingPrescriptions > 0 ? "warning" : "neutral" },
          { label: "Critical alerts", value: stats.criticalAlerts, icon: Activity, trendLabel: stats.criticalAlerts > 0 ? "Immediate attention" : "No critical items", tone: stats.criticalAlerts > 0 ? "critical" : "neutral" },
        ].map((stat, i) => {
          const Icon = stat.icon;
          const trendColor =
            stat.tone === "warning"
              ? "text-amber-600"
              : stat.tone === "critical"
                ? "text-[color:var(--color-destructive)] font-semibold"
                : "text-emerald-600";
          return (
            <Card
              key={i}
              className={cn(
                "transition-all duration-500 hover:-translate-y-1 hover:shadow-lg",
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
                context === "emergency" && stat.tone === "critical" && "ring-2 ring-red-400 dark:ring-red-600"
              )}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-[color:var(--color-muted-foreground)]">
                      {stat.label}
                    </div>
                    <div className="mt-2 text-3xl font-black tabular-nums tracking-tight">
                      {stat.value.toLocaleString()}
                    </div>
                    <div className={`mt-1 flex items-center gap-1 text-xs ${trendColor}`}>
                      <TrendingUp className="size-3" />
                      {stat.trendLabel}
                    </div>
                  </div>
                  <div className="grid size-10 place-items-center rounded-xl bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]">
                    <Icon className="size-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* ─────────── Two-column: Schedule + Activity ─────────── */}
      <section className={cn(
        "grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr] transition-all duration-500",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
      )} style={{ transitionDelay: "400ms" }}>
        <Card className="transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Today&apos;s schedule</CardTitle>
              <CardDescription>
                {todayEncounters.length === 0
                  ? "No encounters scheduled for today."
                  : `${todayEncounters.length} encounter${todayEncounters.length === 1 ? "" : "s"} in progress or planned.`}
              </CardDescription>
            </div>
            <Link
              href="/patients"
              className="text-xs font-semibold text-[color:var(--color-brand-magenta)] hover:underline"
            >
              All patients →
            </Link>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {todayEncounters.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[color:var(--color-border)] px-4 py-6 text-center">
                <div className="text-sm font-semibold">Nothing scheduled</div>
                <div className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                  Encounters appear here as soon as you start a MediScript session.
                </div>
              </div>
            ) : (
              todayEncounters.map((e) => <EncounterRow key={e.id} e={e} />)
            )}
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest 10 audit events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {recentActivity.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[color:var(--color-border)] px-4 py-6 text-center">
                <div className="text-sm font-semibold">No activity yet</div>
                <div className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                  Audit events appear here as you create patients and clinical records.
                </div>
              </div>
            ) : (
              recentActivity.map((a) => <ActivityRow key={a.id} a={a} />)
            )}
          </CardContent>
        </Card>
      </section>

      {/* ─────────── Module Cards with Enhanced Hover ─────────── */}
      <section className={cn(
        "transition-all duration-500",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
      )} style={{ transitionDelay: "500ms" }}>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Clinical modules</h2>
            <p className="text-sm text-[color:var(--color-muted-foreground)]">
              One brand, four Medical Intelligence systems
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { href: "/mediscript", title: "MediScript", subtitle: "Cognitive Clinical Observer", description: "Voice → SOAP. Real-time clinical documentation with ICD-11 mapping.", gradient: "from-cyan-500/20 to-purple-500/20", pending: stats.pendingPrescriptions, moduleKey: "mediscript" as const },
            { href: "/pharmax", title: "PharmaX", subtitle: "Pharmacokinetic Guard", description: "Evidence-based drug safety. RxNorm + OpenFDA + AI clinical reasoning.", gradient: "from-pink-500/20 to-orange-500/20", pending: stats.criticalAlerts, moduleKey: "pharmax" as const },
            { href: "/medilab", title: "MediLab", subtitle: "Biomarker Narrative", description: "Personalised lab interpretation with trend analysis and patient education.", gradient: "from-blue-500/20 to-teal-500/20", pending: 0, moduleKey: "medilab" as const },
            { href: "/mediscan", title: "MediScan", subtitle: "Vision Intelligence", description: "Intelligent X-ray, CT, MRI and ultrasound analysis with radiologist disclaimer.", gradient: "from-purple-500/20 to-pink-500/20", pending: 0, moduleKey: "mediscan" as const },
          ].map((mod, i) => (
            <Link key={mod.href} href={mod.href} className="group">
              <Card
                className={cn(
                  "h-full transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl",
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
                )}
                style={{ transitionDelay: `${600 + i * 100}ms` }}
              >
                <div
                  className={`h-2 rounded-t-2xl bg-gradient-to-r ${mod.gradient}`}
                  aria-hidden
                />
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{mod.title}</CardTitle>
                      <CardDescription className="mt-0.5 text-[11px] uppercase tracking-wider">
                        {mod.subtitle}
                      </CardDescription>
                    </div>
                    <Badge variant="info" className="text-[10px]">
                      MI
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-[color:var(--color-muted-foreground)]">
                    {mod.description}
                  </p>
                  <div className="flex items-center justify-between border-t border-[color:var(--color-border)] pt-3">
                    <span className="text-xs text-[color:var(--color-muted-foreground)]">
                      <span className="font-bold text-[color:var(--color-foreground)] tabular-nums">
                        {mod.pending}
                      </span>{" "}
                      pending
                    </span>
                    <ArrowRight className="size-4 text-[color:var(--color-muted-foreground)] transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────────

function EncounterRow({ e }: { e: TodayEncounterItem }) {
  const fullName = `${e.patientFirstName} ${e.patientLastName}`;
  const time = new Date(e.encounterDate).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusVariant: Record<string, "info" | "warning" | "success" | "default"> = {
    in_progress: "info",
    awaiting_review: "warning",
    signed: "success",
    amended: "default",
    cancelled: "default",
  };

  return (
    <Link
      href={`/patients/${e.patientId}`}
      className="flex items-center gap-3 rounded-xl px-2 py-2 transition-all hover:bg-[color:var(--color-muted)] hover:-translate-y-0.5"
    >
      <Avatar className="size-9">
        <AvatarFallback className="text-[10px]">
          {getInitials(fullName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{fullName}</div>
        <div className="text-[11px] text-[color:var(--color-muted-foreground)]">
          {e.encounterType ?? "encounter"} · {time} ·{" "}
          <span className="font-mono">{formatPatientId(e.patientId)}</span>
        </div>
      </div>
      <Badge variant={statusVariant[e.status] ?? "default"} className="text-[10px]">
        {e.status.replace("_", " ")}
      </Badge>
    </Link>
  );
}

function ActivityRow({ a }: { a: RecentActivityItem }) {
  const relativeTime = formatRelativeTime(a.createdAt);
  const verb = describeAction(a.action);
  return (
    <div className="flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-[color:var(--color-muted)]/50">
      <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[color:var(--color-brand-pink)]" />
      <div className="min-w-0 flex-1">
        <div className="text-sm">
          <span className="font-semibold">{verb}</span>{" "}
          <span className="text-[color:var(--color-muted-foreground)]">
            {a.resourceType}
            {a.resourceId ? ` · ${a.resourceId.slice(0, 8)}` : ""}
          </span>
        </div>
        <div className="text-[11px] text-[color:var(--color-muted-foreground)]">
          {relativeTime}
        </div>
      </div>
    </div>
  );
}

function describeAction(action: string): string {
  const [resource, verb] = action.split(".");
  const verbWord =
    verb === "create"
      ? "Created"
      : verb === "update"
        ? "Updated"
        : verb === "view"
          ? "Viewed"
          : verb === "delete"
            ? "Deleted"
            : verb === "signin"
              ? "Signed in"
              : verb === "signout"
                ? "Signed out"
                : verb === "signup"
                  ? "Signed up"
                  : verb === "record"
                    ? "Recorded"
                    : verb === "upload"
                      ? "Uploaded"
                      : verb === "sign"
                        ? "Signed"
                        : action;
  return resource ? `${verbWord} ${resource.replace("_", " ")}` : verbWord;
}

function formatRelativeTime(d: Date | string): string {
  const date = new Date(d);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
