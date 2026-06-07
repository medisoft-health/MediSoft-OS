# Google Cloud Healthcare API & Google Integrations Audit Report

This report presents a comprehensive audit of all Google Cloud Healthcare API (FHIR R4, DICOM, Consent Management), Google Health AI Foundation Models (Vertex AI), Google Health Connect, Google Cloud Storage, and Firebase integrations within the MediSoft-OS platform.

---

## Executive Summary

The MediSoft-OS platform features extensive integration with Google Cloud services, specifically targeting medical workflows. While the core implementations are structurally sound, the audit identified critical issues across several domains:
1. **Authentication Inconsistencies**: Multiple conflicting paths to Google Service Account credentials are hardcoded as fallbacks across various modules, and OAuth2 scopes vary.
2. **Missing GCS Integration**: Medical scans are currently stored on the local filesystem. The Google Cloud Storage (GCS) integration is entirely missing and marked as a `TODO`.
3. **Resilience & Reliability Gaps**: Wrapper APIs do not implement request retries, exponential backoffs, or timeout limits. If GCP encounters a transient network issue or rate limits are hit, exceptions will bubble up directly to the application.
4. **Infinite Loops / Resource Leaks**: The FHIR/DICOM de-identification polling utility uses an unbounded `while (true)` loop without a maximum timeout, posing a potential lock/leak hazard.
5. **Legacy Firebase API**: FCM push notifications are routed through a deprecated API endpoint (`fcm.googleapis.com/fcm/send`) that Google is sunsetting.

---

## 1. Directory & Files Audited

The primary directory containing these integrations is `src/lib/google-health/`. The files audited are:

| File Path | Primary Integration | Status |
| :--- | :--- | :--- |
| `src/lib/google-health/fhir-client.ts` | Cloud Healthcare API (FHIR R4) | **Needs-Fix** |
| `src/lib/google-health/consent-management.ts` | Cloud Healthcare API (Consent Store) | **Needs-Fix** |
| `src/lib/google-health/dicom-store.ts` | Cloud Healthcare API (DICOMweb Store) | **Needs-Fix** |
| `src/lib/google-health/deidentification.ts` | Cloud Healthcare API (De-identification) | **Needs-Fix** |
| `src/lib/google-health/medasr.ts` | Vertex AI (Medical ASR) / Gemini | **Needs-Fix** |
| `src/lib/google-health/medgemma.ts` | Vertex AI (Clinical LLM) / Gemini | **Needs-Fix** |
| `src/lib/google-health/medsiglip.ts` | Vertex AI (Medical Vision) / Gemini | **Needs-Fix** |
| `src/lib/google-health/path-foundation.ts` | Vertex AI (Pathology) / Gemini | **Needs-Fix** |
| `src/lib/google-health/hear.ts` | Vertex AI (Health Acoustics) / Gemini | **Needs-Fix** |
| `src/lib/google-health/txgemma.ts` | Vertex AI (Therapeutic LLM) / Gemini | **Needs-Fix** |
| `src/lib/google-health/health-connect.ts` | Google Fitness / Health Connect OAuth2 | **Needs-Fix** |
| `src/lib/storage/scans.ts` | Google Cloud Storage (GCS) | **Broken / Missing** |
| `src/lib/notifications/notification-service.ts` | Firebase Cloud Messaging (FCM) | **Needs-Fix** |
| `src/lib/google-health/fhir-mapper.ts` | Data Conversion Helper (No API calls) | **Working** |
| `src/lib/google-health/co-clinician.ts` | Conversational Helper (No Vertex calls) | **Working** |

---

## 2. Detailed Findings & Code Snippets

### Finding 2.1: Hardcoded Mismatched Credentials Paths & Scopes
Different modules define different service account credential fallback paths. If environment variables are missing, this creates silent configuration discrepancies across environments.

**Code References:**
* `consent-management.ts` (Line 56):
```typescript
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS 
  || "/home/ubuntu/medisoft-app/gcp-credentials.json";
```
* `dicom-store.ts` (Line 112) & `deidentification.ts` (Line 110):
```typescript
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS 
  || "/etc/medisoft/credentials/gcp-credentials.json";
```
* `fhir-client.ts` (Line 149):
```typescript
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "";
```

**Scope Discrepancies:**
* Consent Management requests only: `https://www.googleapis.com/auth/cloud-healthcare`.
* FHIR Client & DICOM Store request: `https://www.googleapis.com/auth/cloud-healthcare https://www.googleapis.com/auth/cloud-platform`.
* Vertex AI wrappers request: `https://www.googleapis.com/auth/cloud-platform`.

---

### Finding 2.2: Missing Google Cloud Storage (GCS) Integration
Medical images (scans) are stored on the local filesystem under `<cwd>/uploads/scans/`. The production GCS integration is completely missing.

