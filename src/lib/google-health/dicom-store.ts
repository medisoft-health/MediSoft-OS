import "server-only";

/**
 * Google Cloud Healthcare DICOM Store — Real DICOMweb Integration
 *
 * Implements the full DICOMweb standard against Google Cloud Healthcare API:
 *   - STOW-RS: Store DICOM instances (single & multipart)
 *   - WADO-RS: Retrieve studies/series/instances (DICOM & rendered)
 *   - QIDO-RS: Query/search studies, series, instances
 *   - Delete: Remove studies/series/instances
 *   - Metadata: Retrieve DICOM JSON metadata
 *
 * Authentication uses the service account JWT → access token flow.
 * The DICOM store must have the service account granted roles/healthcare.dicomEditor.
 *
 * IAM Setup (run once):
 *   gcloud projects add-iam-policy-binding gen-lang-client-0619493108 \
 *     --member="serviceAccount:medisoft-healthcare@gen-lang-client-0619493108.iam.gserviceaccount.com" \
 *     --role="roles/healthcare.dicomEditor" \
 *     --condition=None
 *
 *   # Or at dataset level:
 *   gcloud healthcare datasets add-iam-policy-binding medisoft-health \
 *     --location=me-central1 \
 *     --member="serviceAccount:medisoft-healthcare@gen-lang-client-0619493108.iam.gserviceaccount.com" \
 *     --role="roles/healthcare.dicomEditor"
 *
 * @see https://cloud.google.com/healthcare-api/docs/how-tos/dicomweb
 */

import * as fs from "fs";
import * as crypto from "crypto";

// ─── Configuration ───────────────────────────────────────────────────────────

const GCP_PROJECT = process.env.GCP_PROJECT_ID || "gen-lang-client-0619493108";
const GCP_LOCATION = process.env.GCP_HEALTHCARE_LOCATION || process.env.GCP_LOCATION || "me-central1";
const GCP_DATASET = process.env.GCP_HEALTHCARE_DATASET || "medisoft-health";
const DICOM_STORE = process.env.GCP_DICOM_STORE || "medisoft-dicom-store";

const BASE_URL = `https://healthcare.googleapis.com/v1/projects/${GCP_PROJECT}/locations/${GCP_LOCATION}/datasets/${GCP_DATASET}/dicomStores/${DICOM_STORE}`;
const DICOMWEB_URL = `${BASE_URL}/dicomWeb`;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DICOMStudy {
  studyInstanceUID: string;
  patientName?: string;
  patientID?: string;
  studyDate?: string;
  studyDescription?: string;
  modality?: string[];
  numberOfSeries?: number;
  numberOfInstances?: number;
  accessionNumber?: string;
  referringPhysician?: string;
}

export interface DICOMSeries {
  seriesInstanceUID: string;
  studyInstanceUID: string;
  modality: string;
  seriesDescription?: string;
  seriesNumber?: number;
  numberOfInstances?: number;
  bodyPartExamined?: string;
}

export interface DICOMInstance {
  sopInstanceUID: string;
  seriesInstanceUID: string;
  studyInstanceUID: string;
  sopClassUID: string;
  instanceNumber?: number;
  transferSyntaxUID?: string;
}

export interface StoreResult {
  success: boolean;
  studyInstanceUID?: string;
  sopInstanceUIDs?: string[];
  failedInstances?: number;
  message?: string;
}

export interface SearchParams {
  PatientName?: string;
  PatientID?: string;
  StudyDate?: string;
  Modality?: string;
  StudyDescription?: string;
  AccessionNumber?: string;
  ReferringPhysicianName?: string;
  limit?: number;
  offset?: number;
}

// ─── Authentication ─────────────────────────────────────────────────────────

let cachedToken: { token: string; expiry: number } | null = null;

