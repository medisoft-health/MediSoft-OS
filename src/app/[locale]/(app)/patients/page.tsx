export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import Link from "next/link";
import { UserPlus, Users, Brain } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  listPatients,
  type PatientListRow,
} from "@/lib/queries/patients";
import {
  patientListFiltersSchema,
} from "@/lib/validations/patient";
import {
  calculateAge,
  formatClinicalDate,
  formatPatientId,
  getInitials,
} from "@/lib/utils";

import { PatientListFilters } from "./_components/patient-list-filters";
import { PatientListPagination } from "./_components/patient-list-pagination";
import { NewPatientButton } from "./_components/new-patient-button";

export async function generateMetadata() {
  const t = await getTranslations("Patients");
  return { title: t("title") };
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Patients index — read-only list, search, filter, paginate.
 * Mutations live in the New Patient sheet (client component → server action).
 */
export default async function PatientsPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const t = await getTranslations("Patients");

  // Normalise: arrays → first value, undefined → undefined
  const cleaned: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) {
    cleaned[k] = Array.isArray(v) ? v[0] : v;
  }

  const parsed = patientListFiltersSchema.safeParse(cleaned);
  // On invalid params, fall back to defaults silently rather than crash.
  const filters = parsed.success
    ? parsed.data
    : patientListFiltersSchema.parse({});

  const { rows, total, page, totalPages, pageSize } = await listPatients(filters);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
            {t("records")}
          </div>
          <h1 className="mt-1 text-3xl font-black tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
            {total === 0
              ? t("noPatientsYet")
              : t("recordCount", { count: total })}
          </p>
        </div>
        <NewPatientButton size="md" />
      </div>

      {/* Filters */}
      <PatientListFilters
        q={filters.q ?? ""}
        sex={filters.sex}
        bloodType={filters.bloodType}
        sort={filters.sort}
        view={filters.view}
      />

      {/* Body */}
      {total === 0 ? (
        <EmptyState query={filters.q} hasFilters={!!filters.sex || !!filters.bloodType} />
      ) : filters.view === "list" ? (
        <ListView rows={rows} />
      ) : (
        <GridView rows={rows} />
      )}

      <PatientListPagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Grid view
// ─────────────────────────────────────────────────────────────────
function GridView({ rows }: { rows: PatientListRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((p) => (
        <PatientGridCard key={p.id} p={p} />
      ))}
    </div>
  );
}

async function PatientGridCard({ p }: { p: PatientListRow }) {
  const t = await getTranslations("Patients");
  const fullName = `${p.firstName} ${p.lastName}`;
  const age = calculateAge(p.dateOfBirth);
  return (
    <Card className="group relative h-full transition-all hover:-translate-y-1 hover:shadow-lg">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <Avatar className="size-12">
            <AvatarFallback>{getInitials(fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <Link
              href={`/patients/${p.id}`}
              className="truncate text-sm font-bold tracking-tight hover:text-[color:var(--color-brand-magenta)] transition-colors after:absolute after:inset-0 after:content-['']"
            >
              {fullName}
            </Link>
            <div className="mt-0.5 text-[11px] font-mono text-[color:var(--color-muted-foreground)]">
              {formatPatientId(p.id)}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-[color:var(--color-muted-foreground)]">
                {t("ageYears", { age })} · {p.sex.charAt(0).toUpperCase()}
              </span>
              {p.bloodType && p.bloodType !== "unknown" && (
                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                  {p.bloodType}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-[color:var(--color-border)] pt-3 text-[11px]">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 flex-1">
            <div>
              <div className="text-[color:var(--color-muted-foreground)]">{t("phone")}</div>
              <div className="truncate font-medium">{p.phone ?? "—"}</div>
            </div>
            <div>
              <div className="text-[color:var(--color-muted-foreground)]">{t("insurance")}</div>
              <div className="truncate font-medium">
                {p.insuranceProvider ?? t("cash")}
              </div>
            </div>
          </div>
          <Link
            href={`/patients/${p.id}?tab=patient360`}
            className="relative z-10 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/10 transition-colors"
          >
            <Brain className="size-3" />
            Medi360
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────
//  List view
// ─────────────────────────────────────────────────────────────────
async function ListView({ rows }: { rows: PatientListRow[] }) {
  const t = await getTranslations("Patients");
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("patient")}</TableHead>
          <TableHead>{t("id")}</TableHead>
          <TableHead>{t("ageSex")}</TableHead>
          <TableHead>{t("blood")}</TableHead>
          <TableHead>{t("phone")}</TableHead>
          <TableHead>{t("insurance")}</TableHead>
          <TableHead>{t("updated")}</TableHead>
          <TableHead className="text-center">Medi360</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((p) => {
          const fullName = `${p.firstName} ${p.lastName}`;
          return (
            <TableRow key={p.id} className="transition-colors hover:bg-[color:var(--color-muted)]/50">
              <TableCell>
                <Link
                  href={`/patients/${p.id}`}
                  className="flex items-center gap-3 hover:text-[color:var(--color-brand-magenta)]"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="text-[10px]">
                      {getInitials(fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold">{fullName}</span>
                </Link>
              </TableCell>
              <TableCell className="font-mono text-xs text-[color:var(--color-muted-foreground)]">
                {formatPatientId(p.id)}
              </TableCell>
              <TableCell className="text-sm">
                {calculateAge(p.dateOfBirth)} ·{" "}
                <span className="capitalize">{p.sex}</span>
              </TableCell>
              <TableCell>
                {p.bloodType && p.bloodType !== "unknown" ? (
                  <Badge variant="outline" className="text-[10px]">
                    {p.bloodType}
                  </Badge>
                ) : (
                  <span className="text-xs text-[color:var(--color-muted-foreground)]">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm">{p.phone ?? "—"}</TableCell>
              <TableCell className="text-sm">
                {p.insuranceProvider ? (
                  p.insuranceProvider
                ) : (
                  <span className="text-[color:var(--color-muted-foreground)]">{t("cash")}</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-[color:var(--color-muted-foreground)]">
                {formatClinicalDate(p.updatedAt)}
              </TableCell>
              <TableCell>
                <Link
                  href={`/patients/${p.id}?tab=patient360`}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/10 transition-colors"
                >
                  <Brain className="size-3" />
                  360°
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Empty state
// ─────────────────────────────────────────────────────────────────
async function EmptyState({
  query,
  hasFilters,
}: {
  query?: string;
  hasFilters: boolean;
}) {
  const t = await getTranslations("Patients");
  const filtered = !!query || hasFilters;

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="grid size-16 place-items-center rounded-2xl bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]">
          {filtered ? <Users className="size-7" /> : <UserPlus className="size-7" />}
        </div>
        <div className="max-w-md space-y-1.5">
          <h3 className="text-lg font-bold tracking-tight">
            {filtered ? t("noMatchTitle") : t("noPatientsTitle")}
          </h3>
          <p className="text-sm text-[color:var(--color-muted-foreground)]">
            {filtered
              ? t("noMatchDescription")
              : t("noPatientsDescription")}
          </p>
        </div>
        {!filtered && <NewPatientButton size="md" />}
      </CardContent>
    </Card>
  );
}
