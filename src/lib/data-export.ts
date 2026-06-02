import "server-only";
import * as crypto from "crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  patients,
  encounters,
  prescriptions,
  labResults,
  vitals,
  scans,
} from "@/db/schema";
import {
  buildFHIRPatientContext,
} from "@/lib/fhir/context-builder";
import { getPatientFullContext } from "@/lib/queries/patient-context";

// ─── Types ───────────────────────────────────────────────────────

export interface ExportOptions {
  format: "fhir_json" | "csv" | "pdf";
  deidentify: boolean;
  locale?: string;
  sections?: (
    | "demographics"
    | "encounters"
    | "prescriptions"
    | "labs"
    | "vitals"
    | "scans"
  )[];
}

export interface ExportResult {
  success: boolean;
  data: string | Buffer;
  mimeType: string;
  filename: string;
}

type PatientRow = typeof patients.$inferSelect;

// ─── De-identification helpers ───────────────────────────────────

function hashId(id: number | string): string {
  return crypto
    .createHash("sha256")
    .update(String(id))
    .digest("hex")
    .substring(0, 12);
}

function maskSaudiId(saudiId: string | null): string {
  if (!saudiId) return "***-XXXX";
  const last4 = saudiId.slice(-4);
  return `***-${last4}`;
}

function deidentifyPatientRow(patient: PatientRow): PatientRow {
  return {
    ...patient,
    firstName: `Patient`,
    lastName: hashId(patient.id),
    firstNameAr: `مريض`,
    lastNameAr: hashId(patient.id),
    saudiId: maskSaudiId(patient.saudiId),
    mrn: patient.mrn ? `MRN-${hashId(patient.mrn)}` : null,
    phone: null,
    email: null,
    address: null,
    emergencyContact: null,
    insuranceId: patient.insuranceId ? `INS-${hashId(patient.insuranceId)}` : null,
  };
}

// ─── Section Loaders ─────────────────────────────────────────────

async function loadDemographics(patientId: number) {
  const [row] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, patientId), isNull(patients.deletedAt)))
    .limit(1);
  return row ?? null;
}

async function loadEncounters(patientId: number) {
  return db
    .select()
    .from(encounters)
    .where(and(eq(encounters.patientId, patientId), isNull(encounters.deletedAt)))
    .orderBy(desc(encounters.encounterDate))
    .limit(50);
}

async function loadPrescriptions(patientId: number) {
  return db
    .select()
    .from(prescriptions)
    .where(and(eq(prescriptions.patientId, patientId), isNull(prescriptions.deletedAt)))
    .orderBy(desc(prescriptions.createdAt))
    .limit(100);
}

async function loadLabs(patientId: number) {
  return db
    .select()
    .from(labResults)
    .where(and(eq(labResults.patientId, patientId), isNull(labResults.deletedAt)))
    .orderBy(desc(labResults.resultDate))
    .limit(50);
}

async function loadVitals(patientId: number) {
  return db
    .select()
    .from(vitals)
    .where(eq(vitals.patientId, patientId))
    .orderBy(desc(vitals.recordedAt))
    .limit(100);
}

async function loadScans(patientId: number) {
  return db
    .select()
    .from(scans)
    .where(and(eq(scans.patientId, patientId), isNull(scans.deletedAt)))
    .orderBy(desc(scans.createdAt))
    .limit(50);
}

// ─── CSV Builder ─────────────────────────────────────────────────

