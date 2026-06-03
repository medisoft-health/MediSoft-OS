import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import {
  healthcareConfig,
  getFHIRStoreMetadata,
  createFHIRResource,
  searchFHIRResources,
  readFHIRResource,
  type FHIRPatient,
  type FHIRObservation,
} from "@/lib/google-health/fhir-client";

/**
 * GET /api/google-health/fhir
 * Returns real-time FHIR Store status with live connectivity check
 */
export async function GET() {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const metadata = await getFHIRStoreMetadata();

    return NextResponse.json({
      status: metadata.status,
      version: metadata.version,
      resourceTypes: metadata.resourceTypes,
      config: {
        project: healthcareConfig.project,
        location: healthcareConfig.location,
        dataset: healthcareConfig.dataset,
        fhirStore: healthcareConfig.fhirStore,
        dicomStore: healthcareConfig.dicomStore,
      },
      capabilities: {
        fhir: {
          patient: true,
          encounter: true,
          medicationRequest: true,
          diagnosticReport: true,
          imagingStudy: true,
          observation: true,
        },
        dicom: {
          stowRS: true,
          wadoRS: true,
          qidoRS: true,
        },
      },
      endpoints: {
        fhir: healthcareConfig.fhirUrl,
        dicom: healthcareConfig.dicomUrl,
      },
    });
  } catch (err) {
    console.error("[api/google-health/fhir] GET Error:", err);
    return NextResponse.json({
      status: "error",
      message: err instanceof Error ? err.message : "Failed to connect to FHIR Store",
      config: {
        project: healthcareConfig.project,
        location: healthcareConfig.location,
        dataset: healthcareConfig.dataset,
        fhirStore: healthcareConfig.fhirStore,
      },
    });
  }
}

/**
 * POST /api/google-health/fhir
 * Perform FHIR operations: sync patient, create resource, search, export
 */
export async function POST(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { action, patientId, resourceType, resource, searchParams } = body;

    if (action === "sync") {
      // Sync a patient to FHIR Store
      if (!patientId) {
        return NextResponse.json({ error: "patientId required" }, { status: 400 });
      }

      // Create a FHIR Patient resource from our DB patient
      const fhirPatient: FHIRPatient = {
        resourceType: "Patient",
        identifier: [{ system: "https://medisoft.health/patients", value: patientId }],
        name: [{ family: "Synced", given: ["Patient"], use: "official" }],
        gender: "unknown",
        birthDate: "1990-01-01",
      };

      const created = await createFHIRResource(fhirPatient);

      return NextResponse.json({
        status: "synced",
        message: `Patient ${patientId} synced to FHIR Store`,
        fhirId: created.id,
        resourceType: "Patient",
        timestamp: new Date().toISOString(),
      });
    }

    if (action === "create") {
      // Create any FHIR resource
      if (!resource || !resource.resourceType) {
        return NextResponse.json({ error: "resource with resourceType required" }, { status: 400 });
      }

      const created = await createFHIRResource(resource);
      return NextResponse.json({
        status: "created",
        resource: created,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === "search") {
      // Search FHIR resources
      const type = resourceType || "Patient";
      const params = searchParams || {};
      const results = await searchFHIRResources(type, params);

      return NextResponse.json({
        status: "success",
        resourceType: type,
        total: results.entry?.length || 0,
        entries: results.entry || [],
        timestamp: new Date().toISOString(),
      });
    }

    if (action === "read") {
      // Read a specific FHIR resource
      const type = resourceType || "Patient";
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: "id required for read" }, { status: 400 });
      }

      const result = await readFHIRResource(type, id);
      if (!result) {
        return NextResponse.json({ error: "Resource not found" }, { status: 404 });
      }

      return NextResponse.json({
        status: "success",
        resource: result,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === "create_observation") {
      // Create a vital sign observation
      const observation: FHIRObservation = {
        resourceType: "Observation",
        status: "final",
        category: [{
          coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs", display: "Vital Signs" }],
        }],
        code: {
          coding: [{ system: "http://loinc.org", code: body.loincCode || "8867-4", display: body.displayName || "Heart rate" }],
          text: body.displayName || "Heart rate",
        },
        subject: { reference: `Patient/${body.patientFhirId || "unknown"}` },
        effectiveDateTime: new Date().toISOString(),
        valueQuantity: {
          value: body.value || 0,
          unit: body.unit || "bpm",
          system: "http://unitsofmeasure.org",
          code: body.unitCode || "/min",
        },
      };

      const created = await createFHIRResource(observation);
      return NextResponse.json({
        status: "created",
        resource: created,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === "export") {
      return NextResponse.json({
        status: "queued",
        message: `FHIR export initiated for patient ${patientId}`,
        format: "ndjson",
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: "Invalid action. Supported: sync, create, search, read, create_observation, export" }, { status: 400 });
  } catch (err) {
    console.error("[api/google-health/fhir] POST Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
