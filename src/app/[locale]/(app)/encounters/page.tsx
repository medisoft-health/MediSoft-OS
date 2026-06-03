export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import Link from "next/link";
import { FileText, ClipboardList } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { encounters, patients, users } from "@/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatClinicalDate } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getTranslations("Encounters");
  return { title: t("title") };
}

/**
 * Encounters index — lists all non-deleted encounters with patient join.
 */
export default async function EncountersPage() {
  const t = await getTranslations("Encounters");

  const rows = await db
    .select({
      id: encounters.id,
      encounterDate: encounters.encounterDate,
      encounterType: encounters.encounterType,
      status: encounters.status,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      physicianName: users.name,
    })
    .from(encounters)
    .innerJoin(patients, eq(encounters.patientId, patients.id))
    .leftJoin(users, eq(encounters.physicianId, users.id))
    .where(isNull(encounters.deletedAt))
    .orderBy(desc(encounters.encounterDate))
    .limit(200);

  const total = rows.length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
            {t("subtitle")}
          </div>
          <h1 className="mt-1 text-3xl font-black tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
            {total === 0 ? t("noEncounters") : t("recordCount", { count: total })}
          </p>
        </div>
        <Link
          href="/mediscript/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--color-brand-magenta)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          <FileText className="size-4" />
          {t("newEncounter")}
        </Link>
      </div>

      {/* Body */}
      {total === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="grid size-16 place-items-center rounded-2xl bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]">
              <ClipboardList className="size-7" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="text-lg font-bold tracking-tight">
                {t("noEncounters")}
              </h3>
              <p className="text-sm text-[color:var(--color-muted-foreground)]">
                {t("noEncountersDescription")}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("patient")}</TableHead>
              <TableHead>{t("type")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.id}
                className="transition-colors hover:bg-[color:var(--color-muted)]/50"
              >
                <TableCell className="text-sm">
                  {formatClinicalDate(r.encounterDate)}
                </TableCell>
                <TableCell className="font-semibold text-sm">
                  {r.patientFirstName} {r.patientLastName}
                </TableCell>
                <TableCell className="text-sm capitalize">
                  {r.encounterType ?? "outpatient"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/encounters/${r.id}`}
                    className="text-sm font-medium text-[color:var(--color-primary)] hover:underline"
                  >
                    {t("viewEncounter")}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    in_progress: "bg-blue-100 text-blue-800",
    awaiting_review: "bg-amber-100 text-amber-800",
    signed: "bg-emerald-100 text-emerald-800",
    amended: "bg-purple-100 text-purple-800",
    cancelled: "bg-gray-100 text-gray-600",
  };
  return (
    <Badge
      variant="outline"
      className={`text-[10px] ${map[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status.replace("_", " ")}
    </Badge>
  );
}
