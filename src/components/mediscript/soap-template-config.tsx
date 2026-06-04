"use client";

import * as React from "react";
import { Settings2, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * SOAP Template Customization — allows doctors to configure which SOAP
 * sections are mandatory vs. optional based on their specialty.
 *
 * Specialty presets auto-configure the template, but doctors can override.
 */

export interface SoapSectionConfig {
  key: string;
  label: string;
  labelAr: string;
  category: "subjective" | "objective" | "assessment" | "plan";
  enabled: boolean;
  required: boolean;
}

export interface SoapTemplatePreset {
  specialty: string;
  specialtyAr: string;
  sections: SoapSectionConfig[];
}

// Default SOAP sections with all fields
const ALL_SECTIONS: SoapSectionConfig[] = [
  // Subjective
  { key: "chiefComplaint", label: "Chief Complaint", labelAr: "الشكوى الرئيسية", category: "subjective", enabled: true, required: true },
  { key: "historyOfPresentIllness", label: "History of Present Illness", labelAr: "تاريخ المرض الحالي", category: "subjective", enabled: true, required: true },
  { key: "reviewOfSystems", label: "Review of Systems", labelAr: "مراجعة الأجهزة", category: "subjective", enabled: true, required: false },
  { key: "pastMedicalHistory", label: "Past Medical History", labelAr: "التاريخ المرضي السابق", category: "subjective", enabled: true, required: false },
  { key: "medications", label: "Current Medications", labelAr: "الأدوية الحالية", category: "subjective", enabled: true, required: false },
  { key: "allergies", label: "Allergies", labelAr: "الحساسية", category: "subjective", enabled: true, required: true },
  { key: "socialHistory", label: "Social History", labelAr: "التاريخ الاجتماعي", category: "subjective", enabled: true, required: false },
  { key: "familyHistory", label: "Family History", labelAr: "التاريخ العائلي", category: "subjective", enabled: true, required: false },
  // Objective
  { key: "vitalSigns", label: "Vital Signs", labelAr: "العلامات الحيوية", category: "objective", enabled: true, required: true },
  { key: "physicalExamination", label: "Physical Examination", labelAr: "الفحص السريري", category: "objective", enabled: true, required: true },
  { key: "diagnosticResults", label: "Diagnostic Results", labelAr: "نتائج الفحوصات", category: "objective", enabled: true, required: false },
  // Assessment
  { key: "diagnoses", label: "Diagnoses", labelAr: "التشخيصات", category: "assessment", enabled: true, required: true },
  { key: "differentialDiagnosis", label: "Differential Diagnosis", labelAr: "التشخيص التفريقي", category: "assessment", enabled: true, required: false },
  { key: "clinicalReasoning", label: "Clinical Reasoning", labelAr: "الاستدلال السريري", category: "assessment", enabled: true, required: false },
  // Plan
  { key: "diagnosticPlan", label: "Diagnostic Plan", labelAr: "خطة التشخيص", category: "plan", enabled: true, required: false },
  { key: "therapeuticPlan", label: "Therapeutic Plan", labelAr: "الخطة العلاجية", category: "plan", enabled: true, required: true },
  { key: "patientEducation", label: "Patient Education", labelAr: "تثقيف المريض", category: "plan", enabled: true, required: false },
  { key: "followUp", label: "Follow-up", labelAr: "المتابعة", category: "plan", enabled: true, required: false },
];

// Specialty presets — which sections to emphasize or hide
const SPECIALTY_PRESETS: Record<string, Partial<Record<string, { enabled: boolean; required: boolean }>>> = {
  "Internal Medicine": {
    reviewOfSystems: { enabled: true, required: true },
    pastMedicalHistory: { enabled: true, required: true },
    familyHistory: { enabled: true, required: true },
    differentialDiagnosis: { enabled: true, required: true },
  },
  "Ophthalmology": {
    reviewOfSystems: { enabled: false, required: false },
    socialHistory: { enabled: false, required: false },
    familyHistory: { enabled: false, required: false },
    physicalExamination: { enabled: true, required: true }, // Eye exam
    diagnosticResults: { enabled: true, required: true }, // Visual acuity, IOP, etc.
  },
  "Dermatology": {
    reviewOfSystems: { enabled: false, required: false },
    familyHistory: { enabled: false, required: false },
    physicalExamination: { enabled: true, required: true }, // Skin exam
    diagnosticResults: { enabled: true, required: true }, // Biopsy results
  },
  "Pediatrics": {
    socialHistory: { enabled: false, required: false },
    familyHistory: { enabled: true, required: true },
    vitalSigns: { enabled: true, required: true },
    patientEducation: { enabled: true, required: true }, // Parent education
  },
  "Orthopedics": {
    reviewOfSystems: { enabled: false, required: false },
    socialHistory: { enabled: false, required: false },
    familyHistory: { enabled: false, required: false },
    physicalExamination: { enabled: true, required: true },
    diagnosticResults: { enabled: true, required: true }, // X-ray, MRI
    diagnosticPlan: { enabled: true, required: true },
  },
  "Psychiatry": {
    physicalExamination: { enabled: false, required: false },
    diagnosticResults: { enabled: false, required: false },
    socialHistory: { enabled: true, required: true },
    familyHistory: { enabled: true, required: true },
    reviewOfSystems: { enabled: true, required: true }, // Mental status
    clinicalReasoning: { enabled: true, required: true },
  },
  "Emergency Medicine": {
    pastMedicalHistory: { enabled: true, required: true },
    allergies: { enabled: true, required: true },
    medications: { enabled: true, required: true },
    vitalSigns: { enabled: true, required: true },
    diagnosticResults: { enabled: true, required: true },
    differentialDiagnosis: { enabled: true, required: true },
  },
  "General Practice": {
    // All sections enabled with default required settings
  },
};

function getPresetSections(specialty: string | null): SoapSectionConfig[] {
  const preset = specialty ? SPECIALTY_PRESETS[specialty] : undefined;
  if (!preset) return ALL_SECTIONS;

  return ALL_SECTIONS.map((section) => {
    const override = preset[section.key];
    if (override) {
      return { ...section, ...override };
    }
    return section;
  });
}

interface Props {
  specialty: string | null;
  sections: SoapSectionConfig[];
  onSectionsChange: (sections: SoapSectionConfig[]) => void;
  locale?: string;
}

export function SoapTemplateConfig({
  specialty,
  sections,
  onSectionsChange,
  locale = "en",
}: Props) {
  const isAr = locale === "ar";
  const [open, setOpen] = React.useState(false);

  const enabledCount = sections.filter((s) => s.enabled).length;
  const requiredCount = sections.filter((s) => s.required).length;

  const toggleSection = (key: string) => {
    onSectionsChange(
      sections.map((s) =>
        s.key === key
          ? { ...s, enabled: !s.enabled, required: !s.enabled ? s.required : false }
          : s,
      ),
    );
  };

  const toggleRequired = (key: string) => {
    onSectionsChange(
      sections.map((s) =>
        s.key === key && s.enabled ? { ...s, required: !s.required } : s,
      ),
    );
  };

  const applyPreset = (presetSpecialty: string) => {
    onSectionsChange(getPresetSections(presetSpecialty));
  };

  const categories = [
    { key: "subjective" as const, label: "Subjective", labelAr: "ذاتي" },
    { key: "objective" as const, label: "Objective", labelAr: "موضوعي" },
    { key: "assessment" as const, label: "Assessment", labelAr: "التقييم" },
    { key: "plan" as const, label: "Plan", labelAr: "الخطة" },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          <Settings2 className="size-3.5" />
          {isAr ? "إعدادات القالب" : "Template"}
          <Badge variant="secondary" className="text-[9px] px-1.5">
            {enabledCount}/{ALL_SECTIONS.length}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b border-[color:var(--color-border)] p-3">
          <h4 className="text-sm font-semibold">
            {isAr ? "تخصيص قالب SOAP" : "SOAP Template Configuration"}
          </h4>
          <p className="mt-0.5 text-[10px] text-[color:var(--color-muted-foreground)]">
            {isAr
              ? `${enabledCount} حقل مفعّل · ${requiredCount} إلزامي`
              : `${enabledCount} fields enabled · ${requiredCount} required`}
          </p>
          {specialty && (
            <div className="mt-2 flex items-center gap-1.5">
              <Info className="size-3 text-[color:var(--color-muted-foreground)]" />
              <span className="text-[10px] text-[color:var(--color-muted-foreground)]">
                Preset: {specialty}
              </span>
            </div>
          )}
        </div>

        {/* Quick presets */}
        <div className="border-b border-[color:var(--color-border)] p-2">
          <p className="text-[10px] font-medium text-[color:var(--color-muted-foreground)] mb-1.5 px-1">
            Quick Presets
          </p>
          <div className="flex flex-wrap gap-1">
            {Object.keys(SPECIALTY_PRESETS).map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => applyPreset(sp)}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[10px] transition-colors",
                  specialty === sp
                    ? "border-[color:var(--color-brand-pink)] bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]"
                    : "border-[color:var(--color-border)] hover:bg-[color:var(--color-muted)]/50",
                )}
              >
                {sp}
              </button>
            ))}
          </div>
        </div>

        {/* Section toggles by category */}
        <div className="max-h-64 overflow-y-auto p-2 space-y-3">
          {categories.map((cat) => (
            <div key={cat.key}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-muted-foreground)] px-1 mb-1">
                {isAr ? cat.labelAr : cat.label}
              </p>
              <div className="space-y-0.5">
                {sections
                  .filter((s) => s.category === cat.key)
                  .map((section) => (
                    <div
                      key={section.key}
                      className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-[color:var(--color-muted)]/50"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection(section.key)}
                        className="flex items-center gap-2 flex-1 text-left"
                      >
                        <span
                          className={cn(
                            "grid size-4 place-items-center rounded border transition-colors",
                            section.enabled
                              ? "border-emerald-400 bg-emerald-100"
                              : "border-[color:var(--color-border)]",
                          )}
                        >
                          {section.enabled && <Check className="size-2.5 text-emerald-700" />}
                        </span>
                        <span
                          className={cn(
                            "text-xs",
                            !section.enabled && "text-[color:var(--color-muted-foreground)] line-through",
                          )}
                        >
                          {isAr ? section.labelAr : section.label}
                        </span>
                      </button>
                      {section.enabled && (
                        <button
                          type="button"
                          onClick={() => toggleRequired(section.key)}
                          className={cn(
                            "text-[9px] rounded px-1.5 py-0.5 border transition-colors",
                            section.required
                              ? "border-rose-300 bg-rose-50 text-rose-700"
                              : "border-[color:var(--color-border)] text-[color:var(--color-muted-foreground)] hover:border-rose-200",
                          )}
                        >
                          {section.required ? (isAr ? "إلزامي" : "Required") : (isAr ? "اختياري" : "Optional")}
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { ALL_SECTIONS, getPresetSections, SPECIALTY_PRESETS };