**Code Reference (`src/lib/storage/scans.ts` Line 16-20):**
```typescript
// TODO: Migrate to Google Cloud Storage (GCS) before scaling to production.
//       Required env vars: GCS_BUCKET_NAME, GOOGLE_APPLICATION_CREDENTIALS
//       Package to install: @google-cloud/storage
//       Replace writeFile/readFile with Storage.bucket().file().save()/.getSignedUrl()
```

---

### Finding 2.3: Unbounded Loop in Operation Polling
The de-identification service monitors long-running GCP operations with an infinite `while (true)` loop. If the API halts or fails to update the status, the server-side action polls indefinitely.

**Code Reference (`src/lib/google-health/deidentification.ts` Line 433-447):**
```typescript
  while (true) {
    const statusRes = await fetch(
      `https://healthcare.googleapis.com/v1/${operationId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!statusRes.ok) throw new Error("Failed to check operation status");
    const statusData = await statusRes.json();
    if (statusData.done) {
      if (statusData.error) throw new Error(`De-identification failed: ${statusData.error.message}`);
      return statusData.response;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
```

---

### Finding 2.4: Lack of Error Recovery, Retries, and Timeouts
All outbound HTTP connections to GCP services use raw `fetch` requests without timeouts, retry mechanisms, or exponential backoffs.

**Code Reference (Typical Wrapper Pattern in `src/lib/google-health/fhir-client.ts` Line 213-228):**
```typescript
export async function getFHIRResource(resourcePath: string): Promise<any> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/fhir/${resourcePath}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/fhir+json",
    },
  });
  if (!res.ok) {
    throw new Error(`FHIR read failed: ${await res.text()}`);
  }
  return res.json();
}
```

---

### Finding 2.5: Legacy FCM Push API
The push notification service uses the legacy FCM URL scheme and server keys, which Google has officially deprecated.

**Code Reference (`src/lib/notifications/notification-service.ts` Line 173-184):**
```typescript
          const fcmRes = await fetch("https://fcm.googleapis.com/fcm/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `key=${process.env.FCM_SERVER_KEY || ""}`,
            },
            body: JSON.stringify({
              to: sub.fcmToken,
              notification: { title, body, click_action: actionUrl },
              data: { url: actionUrl },
            }),
          });
```

---

### Finding 2.6: Duplicated Authentication Boilerplate in Vertex AI Models
Six Vertex AI foundation model files contain duplicate, boilerplate code for generating Google OAuth tokens and signed JWTs.

**Code References (Boilerplate present in `medasr.ts`, `medgemma.ts`, `medsiglip.ts`, `path-foundation.ts`, `hear.ts`, `txgemma.ts`):**
```typescript
  const creds = JSON.parse(fs.readFileSync(credPath, "utf-8"));
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = { iss: creds.client_email, scope: "...", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 };
  const b64url = (d: Buffer) => d.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const h = b64url(Buffer.from(JSON.stringify(header)));
  const p = b64url(Buffer.from(JSON.stringify(payload)));
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(`${h}.${p}`);
  const sig = b64url(sign.sign(creds.private_key));
  const res = await fetch("https://oauth2.googleapis.com/token", { ... });
```

---

## 3. Recommendations & Remediation Plan

### Recommendation 3.1: Centralize GCP Authentication
1. **Action**: Create a single authentication utility (e.g., `src/lib/google-health/auth.ts`) containing a single `getAccessToken(scope: string)` helper.
2. **Action**: Standardize the credential fallback location to use only `process.env.GOOGLE_APPLICATION_CREDENTIALS` or a single config-defined system path.
3. **Action**: Use the standard `google-auth-library` or standard GCP SDK credentials when possible, avoiding manual JWT signing.

### Recommendation 3.2: Implement GCS Storage Provider
1. **Action**: Implement GCS storage in `src/lib/storage/scans.ts` using the `@google-cloud/storage` SDK.
2. **Action**: Keep the local disk storage provider as a fallback for local developers, switching based on environment flags (e.g., `USE_GCS_STORAGE=true`).

### Recommendation 3.3: Introduce Request Resilience (Retries/Timeouts)
1. **Action**: Implement a wrapper helper (e.g., `fetchWithRetry`) that includes:
   * Maximum timeout configuration.
   * Exponential backoff retries for status codes `429` (Too Many Requests), `502`, `503`, and `504`.
   * Transparent handling of expired credentials.

### Recommendation 3.4: Protect Operation Polling Loops
1. **Action**: Replace the unbounded loop in `deidentification.ts` with a timeout-guarded loop:
```typescript
  const MAX_POLLS = 60; // Max 5 minutes (5s interval)
  let polls = 0;
  while (polls < MAX_POLLS) {
    // Poll...
    polls++;
    await delay(5000);
  }
  throw new Error("De-identification operation timed out after 5 minutes");
```

### Recommendation 3.5: Migrate to FCM HTTP v1 API
1. **Action**: Update the notification service to target the modern HTTP v1 endpoint:
   `https://fcm.googleapis.com/v1/projects/{projectId}/messages:send`
2. **Action**: Authenticate calls using Google OAuth2 credentials rather than the legacy static server key.
