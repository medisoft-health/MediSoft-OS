/**
 * Google Cloud Healthcare DICOM Store API
 *
 * Full DICOMweb integration:
 *   - STOW-RS: Store DICOM instances
 *   - WADO-RS: Retrieve DICOM studies/series/instances
 *   - QIDO-RS: Query/search DICOM studies
 *   - Metadata: Retrieve study metadata
 *
 * Integrates with MediScan for AI-powered radiology analysis.
 *
 * @see https://cloud.google.com/healthcare-api/docs/how-tos/dicomweb
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import {
  healthcareConfig,
  storeDICOMInstance,
  retrieveDICOMStudy,
  searchDICOMStudies,
} from "@/lib/google-health/fhir-client";

// ─── GET /api/google-health/dicom ────────────────────────────────────────────
// Returns DICOM Store status and capabilities
export async function GET() {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    return NextResponse.json({
      status: "active",
      store: {
        name: healthcareConfig.dicomStore,
        location: healthcareConfig.location,
        dataset: healthcareConfig.dataset,
        endpoint: healthcareConfig.dicomUrl,
      },
      capabilities: {
        stowRS: {
          description: "Store DICOM instances",
          endpoint: `${healthcareConfig.dicomUrl}/dicomWeb/studies`,
          methods: ["POST"],
          contentTypes: ["application/dicom", "multipart/related"],
        },
        wadoRS: {
          description: "Retrieve DICOM studies/series/instances",
          endpoint: `${healthcareConfig.dicomUrl}/dicomWeb/studies/{studyUID}`,
          methods: ["GET"],
          formats: ["application/dicom", "image/png", "image/jpeg"],
        },
        qidoRS: {
          description: "Query DICOM studies",
          endpoint: `${healthcareConfig.dicomUrl}/dicomWeb/studies`,
          methods: ["GET"],
          queryParams: ["PatientName", "PatientID", "StudyDate", "Modality", "StudyDescription"],
        },
      },
      supportedModalities: [
        { code: "CR", name: "Computed Radiography" },
        { code: "CT", name: "Computed Tomography" },
        { code: "MR", name: "Magnetic Resonance" },
        { code: "US", name: "Ultrasound" },
        { code: "DX", name: "Digital Radiography" },
        { code: "MG", name: "Mammography" },
        { code: "NM", name: "Nuclear Medicine" },
        { code: "PT", name: "PET" },
        { code: "XA", name: "X-Ray Angiography" },
      ],
      integration: {
        mediscan: "AI-powered analysis via Gemini 2.5 Pro",
        fhir: "ImagingStudy resources linked to FHIR store",
        medsigLIP: "Medical image classification pre-screening",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : "Failed to connect to DICOM Store" },
      { status: 500 },
    );
  }
}

// ─── POST /api/google-health/dicom ───────────────────────────────────────────
// Actions: store, retrieve, search, metadata
export async function POST(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const contentType = req.headers.get("content-type") || "";

    // Handle multipart DICOM upload (STOW-RS)
    if (contentType.includes("application/dicom") || contentType.includes("multipart/related")) {
      const buffer = Buffer.from(await req.arrayBuffer());
      const result = await storeDICOMInstance(buffer);
      return NextResponse.json({
        success: true,
        action: "store",
        studyInstanceUID: result.studyInstanceUID,
        message: "DICOM instance stored successfully",
        dicomWebUrl: `${healthcareConfig.dicomUrl}/dicomWeb/studies/${result.studyInstanceUID}`,
      });
    }

    // Handle JSON actions
    const body = await req.json();
    const { action } = body;

    // ─── STORE: Upload DICOM from base64 ─────────────────────────────
    if (action === "store") {
      const { dicomBase64, patientId, studyDescription, modality } = body;
      if (!dicomBase64) {
        return NextResponse.json({ error: "dicomBase64 is required" }, { status: 400 });
      }

      const buffer = Buffer.from(dicomBase64, "base64");
      const result = await storeDICOMInstance(buffer);

      return NextResponse.json({
        success: true,
        action: "store",
        studyInstanceUID: result.studyInstanceUID,
        patientId,
        studyDescription: studyDescription || "Unknown",
        modality: modality || "OT",
        message: "DICOM instance stored in Cloud Healthcare DICOM Store",
        endpoints: {
          retrieve: `/api/google-health/dicom?action=retrieve&studyUID=${result.studyInstanceUID}`,
          metadata: `/api/google-health/dicom?action=metadata&studyUID=${result.studyInstanceUID}`,
          analyze: `/api/mediscan/analyze`,
        },
      });
    }

    // ─── RETRIEVE: WADO-RS ───────────────────────────────────────────
    if (action === "retrieve") {
      const { studyInstanceUID } = body;
      if (!studyInstanceUID) {
        return NextResponse.json({ error: "studyInstanceUID is required" }, { status: 400 });
      }

      const dicomData = await retrieveDICOMStudy(studyInstanceUID);
      return new Response(dicomData, {
        headers: {
          "Content-Type": "multipart/related; type=application/dicom",
          "Content-Length": String(dicomData.byteLength),
        },
      });
    }

    // ─── SEARCH: QIDO-RS ────────────────────────────────────────────
    if (action === "search") {
      const { patientName, patientId, studyDate, modality, limit } = body;
      const params: Record<string, string> = {};
      if (patientName) params["PatientName"] = patientName;
      if (patientId) params["PatientID"] = patientId;
      if (studyDate) params["StudyDate"] = studyDate;
      if (modality) params["ModalitiesInStudy"] = modality;
      if (limit) params["limit"] = String(limit);

      const studies = await searchDICOMStudies(params);

      // Parse DICOM JSON into readable format
      const parsedStudies = studies.map((study: any) => ({
        studyInstanceUID: study?.["0020000D"]?.Value?.[0] || "unknown",
        patientName: study?.["00100010"]?.Value?.[0]?.Alphabetic || "Unknown",
        patientId: study?.["00100020"]?.Value?.[0] || "Unknown",
        studyDate: study?.["00080020"]?.Value?.[0] || "Unknown",
        studyDescription: study?.["00081030"]?.Value?.[0] || "No description",
        modality: study?.["00080061"]?.Value?.[0] || "Unknown",
        numberOfSeries: study?.["00201206"]?.Value?.[0] || 0,
        numberOfInstances: study?.["00201208"]?.Value?.[0] || 0,
        accessionNumber: study?.["00080050"]?.Value?.[0] || "",
      }));

      return NextResponse.json({
        success: true,
        action: "search",
        totalResults: parsedStudies.length,
        studies: parsedStudies,
        query: params,
      });
    }

    // ─── METADATA: Study metadata ───────────────────────────────────
    if (action === "metadata") {
      const { studyInstanceUID } = body;
      if (!studyInstanceUID) {
        return NextResponse.json({ error: "studyInstanceUID is required" }, { status: 400 });
      }

      // Search for this specific study
      const studies = await searchDICOMStudies({ StudyInstanceUID: studyInstanceUID });
      if (!studies || studies.length === 0) {
        return NextResponse.json({ error: "Study not found" }, { status: 404 });
      }

      const study: any = studies[0];
      return NextResponse.json({
        success: true,
        action: "metadata",
        study: {
          studyInstanceUID: study?.["0020000D"]?.Value?.[0] || studyInstanceUID,
          patientName: study?.["00100010"]?.Value?.[0]?.Alphabetic || "Unknown",
          patientId: study?.["00100020"]?.Value?.[0] || "Unknown",
          patientBirthDate: study?.["00100030"]?.Value?.[0] || "Unknown",
          patientSex: study?.["00100040"]?.Value?.[0] || "Unknown",
          studyDate: study?.["00080020"]?.Value?.[0] || "Unknown",
          studyTime: study?.["00080030"]?.Value?.[0] || "Unknown",
          studyDescription: study?.["00081030"]?.Value?.[0] || "No description",
          modality: study?.["00080061"]?.Value?.[0] || "Unknown",
          referringPhysician: study?.["00080090"]?.Value?.[0]?.Alphabetic || "Unknown",
          institutionName: study?.["00080080"]?.Value?.[0] || "Unknown",
          numberOfSeries: study?.["00201206"]?.Value?.[0] || 0,
          numberOfInstances: study?.["00201208"]?.Value?.[0] || 0,
        },
      });
    }

    // ─── LINK TO FHIR: Create ImagingStudy resource ─────────────────
    if (action === "link_to_fhir") {
      const { studyInstanceUID, patientFhirId, modality, description } = body;
      if (!studyInstanceUID || !patientFhirId) {
        return NextResponse.json(
          { error: "studyInstanceUID and patientFhirId are required" },
          { status: 400 },
        );
      }

      // Import FHIR functions
      const { createFHIRResource } = await import("@/lib/google-health/fhir-client");

      const imagingStudy = {
        resourceType: "ImagingStudy" as const,
        status: "available" as const,
        subject: { reference: `Patient/${patientFhirId}` },
        started: new Date().toISOString(),
        modality: modality ? [{ system: "http://dicom.nema.org/resources/ontology/DCM", code: modality }] : undefined,
        numberOfSeries: 1,
        numberOfInstances: 1,
        description: description || "DICOM Study",
        series: [{
          uid: studyInstanceUID,
          modality: { system: "http://dicom.nema.org/resources/ontology/DCM", code: modality || "OT" },
          numberOfInstances: 1,
          instance: [{
            uid: studyInstanceUID,
            sopClass: { system: "urn:ietf:rfc:3986", code: "1.2.840.10008.5.1.4.1.1.2" },
          }],
        }],
      };

      const fhirResult = await createFHIRResource(imagingStudy as any);

      return NextResponse.json({
        success: true,
        action: "link_to_fhir",
        imagingStudyId: fhirResult.id,
        studyInstanceUID,
        patientFhirId,
        message: "DICOM study linked to FHIR ImagingStudy resource",
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error("[api/google-health/dicom] Error:", err);
    const message = err instanceof Error ? err.message : "DICOM operation failed";

    // Handle permission errors gracefully
    if (message.includes("PERMISSION_DENIED")) {
      return NextResponse.json({
        error: "DICOM Store permission denied. Please add 'Healthcare DICOM Store Admin' role to the service account.",
        details: message,
        fix: "Add roles/healthcare.dicomStoreAdmin to medisoft-healthcare@gen-lang-client-0619493108.iam.gserviceaccount.com",
      }, { status: 403 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
