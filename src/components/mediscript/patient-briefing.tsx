"use client";

import * as React from "react";
import {
  AlertCircle,
  Heart,
  Pill,
  Activity,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Patient Briefing Panel — shown in Step 2 (Record) of the MediScript wizard.
 *
 * Displays a compact clinical summary so the doctor has full context
 * before starting the consultation recording:
 *   - Allergies (highlighted in red)
 *   - Chronic conditions
 *   - Active medications
 *   - Latest vitals
 *   - Last encounter date
 *
 * This follows the project requirement:
 *   "Before a clinic session, the doctor should see a complete report with
 *    all vital signs and the patient's full medical history to aid in
 *    diagnosis without needing to ask about past conditions."
 */

interface PatientBriefingData {
  conditions: string[];
  medications: string[];
  allergies: string[];
  stats: {
    lastBP: string | null;
    lastVitalDate: string | null;
    activeMeds: number;
    lastEncounterDate: string | null;
    lastLabDate: string | null;
    lastLabPanel: string | null;
    lastLabAbnormal: number;
  };
  alerts: Array<{ severity: string; message: string }>;
}

interface Props {
  patientId: number;
}

export function PatientBriefing({ patientId }: Props) {
  const [data, setData] = React.useState<PatientBriefingData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/patients/${patientId}/dashboard`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setData({
          conditions: json.conditions ?? [],
          medications: json.medications ?? [],
          allergies: json.allergies ?? [],
          stats: json.stats ?? {},
          alerts: json.alerts ?? [],
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message ?? "Failed to load patient data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/30 px-4 py-3 text-sm text-[color:var(--color-muted-foreground)]">
        <Loader2 className="size-4 animate-spin" />
        Loading patient clinical summary…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <AlertCircle className="size-4" />
        Could not load patient history. You can still proceed with the recording.
      </div>
    );
  }

  const hasAllergies = data.allergies.length > 0;
  const hasConditions = data.conditions.length > 0;
  const hasMedications = data.medications.length > 0;
  const hasAlerts = data.alerts.length > 0;
  const isEmpty = !hasAllergies && !hasConditions && !hasMedications;

  if (isEmpty) {
    return (
      <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-4 py-3 text-sm text-[color:var(--color-muted-foreground)]">
        <span className="font-medium">Clinical Summary:</span> No prior medical history on record.
        This appears to be a new patient or first visit.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] overflow-hidden">
      {/* Compact header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm hover:bg-[color:var(--color-muted)]/30 transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-[color:var(--color-foreground)]">
            Clinical Summary
          </span>

          {/* Allergy badge — always prominent */}
          {hasAllergies ? (
            <Badge variant="destructive" className="text-[10px] gap-1">
              <ShieldAlert className="size-3" />
              {data.allergies.length} Allerg{data.allergies.length === 1 ? "y" : "ies"}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300 bg-emerald-50">
              NKDA
            </Badge>
          )}

          {hasConditions && (
            <Badge variant="outline" className="text-[10px]">
              <Heart className="size-3 mr-0.5" />
              {data.conditions.length} Condition{data.conditions.length === 1 ? "" : "s"}
            </Badge>
          )}

          {hasMedications && (
            <Badge variant="outline" className="text-[10px]">
              <Pill className="size-3 mr-0.5" />
              {data.medications.length} Med{data.medications.length === 1 ? "" : "s"}
            </Badge>
          )}

          {data.stats.lastBP && (
            <Badge variant="outline" className="text-[10px]">
              <Activity className="size-3 mr-0.5" />
              BP {data.stats.lastBP}
            </Badge>
          )}

          {hasAlerts && (
            <Badge variant="destructive" className="text-[10px] gap-1">
              <AlertCircle className="size-3" />
              {data.alerts.length} Alert{data.alerts.length === 1 ? "" : "s"}
            </Badge>
          )}
        </div>

        {expanded ? (
          <ChevronUp className="size-4 text-[color:var(--color-muted-foreground)] shrink-0" />
        ) : (
          <ChevronDown className="size-4 text-[color:var(--color-muted-foreground)] shrink-0" />
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-[color:var(--color-border)] px-4 py-3 space-y-3 text-sm">
          {/* Allergies */}
          {hasAllergies && (
            <div>
              <div className="flex items-center gap-1.5 font-medium text-red-700 mb-1">
                <ShieldAlert className="size-3.5" />
                Allergies
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.allergies.map((a) => (
                  <Badge
                    key={a}
                    variant="destructive"
                    className="text-[10px]"
                  >
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Chronic Conditions */}
          {hasConditions && (
            <div>
              <div className="flex items-center gap-1.5 font-medium text-[color:var(--color-foreground)] mb-1">
                <Heart className="size-3.5" />
                Chronic Conditions
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.conditions.map((c) => (
                  <Badge
                    key={c}
                    variant="outline"
                    className="text-[10px]"
                  >
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Active Medications */}
          {hasMedications && (
            <div>
              <div className="flex items-center gap-1.5 font-medium text-[color:var(--color-foreground)] mb-1">
                <Pill className="size-3.5" />
                Active Medications
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.medications.map((m) => (
                  <Badge
                    key={m}
                    variant="secondary"
                    className="text-[10px]"
                  >
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Drug Alerts */}
          {hasAlerts && (
            <div>
              <div className="flex items-center gap-1.5 font-medium text-amber-700 mb-1">
                <AlertCircle className="size-3.5" />
                Active Alerts
              </div>
              <div className="space-y-1">
                {data.alerts.map((alert, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded px-2 py-1 text-[11px]",
                      alert.severity === "high"
                        ? "bg-red-50 text-red-800 border border-red-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200",
                    )}
                  >
                    {alert.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats footer */}
          <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-[color:var(--color-muted-foreground)] border-t border-[color:var(--color-border)]">
            {data.stats.lastEncounterDate && (
              <span>
                <FileText className="size-3 inline mr-0.5" />
                Last visit: {new Date(data.stats.lastEncounterDate).toLocaleDateString()}
              </span>
            )}
            {data.stats.lastLabDate && (
              <span>
                Last lab: {new Date(data.stats.lastLabDate).toLocaleDateString()}
                {data.stats.lastLabAbnormal > 0 && (
                  <span className="text-amber-700 ml-1">
                    ({data.stats.lastLabAbnormal} abnormal)
                  </span>
                )}
              </span>
            )}
            {data.stats.lastVitalDate && (
              <span>
                Vitals: {new Date(data.stats.lastVitalDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
