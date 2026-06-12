import "server-only";

/**
 * Google Cloud Healthcare API — FHIR R4 Client
 *
 * Provides typed wrappers around the Cloud Healthcare FHIR store for:
 * - Patient resources
 * - Encounter resources
 * - MedicationRequest resources
 * - DiagnosticReport resources
 * - ImagingStudy resources
 * - Observation resources (vitals)
 *
 * Uses Service Account authentication via GOOGLE_APPLICATION_CREDENTIALS.
 * @see https://cloud.google.com/healthcare-api/docs/reference/rest
 */

import { getAccessTokenForScopes, fetchWithRetry } from "./auth";

// ─── Configuration ───────────────────────────────────────────────────────────

const GCP_PROJECT = process.env.GCP_PROJECT_ID || "";
const GCP_LOCATION = process.env.GCP_HEALTHCARE_LOCATION || process.env.GCP_LOCATION || "";
const GCP_DATASET = process.env.GCP_HEALTHCARE_DATASET || "";
const FHIR_STORE = process.env.GCP_FHIR_STORE || "";
const DICOM_STORE = process.env.GCP_DICOM_STORE || "";

const BASE_URL = `https://healthcare.googleapis.com/v1/projects/${GCP_PROJECT}/locations/${GCP_LOCATION}/datasets/${GCP_DATASET}`;
const FHIR_URL = `${BASE_URL}/fhirStores/${FHIR_STORE}/fhir`;
const DICOM_URL = `${BASE_URL}/dicomStores/${DICOM_STORE}`;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FHIRPatient {
  resourceType: "Patient";
  id?: string;
  meta?: { lastUpdated?: string; versionId?: string };
  identifier?: Array<{ system: string; value: string }>;
  name: Array<{ family: string; given: string[]; use?: string }>;
  gender: "male" | "female" | "other" | "unknown";
  birthDate: string;
  telecom?: Array<{ system: string; value: string; use?: string }>;
  address?: Array<{
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>;
  maritalStatus?: { coding: Array<{ system: string; code: string; display: string }> };
  communication?: Array<{ language: { coding: Array<{ code: string; display: string }> } }>;
}

export interface FHIREncounter {
  resourceType: "Encounter";
  id?: string;
  status: "planned" | "arrived" | "in-progress" | "finished" | "cancelled";
  class: { system: string; code: string; display: string };
  subject: { reference: string };
  period?: { start: string; end?: string };
  reasonCode?: Array<{ coding: Array<{ system: string; code: string; display: string }> }>;
  participant?: Array<{ individual: { reference: string } }>;
}

export interface FHIRMedicationRequest {
  resourceType: "MedicationRequest";
  id?: string;
  status: "active" | "completed" | "cancelled" | "stopped";
  intent: "order" | "plan" | "proposal";
  medicationCodeableConcept: { coding: Array<{ system: string; code: string; display: string }> };
  subject: { reference: string };
  encounter?: { reference: string };
  dosageInstruction?: Array<{
    text: string;
    timing?: { repeat?: { frequency: number; period: number; periodUnit: string } };
    route?: { coding: Array<{ system: string; code: string; display: string }> };
    doseAndRate?: Array<{ doseQuantity?: { value: number; unit: string } }>;
  }>;
}

export interface FHIRDiagnosticReport {
  resourceType: "DiagnosticReport";
  id?: string;
  status: "registered" | "partial" | "preliminary" | "final";
  category?: Array<{ coding: Array<{ system: string; code: string; display: string }> }>;
  code: { coding: Array<{ system: string; code: string; display: string }>; text?: string };
  subject: { reference: string };
  effectiveDateTime?: string;
  result?: Array<{ reference: string }>;
  conclusion?: string;
}

export interface FHIRImagingStudy {
  resourceType: "ImagingStudy";
  id?: string;
  status: "available" | "cancelled";
  subject: { reference: string };
  started?: string;
  modality?: Array<{ system: string; code: string }>;
  numberOfSeries?: number;
  numberOfInstances?: number;
  description?: string;
  series?: Array<{
    uid: string;
    modality: { system: string; code: string };
    numberOfInstances: number;
    instance?: Array<{ uid: string; sopClass: { system: string; code: string } }>;
  }>;
}

export interface FHIRObservation {
  resourceType: "Observation";
  id?: string;
  status: "registered" | "preliminary" | "final" | "amended";
  category: Array<{ coding: Array<{ system: string; code: string; display: string }> }>;
  code: { coding: Array<{ system: string; code: string; display: string }>; text?: string };
  subject: { reference: string };
  effectiveDateTime?: string;
  valueQuantity?: { value: number; unit: string; system?: string; code?: string };
  component?: Array<{
    code: { coding: Array<{ system: string; code: string; display: string }> };
    valueQuantity?: { value: number; unit: string };
  }>;
}

type FHIRResource =
  | FHIRPatient
  | FHIREncounter
  | FHIRMedicationRequest
  | FHIRDiagnosticReport
  | FHIRImagingStudy
  | FHIRObservation;

// ─── Service Account Auth ───────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  return getAccessTokenForScopes(
    "https://www.googleapis.com/auth/cloud-healthcare https://www.googleapis.com/auth/cloud-platform"
  );
}

