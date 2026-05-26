import { z } from "zod";

/**
 * Scan validation schemas. Mirror the scans table in src/db/schema.ts.
 *
 * The legally-required radiology disclaimer is enforced at the schema
 * level: every saved scan MUST include a disclaimer string.
 */

export const SCAN_TYPE_OPTIONS = [
  "xray",
  "ct",
  "mri",
  "ultrasound",
  "mammography",
  "pathology",
  "other",
] as const;
export type ScanType = (typeof SCAN_TYPE_OPTIONS)[number];

export const TECHNICAL_QUALITY_OPTIONS = [
  "adequate",
  "limited",
  "non_diagnostic",
] as const;
export type TechnicalQuality = (typeof TECHNICAL_QUALITY_OPTIONS)[number];

export const SEVERITY_OPTIONS = ["low", "moderate", "high", "critical"] as const;
export type Severity = (typeof SEVERITY_OPTIONS)[number];

// ─────────────────────────────────────────────────────────────────
// Findings (DB JSONB shape)
// ─────────────────────────────────────────────────────────────────
export const findingSchema = z.object({
  location: z.string().max(200).optional(),
  description: z.string().min(1, "Finding description required").max(2_000),
  severity: z.enum(SEVERITY_OPTIONS).optional(),
  characteristics: z.string().max(2_000).optional(),
});
export type FindingItem = z.infer<typeof findingSchema>;

// Annotations are physician-drawn overlays. Stored on findings.annotations.
export const annotationSchema = z.object({
  id: z.string(),
  /** Drawing primitive. */
  kind: z.enum(["rect", "circle", "arrow", "label"]),
  /** Normalised coordinates (0..1) relative to the natural image size. */
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1).optional(),
  h: z.number().min(0).max(1).optional(),
  /** For arrows: endpoint normalised coords. */
  x2: z.number().min(0).max(1).optional(),
  y2: z.number().min(0).max(1).optional(),
  /** Display label (always optional; "label" kind requires text). */
  text: z.string().max(200).optional(),
  /** Stroke / fill color. */
  color: z.string().max(40).default("#E84A8A"),
});
export type Annotation = z.infer<typeof annotationSchema>;

// ─────────────────────────────────────────────────────────────────
// Scan create (used after upload completes)
// ─────────────────────────────────────────────────────────────────
export const REQUIRED_DISCLAIMER =
  "AI-assisted analysis is a clinical decision-support tool. It does NOT replace " +
  "radiologist or physician review. All findings require human verification before " +
  "use in patient care.";

export const scanCreateSchema = z.object({
  patientId: z.number().int().positive(),
  encounterId: z.string().uuid().optional().or(z.literal("")),
  scanType: z.enum(SCAN_TYPE_OPTIONS),
  bodyPart: z.string().min(1, "Body part required").max(120),
  modality: z.string().max(20).optional().or(z.literal("")),
  studyInstanceUid: z.string().max(128).optional().or(z.literal("")),
  studyDate: z.string().optional().or(z.literal("")),

  // Storage (filled by the upload step before INSERT)
  imageStorageKey: z.string().min(1, "Image upload required"),
  imageStorageUrl: z.string().optional().or(z.literal("")),
  mimeType: z.string().max(80).optional().or(z.literal("")),
  fileSizeBytes: z.coerce.number().int().nonnegative().optional(),

  // Findings (manual + AI-extracted)
  findings: z.array(findingSchema).default([]),
  annotations: z.array(annotationSchema).default([]),

  // AI text outputs (may be empty when Gemini isn't configured)
  aiReport: z.string().max(20_000).optional().or(z.literal("")),
  aiImpression: z.string().max(5_000).optional().or(z.literal("")),
  aiDifferentialDiagnosis: z.string().max(5_000).optional().or(z.literal("")),
  aiRecommendations: z.string().max(5_000).optional().or(z.literal("")),
  /** Patient-facing plain-language summary; stored on findings as a sentinel. */
  aiPatientSummary: z.string().max(5_000).optional().or(z.literal("")),
  technicalQuality: z.enum(TECHNICAL_QUALITY_OPTIONS).optional(),

  // Mandatory legal disclaimer text — must be present.
  disclaimer: z.string().min(20, "Disclaimer required"),
});
export type ScanCreateInput = z.infer<typeof scanCreateSchema>;

// ─────────────────────────────────────────────────────────────────
// AI analysis request (multipart, no body schema — see route handler)
// ─────────────────────────────────────────────────────────────────
