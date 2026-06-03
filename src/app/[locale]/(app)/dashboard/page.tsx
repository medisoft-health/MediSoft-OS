import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Calendar,
  Pill,
  TrendingUp,
  Users,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import {
  getDashboardStats,
  getRecentActivity,
  getTodayEncounters,
  type RecentActivityItem,
  type TodayEncounterItem,
} from "@/lib/queries/dashboard";
import { formatPatientId, getInitials } from "@/lib/utils";


export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata = {
  title: "Dashboard",
};

/**
 * Unified dashboard. All numbers are computed from the database at request
 * time. Three parallel queries fan out so this stays fast even as the table
 * sizes grow.
 */
export default async function DashboardHome() {
  const [stats, activity, today, t] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(10),
    getTodayEncounters(),
    getTranslations("Dashboard"),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
            {t("todayLabel")}
          </div>
          <h1 className="mt-1 text-3xl font-black tracking-tight">
            {t.rich("welcomeTo", {
              appName: (chunks) => <span className="grad-text">{chunks}</span>,
            })}
          </h1>
          <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
            {stats.todayEncounters > 0
              ? t("summaryBusy", {
                  encounters: stats.todayEncounters,
                  prescriptions: stats.pendingPrescriptions,
                })
              : t("summaryClear")}
          </p>
        </div>
        <Badge variant="success" className="gap-1.5 px-3 py-1">
          <span className="pulse-dot size-2 rounded-full bg-emerald-500" />
          {t("allSystemsOperational")}
        </Badge>
      </div>

      {/* KPI cards */}
      <section
        aria-label={t("kpiAriaLabel")}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label={t("todayEncounters")}
          value={stats.todayEncounters}
          icon={Calendar}
          trendLabel={t("liveCount")}
        />
        <StatCard
          label={t("activePatients")}
          value={stats.activePatients}
          icon={Users}
          trendLabel={t("allRecords")}
        />
        <StatCard
          label={t("pendingPrescriptions")}
          value={stats.pendingPrescriptions}
          icon={Pill}
          trendLabel={stats.pendingPrescriptions > 0 ? t("needsReview") : t("allClear")}
          trendTone={stats.pendingPrescriptions > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label={t("criticalAlerts")}
          value={stats.criticalAlerts}
          icon={Activity}
          trendLabel={
            stats.criticalAlerts > 0 ? t("immediateAttention") : t("noCriticalItems")
          }
          trendTone={stats.criticalAlerts > 0 ? "critical" : "neutral"}
        />
      </section>

      {/* Two-column: Today's schedule + Recent activity */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("todaySchedule")}</CardTitle>
              <CardDescription>
                {today.length === 0
                  ? t("noEncountersToday")
                  : t("encountersInProgress", { count: today.length })}
              </CardDescription>
            </div>
            <Link
              href="/patients"
              className="text-xs font-semibold text-[color:var(--color-brand-magenta)] hover:underline"
            >
              {t("viewAllPatients")} →
            </Link>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {today.length === 0 ? (
              <EmptyRow
                title={t("nothingScheduled")}
                hint={t("nothingScheduledHint")}
              />
            ) : (
              today.map((e) => (
                <EncounterRow
                  key={e.id}
                  e={e}
                  encounterFallback={t("encounterFallback")}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("recentActivity")}</CardTitle>
            <CardDescription>{t("latestAuditEvents")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {activity.length === 0 ? (
              <EmptyRow
                title={t("noActivityYet")}
                hint={t("noActivityHint")}
              />
            ) : (
              activity.map((a) => (
                <ActivityRow
                  key={a.id}
                  a={a}
                  describeActionT={(action: string) => describeAction(action, {
                    created: t("actionCreated"),
                    updated: t("actionUpdated"),
                    viewed: t("actionViewed"),
                    deleted: t("actionDeleted"),
                    signedIn: t("actionSignedIn"),
                    signedOut: t("actionSignedOut"),
                    signedUp: t("actionSignedUp"),
                    recorded: t("actionRecorded"),
                    uploaded: t("actionUploaded"),
                    signed: t("actionSigned"),
                  })}
                  formatTimeT={(d: Date | string) => formatRelativeTime(d, {
                    justNow: t("timeJustNow"),
                    mAgo: t("timeMinsAgo"),
                    hAgo: t("timeHoursAgo"),
                    dAgo: t("timeDaysAgo"),
                  })}
                />
              ))
            )}
          </CardContent>
        </Card>
      </section>

      {/* Module cards */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">{t("clinicalModules")}</h2>
            <p className="text-sm text-[color:var(--color-muted-foreground)]">
              {t("clinicalModulesTagline")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ModuleCard
            href="/mediscript"
            title={t("mediscriptTitle")}
            subtitle={t("mediscriptSubtitle")}
            description={t("mediscriptDescription")}
            gradient="from-cyan-500/20 to-purple-500/20"
            pending={stats.pendingPrescriptions}
            pendingLabel={t("pendingLabel")}
          />
          <ModuleCard
            href="/pharmax"
            title={t("pharmaxTitle")}
            subtitle={t("pharmaxSubtitle")}
            description={t("pharmaxDescription")}
            gradient="from-pink-500/20 to-orange-500/20"
            pending={stats.criticalAlerts}
            pendingLabel={t("pendingLabel")}
          />
          <ModuleCard
            href="/medilab"
            title={t("medilabTitle")}
            subtitle={t("medilabSubtitle")}
            description={t("medilabDescription")}
            gradient="from-blue-500/20 to-teal-500/20"
            pending={0}
            pendingLabel={t("pendingLabel")}
          />
          <ModuleCard
            href="/mediscan"
            title={t("mediscanTitle")}
            subtitle={t("mediscanSubtitle")}
            description={t("mediscanDescription")}
            gradient="from-purple-500/20 to-pink-500/20"
            pending={0}
            pendingLabel={t("pendingLabel")}
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
  pendingLabel: string;
}

function ModuleCard({
  href,
  title,
  subtitle,
  description,
  gradient,
  pending,
  pendingLabel,
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
              MI
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
              {pendingLabel}
            </span>
            <ArrowRight className="size-4 text-[color:var(--color-muted-foreground)] transition-transform group-hover:translate-x-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EncounterRow({
  e,
  encounterFallback,
}: {
  e: TodayEncounterItem;
  encounterFallback: string;
}) {
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
          {e.encounterType ?? encounterFallback} · {time} ·{" "}
          <span className="font-mono">{formatPatientId(e.patientId)}</span>
        </div>
      </div>
      <Badge variant={statusVariant[e.status] ?? "default"} className="text-[10px]">
        {e.status.replace("_", " ")}
      </Badge>
    </Link>
  );
}

function ActivityRow({
  a,
  describeActionT,
  formatTimeT,
}: {
  a: RecentActivityItem;
  describeActionT: (action: string) => string;
  formatTimeT: (d: Date | string) => string;
}) {
  const relativeTime = formatTimeT(a.createdAt);
  const verb = describeActionT(a.action);

  // Show patient name when available, otherwise fall back to resource type + ID
  const patientName =
    a.patientFirstName && a.patientLastName
      ? `${a.patientFirstName} ${a.patientLastName}`
      : a.patientFirstName || a.patientLastName || null;

  const resourceLabel = patientName
    ? patientName
    : `${a.resourceType}${a.resourceId ? ` · ${a.resourceId.slice(0, 8)}` : ""}`;

  return (
    <div className="flex items-start gap-3 rounded-xl px-2 py-2">
      <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[color:var(--color-brand-pink)]" />
      <div className="min-w-0 flex-1">
        <div className="text-sm">
          <span className="font-semibold">{verb}</span>{" "}
          <span className="text-[color:var(--color-muted-foreground)]">
            {resourceLabel}
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

interface ActionVerbs {
  created: string;
  updated: string;
  viewed: string;
  deleted: string;
  signedIn: string;
  signedOut: string;
  signedUp: string;
  recorded: string;
  uploaded: string;
  signed: string;
}

function describeAction(action: string, verbs: ActionVerbs): string {
  const [resource, verb] = action.split(".");
  const verbWord =
    verb === "create"
      ? verbs.created
      : verb === "update"
        ? verbs.updated
        : verb === "view"
          ? verbs.viewed
          : verb === "delete"
            ? verbs.deleted
            : verb === "signin"
              ? verbs.signedIn
              : verb === "signout"
                ? verbs.signedOut
                : verb === "signup"
                  ? verbs.signedUp
                  : verb === "record"
                    ? verbs.recorded
                    : verb === "upload"
                      ? verbs.uploaded
                      : verb === "sign"
                        ? verbs.signed
                        : action;
  return resource ? `${verbWord} ${resource.replace("_", " ")}` : verbWord;
}

interface RelativeTimeLabels {
  justNow: string;
  mAgo: string;
  hAgo: string;
  dAgo: string;
}

function formatRelativeTime(d: Date | string, labels: RelativeTimeLabels): string {
  const date = new Date(d);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return labels.justNow;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return labels.mAgo.replace("{count}", String(diffMin));
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return labels.hAgo.replace("{count}", String(diffHr));
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return labels.dAgo.replace("{count}", String(diffDay));
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