async function fhirFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  if (!GCP_PROJECT || !GCP_LOCATION || !GCP_DATASET || !FHIR_STORE) {
    throw new Error(
      "Google Healthcare API is not configured. Missing one of: GCP_PROJECT_ID, GCP_HEALTHCARE_LOCATION, GCP_HEALTHCARE_DATASET, GCP_FHIR_STORE."
    );
  }

  const token = await getAccessToken();
  const url = path.startsWith("http") ? path : `${FHIR_URL}/${path}`;

  return fetchWithRetry(url, {
    ...options,
    headers: {
      "Content-Type": "application/fhir+json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    timeoutMs: 30000, // 30s timeout
    maxRetries: 3,    // 3 retries
  });
}

// ─── FHIR CRUD Operations ────────────────────────────────────────────────────

export async function createFHIRResource<T extends FHIRResource>(
  resource: T,
): Promise<T & { id: string }> {
  const res = await fhirFetch(resource.resourceType, {
    method: "POST",
    body: JSON.stringify(resource),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`FHIR create failed (${res.status}): ${error}`);
  }

  return res.json();
}

export async function readFHIRResource<T extends FHIRResource>(
  resourceType: string,
  id: string,
): Promise<T | null> {
  const res = await fhirFetch(`${resourceType}/${id}`);

  if (res.status === 404) return null;
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`FHIR read failed (${res.status}): ${error}`);
  }

  return res.json();
}

export async function updateFHIRResource<T extends FHIRResource>(
  resource: T & { id: string },
): Promise<T> {
  const res = await fhirFetch(`${resource.resourceType}/${resource.id}`, {
    method: "PUT",
    body: JSON.stringify(resource),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`FHIR update failed (${res.status}): ${error}`);
  }

  return res.json();
}

export async function searchFHIRResources<T extends FHIRResource>(
  resourceType: string,
  params: Record<string, string>,
): Promise<{ entry?: Array<{ resource: T }> }> {
  const query = new URLSearchParams(params).toString();
  const res = await fhirFetch(`${resourceType}?${query}`);

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`FHIR search failed (${res.status}): ${error}`);
  }

  return res.json();
}

export async function deleteFHIRResource(
  resourceType: string,
  id: string,
): Promise<void> {
  const res = await fhirFetch(`${resourceType}/${id}`, { method: "DELETE" });

  if (!res.ok && res.status !== 404) {
    const error = await res.text();
    throw new Error(`FHIR delete failed (${res.status}): ${error}`);
  }
}

// ─── FHIR Store Metadata ────────────────────────────────────────────────────

export async function getFHIRStoreMetadata(): Promise<{ status: string; version: string; resourceTypes: number }> {
  try {
    const token = await getAccessToken();
    const metadataUrl = `${FHIR_URL}/metadata`;
    const res = await fetchWithRetry(metadataUrl, {
      headers: {
        Accept: "application/fhir+json",
        Authorization: `Bearer ${token}`,
      },
      timeoutMs: 30000,
      maxRetries: 3,
    });

    if (!res.ok) {
      return { status: "error", version: "unknown", resourceTypes: 0 };
    }

    const data = await res.json();
    return {
      status: "active",
      version: data.fhirVersion || "4.0.1",
      resourceTypes: data.rest?.[0]?.resource?.length || 0,
    };
  } catch (err) {
    console.error("[fhir-client.getMetadata] Error:", err);
    return { status: "error", version: "unknown", resourceTypes: 0 };
  }
}

// ─── DICOM Operations ────────────────────────────────────────────────────────

export async function storeDICOMInstance(
  dicomBuffer: Buffer,
): Promise<{ studyInstanceUID: string }> {
  const token = await getAccessToken();
  const stowUrl = `${DICOM_URL}/dicomWeb/studies`;

  const res = await fetchWithRetry(stowUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/dicom",
      Authorization: `Bearer ${token}`,
    },
    body: new Uint8Array(dicomBuffer),
    timeoutMs: 60000,
    maxRetries: 3,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`DICOM STOW-RS failed (${res.status}): ${error}`);
  }

  const data = await res.json();
  return { studyInstanceUID: data?.["00081190"]?.Value?.[0] || "unknown" };
}

export async function retrieveDICOMStudy(
  studyInstanceUID: string,
): Promise<ArrayBuffer> {
  const token = await getAccessToken();
  const wadoUrl = `${DICOM_URL}/dicomWeb/studies/${studyInstanceUID}`;

  const res = await fetchWithRetry(wadoUrl, {
    headers: {
      Accept: "multipart/related; type=application/dicom",
      Authorization: `Bearer ${token}`,
    },
    timeoutMs: 60000,
    maxRetries: 3,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`DICOM WADO-RS failed (${res.status}): ${error}`);
  }

  return res.arrayBuffer();
}

export async function searchDICOMStudies(
  params: Record<string, string> = {},
): Promise<unknown[]> {
  const token = await getAccessToken();
  const query = new URLSearchParams(params).toString();
  const qidoUrl = `${DICOM_URL}/dicomWeb/studies${query ? `?${query}` : ""}`;

  const res = await fetchWithRetry(qidoUrl, {
    headers: {
      Accept: "application/dicom+json",
      Authorization: `Bearer ${token}`,
    },
    timeoutMs: 30000,
    maxRetries: 3,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`DICOM QIDO-RS failed (${res.status}): ${error}`);
  }

  return res.json();
}

// ─── Configuration Export ────────────────────────────────────────────────────

export const healthcareConfig = {
  project: GCP_PROJECT,
  location: GCP_LOCATION,
  dataset: GCP_DATASET,
  fhirStore: FHIR_STORE,
  dicomStore: DICOM_STORE,
  fhirUrl: FHIR_URL,
  dicomUrl: DICOM_URL,
} as const;