function escapeCsv(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(values: unknown[]): string {
  return values.map(escapeCsv).join(",");
}

async function buildCsv(
  patientId: number,
  sections: ExportOptions["sections"],
  deidentify: boolean,
): Promise<string> {
  const lines: string[] = [];
  const allSections = sections ?? [
    "demographics",
    "encounters",
    "prescriptions",
    "labs",
    "vitals",
    "scans",
  ];

  if (allSections.includes("demographics")) {
    let patient = await loadDemographics(patientId);
    if (patient) {
      if (deidentify) patient = deidentifyPatientRow(patient);
      lines.push("=== DEMOGRAPHICS ===");
      lines.push(csvRow(["Field", "Value"]));
      lines.push(csvRow(["ID", patient.id]));
      lines.push(csvRow(["Name", `${patient.firstName} ${patient.lastName}`]));
      lines.push(csvRow(["DOB", patient.dateOfBirth]));
      lines.push(csvRow(["Sex", patient.sex]));
      lines.push(csvRow(["Blood Type", patient.bloodType]));
      lines.push(csvRow(["Saudi ID", deidentify ? maskSaudiId(patient.saudiId) : patient.saudiId]));
      lines.push(csvRow(["Phone", patient.phone]));
      lines.push(csvRow(["Email", patient.email]));
      lines.push(
        csvRow([
          "Allergies",
          (patient.allergies as Array<{ substance: string }> | null)
            ?.map((a) => a.substance)
            .join("; ") ?? "",
        ]),
      );
      lines.push(
        csvRow([
          "Chronic Conditions",
          (patient.chronicConditions as Array<{ description: string }> | null)
            ?.map((c) => c.description)
            .join("; ") ?? "",
        ]),
      );
      lines.push("");
    }
  }

  if (allSections.includes("encounters")) {
    const rows = await loadEncounters(patientId);
    if (rows.length > 0) {
      lines.push("=== ENCOUNTERS ===");
      lines.push(csvRow(["ID", "Date", "Type", "Status"]));
      for (const enc of rows) {
        lines.push(
          csvRow([
            enc.id,
            enc.encounterDate.toISOString(),
            enc.encounterType,
            enc.status,
          ]),
        );
      }
      lines.push("");
    }
  }

  if (allSections.includes("prescriptions")) {
    const rows = await loadPrescriptions(patientId);
    if (rows.length > 0) {
      lines.push("=== PRESCRIPTIONS ===");
      lines.push(csvRow(["ID", "Drug", "Dose", "Frequency", "Route", "Status", "Start Date"]));
      for (const rx of rows) {
        lines.push(
          csvRow([
            rx.id,
            rx.drugName,
            rx.dose,
            rx.frequency,
            rx.route,
            rx.status,
            rx.startDate,
          ]),
        );
      }
      lines.push("");
    }
  }

  if (allSections.includes("labs")) {
    const rows = await loadLabs(patientId);
    if (rows.length > 0) {
      lines.push("=== LAB RESULTS ===");
      lines.push(csvRow(["Panel", "Date", "Test", "Value", "Unit", "Flag"]));
      for (const lab of rows) {
        const results = lab.results as Array<{
          testName: string;
          value: unknown;
          unit?: string;
          flag?: string;
        }>;
        for (const r of results) {
          lines.push(
            csvRow([
              lab.panelName,
              lab.resultDate.toISOString(),
              r.testName,
              r.value,
              r.unit,
              r.flag,
            ]),
          );
        }
      }
      lines.push("");
    }
  }

  if (allSections.includes("vitals")) {
    const rows = await loadVitals(patientId);
    if (rows.length > 0) {
      lines.push("=== VITALS ===");
      lines.push(
        csvRow([
          "Date",
          "BP Systolic",
          "BP Diastolic",
          "HR",
          "Temp",
          "SpO2",
          "Weight (kg)",
          "Height (cm)",
          "BMI",
        ]),
      );
      for (const v of rows) {
        lines.push(
          csvRow([
            v.recordedAt.toISOString(),
            v.bloodPressureSystolic,
            v.bloodPressureDiastolic,
            v.heartRate,
            v.temperature,
            v.spO2,
            v.weightKg,
            v.heightCm,
            v.bmi,
          ]),
        );
      }
      lines.push("");
    }
  }

  if (allSections.includes("scans")) {
    const rows = await loadScans(patientId);
    if (rows.length > 0) {
      lines.push("=== SCANS ===");
      lines.push(csvRow(["ID", "Type", "Body Part", "Date", "AI Impression"]));
      for (const s of rows) {
        lines.push(
          csvRow([
            s.id,
            s.scanType,
            s.bodyPart,
            s.studyDate?.toISOString() ?? "",
            s.aiImpression,
          ]),
        );
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ─── PDF Builder (text-based) ────────────────────────────────────

async function buildPdfText(
  patientId: number,
  sections: ExportOptions["sections"],
  deidentify: boolean,
  locale?: string,
): Promise<string> {
  const isAr = locale === "ar";
  const lines: string[] = [];
  const allSections = sections ?? [
    "demographics",
    "encounters",
    "prescriptions",
    "labs",
    "vitals",
    "scans",
  ];

  lines.push("═".repeat(60));
  lines.push(isAr ? "  تقرير بيانات المريض — MediSoft OS" : "  Patient Data Report — MediSoft OS");
  lines.push(`  ${isAr ? "تاريخ التصدير" : "Export Date"}: ${new Date().toISOString().slice(0, 10)}`);
  if (deidentify) {
    lines.push(`  ${isAr ? "حالة التعريف" : "De-identification"}: ${isAr ? "مُزال الهوية" : "APPLIED"}`);
  }
  lines.push("═".repeat(60));
  lines.push("");

  if (allSections.includes("demographics")) {
    let patient = await loadDemographics(patientId);
    if (patient) {
      if (deidentify) patient = deidentifyPatientRow(patient);
      lines.push(isAr ? "── البيانات الديموغرافية ──" : "── DEMOGRAPHICS ──");
      lines.push(`${isAr ? "الاسم" : "Name"}: ${patient.firstName} ${patient.lastName}`);
      lines.push(`${isAr ? "تاريخ الميلاد" : "DOB"}: ${patient.dateOfBirth}`);
      lines.push(`${isAr ? "الجنس" : "Sex"}: ${patient.sex}`);
      lines.push(`${isAr ? "فصيلة الدم" : "Blood Type"}: ${patient.bloodType ?? "N/A"}`);
      if (!deidentify) {
        lines.push(`${isAr ? "الهاتف" : "Phone"}: ${patient.phone ?? "N/A"}`);
        lines.push(`${isAr ? "البريد" : "Email"}: ${patient.email ?? "N/A"}`);
      }
      const allergies = (patient.allergies as Array<{ substance: string }> | null) ?? [];
      if (allergies.length > 0) {
        lines.push(`${isAr ? "الحساسية" : "Allergies"}: ${allergies.map((a) => a.substance).join(", ")}`);
      }
      const conditions = (patient.chronicConditions as Array<{ description: string }> | null) ?? [];
      if (conditions.length > 0) {
        lines.push(`${isAr ? "أمراض مزمنة" : "Chronic Conditions"}: ${conditions.map((c) => c.description).join(", ")}`);
      }
      lines.push("");
    }
  }

  if (allSections.includes("encounters")) {
    const rows = await loadEncounters(patientId);
    if (rows.length > 0) {
      lines.push(isAr ? "── الزيارات ──" : "── ENCOUNTERS ──");
      for (const enc of rows) {
        lines.push(`  [${enc.encounterDate.toISOString().slice(0, 10)}] ${enc.encounterType ?? "visit"} — ${enc.status}`);
      }
      lines.push("");
    }
  }

  if (allSections.includes("prescriptions")) {
    const rows = await loadPrescriptions(patientId);
    if (rows.length > 0) {
      lines.push(isAr ? "── الوصفات الطبية ──" : "── PRESCRIPTIONS ──");
      for (const rx of rows) {
        lines.push(`  ${rx.drugName} ${rx.dose} ${rx.frequency} (${rx.route}) — ${rx.status}`);
      }
      lines.push("");
    }
  }

  if (allSections.includes("labs")) {
    const rows = await loadLabs(patientId);
    if (rows.length > 0) {
      lines.push(isAr ? "── نتائج المختبر ──" : "── LAB RESULTS ──");
      for (const lab of rows) {
        lines.push(`  ${lab.panelName} — ${lab.resultDate.toISOString().slice(0, 10)}`);
        const results = lab.results as Array<{
          testName: string;
          value: unknown;
          unit?: string;
          flag?: string;
        }>;
        for (const r of results) {
          const flagStr = r.flag ? ` [${r.flag}]` : "";
          lines.push(`    ${r.testName}: ${r.value} ${r.unit ?? ""}${flagStr}`);
        }
      }
      lines.push("");
    }
  }

  if (allSections.includes("vitals")) {
    const rows = await loadVitals(patientId);
    if (rows.length > 0) {
      lines.push(isAr ? "── العلامات الحيوية ──" : "── VITALS ──");
      for (const v of rows) {
        const parts: string[] = [];
        if (v.bloodPressureSystolic && v.bloodPressureDiastolic) {
          parts.push(`BP: ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`);
        }
        if (v.heartRate) parts.push(`HR: ${v.heartRate}`);
        if (v.temperature) parts.push(`T: ${v.temperature}°C`);
        if (v.spO2) parts.push(`SpO2: ${v.spO2}%`);
        lines.push(`  [${v.recordedAt.toISOString().slice(0, 10)}] ${parts.join(" | ")}`);
      }
      lines.push("");
    }
  }

  if (allSections.includes("scans")) {
    const rows = await loadScans(patientId);
    if (rows.length > 0) {
      lines.push(isAr ? "── الفحوصات التصويرية ──" : "── SCANS ──");
      for (const s of rows) {
        lines.push(`  [${s.studyDate?.toISOString().slice(0, 10) ?? "N/A"}] ${s.scanType} — ${s.bodyPart}`);
        if (s.aiImpression) lines.push(`    ${isAr ? "الانطباع" : "Impression"}: ${s.aiImpression}`);
      }
      lines.push("");
    }
  }

  lines.push("═".repeat(60));
  lines.push(isAr ? "  نهاية التقرير" : "  END OF REPORT");
  lines.push("═".repeat(60));

  return lines.join("\n");
}

// ─── FHIR JSON Builder ──────────────────────────────────────────

async function buildFhirJson(
  patientId: number,
  deidentify: boolean,
): Promise<string> {
  const ctx = await getPatientFullContext(patientId);
  if (!ctx) throw new Error("Patient not found");

  if (deidentify) {
    ctx.demographics.firstName = "Patient";
    ctx.demographics.lastName = hashId(patientId);
    ctx.demographics.medicalHistory = ctx.demographics.medicalHistory
      ? "[REDACTED]"
      : null;
    ctx.demographics.familyHistory = ctx.demographics.familyHistory
      ? "[REDACTED]"
      : null;
    ctx.demographics.socialHistory = ctx.demographics.socialHistory
      ? "[REDACTED]"
      : null;
  }

  const bundle = buildFHIRPatientContext(ctx);
  return JSON.stringify(bundle, null, 2);
}

// ─── Main Export Function ────────────────────────────────────────

export async function exportPatientData(
  patientId: number,
  options: ExportOptions,
): Promise<ExportResult> {
  const { format, deidentify, locale, sections } = options;

  try {
    switch (format) {
      case "fhir_json": {
        const data = await buildFhirJson(patientId, deidentify);
        const suffix = deidentify ? "_deidentified" : "";
        return {
          success: true,
          data,
          mimeType: "application/fhir+json",
          filename: `patient_${patientId}${suffix}_fhir.json`,
        };
      }

      case "csv": {
        const data = await buildCsv(patientId, sections, deidentify);
        const suffix = deidentify ? "_deidentified" : "";
        return {
          success: true,
          data,
          mimeType: "text/csv",
          filename: `patient_${patientId}${suffix}_export.csv`,
        };
      }

      case "pdf": {
        const text = await buildPdfText(patientId, sections, deidentify, locale);
        const suffix = deidentify ? "_deidentified" : "";
        // Return as plain text (text-based PDF representation)
        // In production, jsPDF or a PDF library would render this to binary PDF.
        return {
          success: true,
          data: text,
          mimeType: "text/plain",
          filename: `patient_${patientId}${suffix}_report.txt`,
        };
      }

      default:
        return {
          success: false,
          data: "Unsupported format",
          mimeType: "text/plain",
          filename: "error.txt",
        };
    }
  } catch (err) {
    console.error("[data-export] Export failed:", err);
    return {
      success: false,
      data: err instanceof Error ? err.message : "Export failed",
      mimeType: "text/plain",
      filename: "error.txt",
    };
  }
}
