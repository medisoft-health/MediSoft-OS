import Link from "next/link";
import { ChevronRight, Mic } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { EncounterRow } from "@/lib/queries/patient-detail";

const statusVariant: Record<
  string,
  "info" | "warning" | "success" | "default" | "destructive"
> = {
  in_progress: "info",
  awaiting_review: "warning",
  signed: "success",
  amended: "default",
  cancelled: "destructive",
};

interface Props {
  encounters: EncounterRow[];
}

export function TabEncounters({ encounters }: Props) {
  if (encounters.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]">
            <Mic className="size-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">No encounters yet</div>
            <div className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
              Encounters appear here once you record one with MediScript.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Encounter history</CardTitle>
        <CardDescription>
          All clinical encounters, newest first. Click a row to open the full
          SOAP note.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Physician</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Signed</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {encounters.map((e) => (
              <TableRow key={e.id} className="cursor-pointer">
                <TableCell className="text-sm font-medium">
                  <Link
                    href={`/encounters/${e.id}`}
                    className="hover:text-[color:var(--color-brand-magenta)]"
                  >
                    {formatClinicalDate(e.encounterDate)}
                  </Link>
                </TableCell>
                <TableCell className="text-sm capitalize">
                  {e.encounterType ?? "—"}
                </TableCell>
                <TableCell className="text-sm">{e.physicianName ?? "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant={statusVariant[e.status] ?? "default"}
                    className="text-[10px]"
                  >
                    {e.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-[color:var(--color-muted-foreground)]">
                  {e.signedAt ? formatClinicalDate(e.signedAt) : "—"}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/encounters/${e.id}`}
                    aria-label="Open encounter"
                    className="grid size-7 place-items-center rounded-md text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
                  >
                    <ChevronRight className="size-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