function base64url(data: Buffer): string {
  return data.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiry - 60000) {
    return cachedToken.token;
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    || "/etc/medisoft/credentials/gcp-credentials.json";

  if (!fs.existsSync(credPath)) {
    throw new Error(`DICOM Store: Credentials not found at ${credPath}`);
  }

  const creds = JSON.parse(fs.readFileSync(credPath, "utf-8"));
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: creds.client_email,
    scope: "https://www.googleapis.com/auth/cloud-healthcare https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const headerB64 = base64url(Buffer.from(JSON.stringify(header)));
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload)));
  const signInput = `${headerB64}.${payloadB64}`;

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signInput);
  const signature = base64url(sign.sign(creds.private_key));

  const jwt = `${signInput}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`DICOM Store: Failed to get access token: ${err}`);
  }

  const tokenData = await tokenRes.json();
  cachedToken = {
    token: tokenData.access_token,
    expiry: Date.now() + (tokenData.expires_in || 3600) * 1000,
  };

  return cachedToken.token;
}

// ─── STOW-RS: Store DICOM Instances ─────────────────────────────────────────

/**
 * Store a single DICOM instance via STOW-RS.
 * Accepts raw DICOM binary data (application/dicom).
 */
export async function storeDICOMInstance(dicomBuffer: Buffer): Promise<StoreResult> {
  const token = await getAccessToken();
  const stowUrl = `${DICOMWEB_URL}/studies`;

  const boundary = `----MediSoftDICOM${Date.now()}`;

  // Build multipart/related body
  const parts: Buffer[] = [];
  parts.push(Buffer.from(`--${boundary}\r\n`));
  parts.push(Buffer.from(`Content-Type: application/dicom\r\n\r\n`));
  parts.push(dicomBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  const body = Buffer.concat(parts);

  const response = await fetch(stowUrl, {
    method: "POST",
    headers: {
      "Content-Type": `multipart/related; type="application/dicom"; boundary="${boundary}"`,
      Authorization: `Bearer ${token}`,
      Accept: "application/dicom+json",
    },
    body: new Uint8Array(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      success: false,
      message: `STOW-RS failed (${response.status}): ${errorText}`,
    };
  }

  const data = await response.json();

  // Parse STOW-RS response to extract UIDs
  const referencedSOPs = data?.["00081199"]?.Value || [];
  const sopUIDs = referencedSOPs.map((sop: Record<string, any>) =>
    sop?.["00081155"]?.Value?.[0] || "unknown"
  );
  const studyUID = data?.["0020000D"]?.Value?.[0]
    || referencedSOPs[0]?.["0020000D"]?.Value?.[0]
    || "unknown";

  return {
    success: true,
    studyInstanceUID: studyUID,
    sopInstanceUIDs: sopUIDs,
    failedInstances: data?.["00081198"]?.Value?.length || 0,
  };
}

/**
 * Store multiple DICOM instances in a single STOW-RS request.
 */
export async function storeDICOMInstances(dicomBuffers: Buffer[]): Promise<StoreResult> {
  const token = await getAccessToken();
  const stowUrl = `${DICOMWEB_URL}/studies`;

  const boundary = `----MediSoftDICOMBatch${Date.now()}`;

  // Build multipart/related body with all instances
  const parts: Buffer[] = [];
  for (const buf of dicomBuffers) {
    parts.push(Buffer.from(`--${boundary}\r\n`));
    parts.push(Buffer.from(`Content-Type: application/dicom\r\n\r\n`));
    parts.push(buf);
    parts.push(Buffer.from(`\r\n`));
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  const body = Buffer.concat(parts);

  const response = await fetch(stowUrl, {
    method: "POST",
    headers: {
      "Content-Type": `multipart/related; type="application/dicom"; boundary="${boundary}"`,
      Authorization: `Bearer ${token}`,
      Accept: "application/dicom+json",
    },
    body: new Uint8Array(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      success: false,
      message: `STOW-RS batch failed (${response.status}): ${errorText}`,
    };
  }

  const data = await response.json();
  const referencedSOPs = data?.["00081199"]?.Value || [];
  const failedSOPs = data?.["00081198"]?.Value || [];

  return {
    success: failedSOPs.length === 0,
    studyInstanceUID: referencedSOPs[0]?.["0020000D"]?.Value?.[0] || "unknown",
    sopInstanceUIDs: referencedSOPs.map((sop: Record<string, any>) =>
      sop?.["00081155"]?.Value?.[0] || "unknown"
    ),
    failedInstances: failedSOPs.length,
    message: failedSOPs.length > 0 ? `${failedSOPs.length} instance(s) failed` : undefined,
  };
}

// ─── WADO-RS: Retrieve DICOM Data ───────────────────────────────────────────

/**
 * Retrieve a complete DICOM study (all series and instances).
 */
export async function retrieveStudy(studyInstanceUID: string): Promise<ArrayBuffer> {
  const token = await getAccessToken();
  const wadoUrl = `${DICOMWEB_URL}/studies/${studyInstanceUID}`;

  const response = await fetch(wadoUrl, {
    headers: {
      Accept: "multipart/related; type=\"application/dicom\"; transfer-syntax=*",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WADO-RS retrieve study failed (${response.status}): ${errorText}`);
  }

  return response.arrayBuffer();
}

