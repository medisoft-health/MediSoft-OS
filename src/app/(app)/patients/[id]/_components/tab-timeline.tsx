import {
  Activity,
  FileText,
  HeartPulse,
  Mic,
  Pill,
  ScanLine,
  Stethoscope,
  UserPlus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatClinicalDate } from "@/lib/utils";
import type { TimelineItem } from "@/lib/queries/patient-detail";

interface Props {
  items: TimelineItem[];
}

/** Icon + colour per resource type. */
function iconFor(resourceType: string) {
  switch (resourceType) {
    case "patient":
      return { Icon: UserPlus, color: "text-[color:var(--color-brand-magenta)] bg-[color:var(--color-brand-pink)]/10" };
    case "encounter":
      return { Icon: Mic, color: "text-purple-700 bg-purple-100" };
    case "prescription":
      return { Icon: Pill, color: "text-pink-700 bg-pink-100" };
    case "lab_result":
      return { Icon: FileText, color: "text-blue-700 bg-blue-100" };
    case "scan":
      return { Icon: ScanLine, color: "text-cyan-700 bg-cyan-100" };
    case "vital":
      return { Icon: HeartPulse, color: "text-rose-700 bg-rose-100" };
    case "document":
      return { Icon: FileText, color: "text-slate-700 bg-slate-100" };
    default:
      return { Icon: Activity, color: "text-slate-700 bg-slate-100" };
  }
}

function describe(action: string): string {
  const [resource, verb] = action.split(".");
  if (!verb) return action;
  const verbWord: Record<string, string> = {
    create: "Created",
    update: "Updated",
    view: "Viewed",
    delete: "Deleted",
    record: "Recorded",
    upload: "Uploaded",
    sign: "Signed",
  };
  return `${verbWord[verb] ?? verb} ${resource.replace("_", " ")}`;
}

export function TabTimeline({ items }: Props) {
  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-[color:var(--color-muted)]">
            <Stethoscope className="size-5 text-[color:var(--color-muted-foreground)]" />
          </div>
          <div>
            <div className="text-sm font-semibold">No activity yet</div>
            <div className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
              Every clinical action and audit event is logged here automatically.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Patient timeline</CardTitle>
        <CardDescription>
          Unified chronological view of encounters, prescriptions, vitals,
          uploads, and audit events.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-4 border-l border-[color:var(--color-border)] pl-6">
          {items.map((item) => {
            const { Icon, color } = iconFor(item.resourceType);
            return (
              <li key={item.id} className="relative">
                <span
                  className={`absolute -left-[34px] grid size-8 place-items-center rounded-full ring-4 ring-[color:var(--color-background)] ${color}`}
                >
                  <Icon className="size-4" />
                </span>
                <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="text-sm font-semibold">{describe(item.action)}</div>
                    <div className="text-[11px] text-[color:var(--color-muted-foreground)] tabular-nums">
                      {formatClinicalDate(item.createdAt)}
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-[color:var(--color-muted-foreground)]">
                    {item.actorName ? `by ${item.actorName}` : "system"}
                    {item.resourceId ? ` · ${item.resourceId.slice(0, 8)}` : ""}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
