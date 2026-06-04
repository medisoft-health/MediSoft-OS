"use client";

import * as React from "react";
import {
  Stethoscope,
  Video,
  Building2,
  Siren,
  FlaskConical,
  ScanLine,
  UserPlus,
  CalendarCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Encounter type + visit reason selector for MediScript Step 1.
 *
 * Allows the doctor to choose:
 * 1. Encounter type (outpatient, telemedicine, inpatient, emergency)
 * 2. Visit reason (new patient, follow-up, lab-only, imaging-only)
 *
 * This informs the SOAP generation prompt for better context.
 */

export type EncounterTypeValue = "outpatient" | "telemedicine" | "inpatient" | "emergency";
export type VisitReasonValue = "new_patient" | "follow_up" | "lab_only" | "imaging_only";

interface EncounterTypeOption {
  value: EncounterTypeValue;
  label: string;
  labelAr: string;
  icon: React.ElementType;
  description: string;
}

interface VisitReasonOption {
  value: VisitReasonValue;
  label: string;
  labelAr: string;
  icon: React.ElementType;
  description: string;
}

const ENCOUNTER_TYPES: EncounterTypeOption[] = [
  {
    value: "outpatient",
    label: "Outpatient",
    labelAr: "عيادة خارجية",
    icon: Stethoscope,
    description: "Regular clinic visit",
  },
  {
    value: "telemedicine",
    label: "Telemedicine",
    labelAr: "طب عن بُعد",
    icon: Video,
    description: "Remote video/audio consultation",
  },
  {
    value: "inpatient",
    label: "Inpatient",
    labelAr: "تنويم",
    icon: Building2,
    description: "Hospitalized patient round",
  },
  {
    value: "emergency",
    label: "Emergency",
    labelAr: "طوارئ",
    icon: Siren,
    description: "Emergency department visit",
  },
];

const VISIT_REASONS: VisitReasonOption[] = [
  {
    value: "new_patient",
    label: "New Patient",
    labelAr: "مريض جديد",
    icon: UserPlus,
    description: "First visit — full history required",
  },
  {
    value: "follow_up",
    label: "Follow-up",
    labelAr: "متابعة",
    icon: CalendarCheck,
    description: "Returning patient — focus on progress",
  },
  {
    value: "lab_only",
    label: "Lab Review",
    labelAr: "مراجعة تحاليل",
    icon: FlaskConical,
    description: "Lab results discussion only",
  },
  {
    value: "imaging_only",
    label: "Imaging Review",
    labelAr: "مراجعة أشعة",
    icon: ScanLine,
    description: "Imaging results discussion only",
  },
];

interface Props {
  encounterType: EncounterTypeValue;
  visitReason: VisitReasonValue;
  onEncounterTypeChange: (value: EncounterTypeValue) => void;
  onVisitReasonChange: (value: VisitReasonValue) => void;
  locale?: string;
}

export function EncounterTypeSelector({
  encounterType,
  visitReason,
  onEncounterTypeChange,
  onVisitReasonChange,
  locale = "en",
}: Props) {
  const isAr = locale === "ar";

  return (
    <div className="space-y-4">
      {/* Encounter Type */}
      <div>
        <label className="text-sm font-medium text-[color:var(--color-foreground)]">
          {isAr ? "نوع الزيارة" : "Encounter Type"}
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ENCOUNTER_TYPES.map((opt) => {
            const Icon = opt.icon;
            const isSelected = encounterType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onEncounterTypeChange(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all",
                  isSelected
                    ? "border-[color:var(--color-brand-pink)] bg-[color:var(--color-brand-pink)]/10 ring-1 ring-[color:var(--color-brand-pink)]/30"
                    : "border-[color:var(--color-border)] hover:border-[color:var(--color-brand-pink)]/50 hover:bg-[color:var(--color-muted)]/50",
                )}
              >
                <Icon
                  className={cn(
                    "size-5",
                    isSelected
                      ? "text-[color:var(--color-brand-magenta)]"
                      : "text-[color:var(--color-muted-foreground)]",
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    isSelected
                      ? "text-[color:var(--color-brand-magenta)]"
                      : "text-[color:var(--color-foreground)]",
                  )}
                >
                  {isAr ? opt.labelAr : opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Visit Reason */}
      <div>
        <label className="text-sm font-medium text-[color:var(--color-foreground)]">
          {isAr ? "سبب الزيارة" : "Visit Reason"}
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {VISIT_REASONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = visitReason === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onVisitReasonChange(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all",
                  isSelected
                    ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300/50"
                    : "border-[color:var(--color-border)] hover:border-emerald-300/50 hover:bg-[color:var(--color-muted)]/50",
                )}
              >
                <Icon
                  className={cn(
                    "size-5",
                    isSelected
                      ? "text-emerald-700"
                      : "text-[color:var(--color-muted-foreground)]",
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    isSelected ? "text-emerald-800" : "text-[color:var(--color-foreground)]",
                  )}
                >
                  {isAr ? opt.labelAr : opt.label}
                </span>
                <span className="text-[10px] text-[color:var(--color-muted-foreground)] leading-tight">
                  {opt.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