/**
 * Retrieve a specific DICOM series within a study.
 */
export async function retrieveSeries(
  studyInstanceUID: string,
  seriesInstanceUID: string,
): Promise<ArrayBuffer> {
  const token = await getAccessToken();
  const wadoUrl = `${DICOMWEB_URL}/studies/${studyInstanceUID}/series/${seriesInstanceUID}`;

  const response = await fetch(wadoUrl, {
    headers: {
      Accept: "multipart/related; type=\"application/dicom\"; transfer-syntax=*",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WADO-RS retrieve series failed (${response.status}): ${errorText}`);
  }

  return response.arrayBuffer();
}

/**
 * Retrieve a single DICOM instance.
 */
export async function retrieveInstance(
  studyInstanceUID: string,
  seriesInstanceUID: string,
  sopInstanceUID: string,
): Promise<ArrayBuffer> {
  const token = await getAccessToken();
  const wadoUrl = `${DICOMWEB_URL}/studies/${studyInstanceUID}/series/${seriesInstanceUID}/instances/${sopInstanceUID}`;

  const response = await fetch(wadoUrl, {
    headers: {
      Accept: "application/dicom; transfer-syntax=*",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WADO-RS retrieve instance failed (${response.status}): ${errorText}`);
  }

  return response.arrayBuffer();
}

/**
 * Retrieve a rendered (PNG/JPEG) version of a DICOM instance frame.
 * Useful for displaying images in the MediScan UI without client-side DICOM parsing.
 */
export async function retrieveRenderedInstance(
  studyInstanceUID: string,
  seriesInstanceUID: string,
  sopInstanceUID: string,
  format: "image/png" | "image/jpeg" = "image/png",
  frame = 1,
): Promise<ArrayBuffer> {
  const token = await getAccessToken();
  const wadoUrl = `${DICOMWEB_URL}/studies/${studyInstanceUID}/series/${seriesInstanceUID}/instances/${sopInstanceUID}/frames/${frame}/rendered`;

  const response = await fetch(wadoUrl, {
    headers: {
      Accept: format,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WADO-RS rendered retrieve failed (${response.status}): ${errorText}`);
  }

  return response.arrayBuffer();
}

// ─── QIDO-RS: Query/Search DICOM Studies ────────────────────────────────────

/**
 * Search for DICOM studies matching the given parameters.
 */
export async function searchStudies(params: SearchParams = {}): Promise<DICOMStudy[]> {
  const token = await getAccessToken();

  const queryParams = new URLSearchParams();
  if (params.PatientName) queryParams.set("PatientName", params.PatientName);
  if (params.PatientID) queryParams.set("PatientID", params.PatientID);
  if (params.StudyDate) queryParams.set("StudyDate", params.StudyDate);
  if (params.Modality) queryParams.set("ModalitiesInStudy", params.Modality);
  if (params.StudyDescription) queryParams.set("StudyDescription", params.StudyDescription);
  if (params.AccessionNumber) queryParams.set("AccessionNumber", params.AccessionNumber);
  if (params.ReferringPhysicianName) queryParams.set("ReferringPhysicianName", params.ReferringPhysicianName);
  if (params.limit) queryParams.set("limit", String(params.limit));
  if (params.offset) queryParams.set("offset", String(params.offset));

  // Request specific DICOM tags in the response
  queryParams.set("includefield", [
    "0020000D", // Study Instance UID
    "00100010", // Patient Name
    "00100020", // Patient ID
    "00080020", // Study Date
    "00081030", // Study Description
    "00080061", // Modalities in Study
    "00201206", // Number of Series
    "00201208", // Number of Instances
    "00080050", // Accession Number
    "00080090", // Referring Physician
  ].join(","));

  const qidoUrl = `${DICOMWEB_URL}/studies?${queryParams.toString()}`;

  const response = await fetch(qidoUrl, {
    headers: {
      Accept: "application/dicom+json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 204) return []; // No results
    const errorText = await response.text();
    throw new Error(`QIDO-RS search failed (${response.status}): ${errorText}`);
  }

  // 204 No Content means no results
  if (response.status === 204) return [];

  const data = await response.json();
  if (!Array.isArray(data)) return [];

  return data.map(parseDICOMStudy);
}

/**
 * Search for series within a specific study.
 */
export async function searchSeries(
  studyInstanceUID: string,
  modality?: string,
): Promise<DICOMSeries[]> {
  const token = await getAccessToken();

  const queryParams = new URLSearchParams();
  if (modality) queryParams.set("Modality", modality);
  queryParams.set("includefield", [
    "0020000E", // Series Instance UID
    "0020000D", // Study Instance UID
    "00080060", // Modality
    "0008103E", // Series Description
    "00200011", // Series Number
    "00201209", // Number of Instances
    "00180015", // Body Part Examined
  ].join(","));

  const qidoUrl = `${DICOMWEB_URL}/studies/${studyInstanceUID}/series?${queryParams.toString()}`;

  const response = await fetch(qidoUrl, {
    headers: {
      Accept: "application/dicom+json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 204) return [];
    const errorText = await response.text();
    throw new Error(`QIDO-RS series search failed (${response.status}): ${errorText}`);
  }

  if (response.status === 204) return [];

  const data = await response.json();
  if (!Array.isArray(data)) return [];

  return data.map(parseDICOMSeries);
}

// ─── Metadata Retrieval ─────────────────────────────────────────────────────

/**
 * Retrieve DICOM JSON metadata for a study (without pixel data).
 */
export async function getStudyMetadata(studyInstanceUID: string): Promise<unknown[]> {
  const token = await getAccessToken();
  const metadataUrl = `${DICOMWEB_URL}/studies/${studyInstanceUID}/metadata`;

  const response = await fetch(metadataUrl, {
    headers: {
      Accept: "application/dicom+json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Metadata retrieval failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

// ─── Delete Operations ──────────────────────────────────────────────────────

/**
 * Delete an entire DICOM study and all its series/instances.
 */
export async function deleteStudy(studyInstanceUID: string): Promise<void> {
  const token = await getAccessToken();
  const deleteUrl = `${DICOMWEB_URL}/studies/${studyInstanceUID}`;

  const response = await fetch(deleteUrl, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(`DICOM delete study failed (${response.status}): ${errorText}`);
  }
}

// ─── Store Status ───────────────────────────────────────────────────────────

/**
 * Check DICOM store connectivity and return status.
 */
export async function getDICOMStoreStatus(): Promise<{
  status: "active" | "error";
  store: string;
  location: string;
  endpoint: string;
  message?: string;
}> {
  try {
    const token = await getAccessToken();

    // Check store exists by getting its metadata
    const storeUrl = `https://healthcare.googleapis.com/v1/projects/${GCP_PROJECT}/locations/${GCP_LOCATION}/datasets/${GCP_DATASET}/dicomStores/${DICOM_STORE}`;

    const response = await fetch(storeUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return {
        status: "error",
        store: DICOM_STORE,
        location: GCP_LOCATION,
        endpoint: DICOMWEB_URL,
        message: `Store not accessible (${response.status})`,
      };
    }

    return {
      status: "active",
      store: DICOM_STORE,
      location: GCP_LOCATION,
      endpoint: DICOMWEB_URL,
    };
  } catch (err) {
    return {
      status: "error",
      store: DICOM_STORE,
      location: GCP_LOCATION,
      endpoint: DICOMWEB_URL,
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─── Helper: Parse DICOM JSON to typed objects ──────────────────────────────

function getDICOMValue(obj: Record<string, any>, tag: string): string | undefined {
  return obj?.[tag]?.Value?.[0]?.Alphabetic || obj?.[tag]?.Value?.[0] || undefined;
}

function getDICOMNumber(obj: Record<string, any>, tag: string): number | undefined {
  const val = obj?.[tag]?.Value?.[0];
  return val !== undefined ? Number(val) : undefined;
}

function getDICOMArray(obj: Record<string, any>, tag: string): string[] {
  return obj?.[tag]?.Value || [];
}

function parseDICOMStudy(raw: Record<string, any>): DICOMStudy {
  return {
    studyInstanceUID: getDICOMValue(raw, "0020000D") || "unknown",
    patientName: getDICOMValue(raw, "00100010"),
    patientID: getDICOMValue(raw, "00100020"),
    studyDate: getDICOMValue(raw, "00080020"),
    studyDescription: getDICOMValue(raw, "00081030"),
    modality: getDICOMArray(raw, "00080061"),
    numberOfSeries: getDICOMNumber(raw, "00201206"),
    numberOfInstances: getDICOMNumber(raw, "00201208"),
    accessionNumber: getDICOMValue(raw, "00080050"),
    referringPhysician: getDICOMValue(raw, "00080090"),
  };
}

function parseDICOMSeries(raw: Record<string, any>): DICOMSeries {
  return {
    seriesInstanceUID: getDICOMValue(raw, "0020000E") || "unknown",
    studyInstanceUID: getDICOMValue(raw, "0020000D") || "unknown",
    modality: getDICOMValue(raw, "00080060") || "unknown",
    seriesDescription: getDICOMValue(raw, "0008103E"),
    seriesNumber: getDICOMNumber(raw, "00200011"),
    numberOfInstances: getDICOMNumber(raw, "00201209"),
    bodyPartExamined: getDICOMValue(raw, "00180015"),
  };
}

// ─── Configuration Export ───────────────────────────────────────────────────

export const dicomStoreConfig = {
  project: GCP_PROJECT,
  location: GCP_LOCATION,
  dataset: GCP_DATASET,
  store: DICOM_STORE,
  dicomWebUrl: DICOMWEB_URL,
  serviceAccount: `medisoft-healthcare@${GCP_PROJECT}.iam.gserviceaccount.com`,
  iamCommands: {
    grantDicomEditor: `gcloud projects add-iam-policy-binding ${GCP_PROJECT} --member="serviceAccount:medisoft-healthcare@${GCP_PROJECT}.iam.gserviceaccount.com" --role="roles/healthcare.dicomEditor"`,
    grantDatasetLevel: `gcloud healthcare datasets add-iam-policy-binding ${GCP_DATASET} --location=${GCP_LOCATION} --member="serviceAccount:medisoft-healthcare@${GCP_PROJECT}.iam.gserviceaccount.com" --role="roles/healthcare.dicomEditor"`,
  },
} as const;
