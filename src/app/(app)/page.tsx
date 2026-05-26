import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Calendar,
  Pill,
  TrendingUp,
  Users,
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
import { Skeleton } from "@/components/ui/skeleton";

import {
  getDashboardStats,
  getRecentActivity,
  getTodayEncounters,
  type RecentActivityItem,
  type TodayEncounterItem,
} from "@/lib/queries/dashboard";
import { formatPatientId, getInitials } from "@/lib/utils";

export const metadata = {
  title: "Dashboard",
};

/**
 * Unified dashboard. All numbers are computed from the database at request
 * time. Three parallel queries fan out so this stays fast even as the table
 * sizes grow.
 */
export default async function DashboardHome() {
  const [stats, activity, today] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(10),
    getTodayEncounters(),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
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

      {/* KPI cards */}
      <section
        aria-label="Key performance indicators"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label="Today's encounters"
          value={stats.todayEncounters}
          icon={Calendar}
          trendLabel="Live count"
        />
        <StatCard
          label="Active patients"
          value={stats.activePatients}
          icon={Users}
          trendLabel="All records"
        />
        <StatCard
          label="Pending prescriptions"
          value={stats.pendingPrescriptions}
          icon={Pill}
          trendLabel={stats.pendingPrescriptions > 0 ? "Needs review" : "All clear"}
          trendTone={stats.pendingPrescriptions > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="Critical alerts"
          value={stats.criticalAlerts}
          icon={Activity}
          trendLabel={
            stats.criticalAlerts > 0 ? "Immediate attention" : "No critical items"
          }
          trendTone={stats.criticalAlerts > 0 ? "critical" : "neutral"}
        />
      </section>

      {/* Two-column: Today's schedule + Recent activity */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Today&apos;s schedule</CardTitle>
              <CardDescription>
                {today.length === 0
                  ? "No encounters scheduled for today."
                  : `${today.length} encounter${today.length === 1 ? "" : "s"} in progress or planned.`}
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
            {today.length === 0 ? (
              <EmptyRow
                title="Nothing scheduled"
                hint="Encounters appear here as soon as you start a MediScript session."
              />
            ) : (
              today.map((e) => <EncounterRow key={e.id} e={e} />)
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest 10 audit events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {activity.length === 0 ? (
              <EmptyRow
                title="No activity yet"
                hint="Audit events appear here as you create patients and clinical records."
              />
            ) : (
              activity.map((a) => <ActivityRow key={a.id} a={a} />)
            )}
          </CardContent>
        </Card>
      </section>

      {/* Module cards */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Clinical modules</h2>
            <p className="text-sm text-[color:var(--color-muted-foreground)]">
              One brand, four AI-powered systems
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ModuleCard
            href="/mediscript"
            title="MediScript"
            subtitle="Cognitive Clinical Observer"
            description="Voice → SOAP. Real-time clinical documentation with ICD-11 mapping."
            gradient="from-cyan-500/20 to-purple-500/20"
            pending={stats.pendingPrescriptions}
          />
          <ModuleCard
            href="/pharmax"
            title="PharmaX"
            subtitle="Pharmacokinetic Guard"
            description="Evidence-based drug safety. RxNorm + OpenFDA + AI clinical reasoning."
            gradient="from-pink-500/20 to-orange-500/20"
            pending={stats.criticalAlerts}
          />
          <ModuleCard
            href="/medilab"
            title="MediLab"
            subtitle="Biomarker Narrative"
            description="Personalised lab interpretation with trend analysis and patient education."
            gradient="from-blue-500/20 to-teal-500/20"
            pending={0}
          />
          <ModuleCard
            href="/mediscan"
            title="MediScan"
            subtitle="Vision Intelligence"
            description="AI-assisted X-ray, CT, MRI and ultrasound analysis with radiologist disclaimer."
            gradient="from-purple-500/20 to-pink-500/20"
            pending={0}
          />
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: typeof Calendar;
  trendLabel: string;
  trendTone?: "neutral" | "warning" | "critical";
}

function StatCard({
  label,
  value,
  icon: Icon,
  trendLabel,
  trendTone = "neutral",
}: StatCardProps) {
  const trendColor =
    trendTone === "warning"
      ? "text-amber-600"
      : trendTone === "critical"
        ? "text-[color:var(--color-destructive)] font-semibold"
        : "text-emerald-600";
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-[color:var(--color-muted-foreground)]">
              {label}
            </div>
            <div className="mt-2 text-3xl font-black tabular-nums tracking-tight">
              {value.toLocaleString()}
            </div>
            <div className={`mt-1 flex items-center gap-1 text-xs ${trendColor}`}>
              <TrendingUp className="size-3" />
              {trendLabel}
            </div>
          </div>
          <div className="grid size-10 place-items-center rounded-xl bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]">
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ModuleCardProps {
  href: string;
  title: string;
  subtitle: string;
  description: string;
  gradient: string;
  pending: number;
}

function ModuleCard({
  href,
  title,
  subtitle,
  description,
  gradient,
  pending,
}: ModuleCardProps) {
  return (
    <Link href={href} className="group">
      <Card className="h-full transition-all hover:-translate-y-1 hover:shadow-xl">
        <div
          className={`h-2 rounded-t-2xl bg-gradient-to-r ${gradient}`}
          aria-hidden
        />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription className="mt-0.5 text-[11px] uppercase tracking-wider">
                {subtitle}
              </CardDescription>
            </div>
            <Badge variant="info" className="text-[10px]">
              AI
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[color:var(--color-muted-foreground)]">
            {description}
          </p>
          <div className="flex items-center justify-between border-t border-[color:var(--color-border)] pt-3">
            <span className="text-xs text-[color:var(--color-muted-foreground)]">
              <span className="font-bold text-[color:var(--color-foreground)] tabular-nums">
                {pending}
              </span>{" "}
              pending
            </span>
            <ArrowRight className="size-4 text-[color:var(--color-muted-foreground)] transition-transform group-hover:translate-x-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

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
      className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-[color:var(--color-muted)]"
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
    <div className="flex items-start gap-3 rounded-xl px-2 py-2">
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

function EmptyRow({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[color:var(--color-border)] px-4 py-6 text-center">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
        {hint}
      </div>
    </div>
  );
}

function describeAction(action: string): string {
  // turn "patient.create" → "Created patient"
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

/**
 * Loading skeleton used by Next when this page suspends. We export
 * a dedicated `loading.tsx`-style fallback through the file convention.
 */
export function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      <Skeleton className="h-10 w-72" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
