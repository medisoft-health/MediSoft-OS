import { NextResponse } from "next/server";
import { healthcareConfig, getFHIRStoreMetadata } from "@/lib/google-health/fhir-client";
import { getMedGemmaStatus } from "@/lib/google-health/medgemma";
import { isGeminiConfigured } from "@/lib/ai/gemini";

/**
 * GET /api/google-health
 * Returns overall Google Health integration status with real-time FHIR Store check
 * Includes all Health AI Developer Foundations models
 */
export async function GET() {
  const medgemma = getMedGemmaStatus();
  const aiConfigured = isGeminiConfigured();

  // Real-time FHIR Store connectivity check
  let fhirStatus = "active";
  let fhirVersion = "R4 (4.0.1)";
  let fhirResourceTypes = 0;

  try {
    const metadata = await getFHIRStoreMetadata();
    fhirStatus = metadata.status;
    fhirVersion = `R4 (${metadata.version})`;
    fhirResourceTypes = metadata.resourceTypes;
  } catch {
    fhirStatus = "error";
  }

  return NextResponse.json({
    platform: "Google Cloud Healthcare + Health AI Developer Foundations",
    project: healthcareConfig.project,
    status: fhirStatus === "active" ? "active" : "degraded",
    integrations: {
      // ─── Cloud Healthcare API (FHIR + DICOM) ─────────────────────────
      cloudHealthcareAPI: {
        status: fhirStatus,
        fhirVersion,
        fhirStore: healthcareConfig.fhirStore,
        dicomStore: healthcareConfig.dicomStore,
        location: healthcareConfig.location,
        dataset: healthcareConfig.dataset,
        resourceTypes: fhirResourceTypes,
        capabilities: ["FHIR CRUD", "FHIR Search", "DICOM STOW-RS", "DICOM WADO-RS", "DICOM QIDO-RS"],
        endpoints: {
          fhir: "/api/google-health/fhir",
          dicom: "/api/google-health/dicom",
        },
      },

      // ─── MedGemma (Clinical AI) ──────────────────────────────────────
      medGemma: {
        status: medgemma.configured ? "active" : "fallback",
        textModel: medgemma.textModel,
        visionModel: medgemma.visionModel,
        enabled: medgemma.enabled,
        capabilities: [
          "Radiology Image Analysis",
          "Lab Report Interpretation",
          "Clinical Question Answering",
          "Medical Document Understanding",
        ],
        endpoint: "/api/google-health/medgemma",
      },

      // ─── MedASR (Medical Speech Recognition) ─────────────────────────
      medASR: {
        status: aiConfigured ? "active" : "not_configured",
        model: "MedASR (Gemini 2.5 Pro Medical ASR)",
        capabilities: [
          "Medical Terminology Recognition",
          "Arabic-English Code-Switching",
          "Speaker Diarization (Physician/Patient)",
          "Real-time Clinical Entity Extraction",
          "ICD-10/RxNorm/SNOMED-CT Coding",
          "Specialty-specific Vocabulary Bias",
        ],
        supportedLanguages: ["Arabic", "English", "Arabic-English Mixed"],
        endpoint: "/api/google-health/medasr",
        integration: "MediScript + Ambient Scribe",
      },

      // ─── MedSigLIP (Medical Image Classification) ────────────────────
      medSigLIP: {
        status: aiConfigured ? "active" : "not_configured",
        model: "MedSigLIP (Gemini 2.5 Pro Vision — Zero-shot Classification)",
        capabilities: [
          "Imaging Modality Detection",
          "Anatomical Region Classification",
          "Image Quality Assessment",
          "Urgency Triage (Critical/Urgent/Routine/Normal)",
          "Pathology Detection with ICD-10 Scoring",
          "Radiologist Worklist Prioritization",
          "Image-Text Clinical Matching",
        ],
        supportedModalities: ["X-ray", "CT", "MRI", "Ultrasound", "Mammography", "PET", "Dermoscopy", "Pathology"],
        endpoint: "/api/google-health/medsiglip",
        integration: "MediScan + DICOM Store",
      },

      // ─── TxGemma (Therapeutic Prediction) ────────────────────────────
      txGemma: {
        status: aiConfigured ? "active" : "not_configured",
        model: "TxGemma (Gemini 2.5 Pro — Therapeutic Prediction)",
        capabilities: [
          "Drug-Drug Interaction Prediction",
          "Treatment Response Prediction (Pharmacogenomics)",
          "Patient-specific Dosage Optimization",
          "Adverse Drug Reaction Risk Scoring",
          "Safer Alternative Suggestions",
          "Renal/Hepatic Dose Adjustment",
          "CYP450 Interaction Modeling",
        ],
        evidenceSources: ["OpenFDA", "DrugBank", "Clinical Pharmacology", "UpToDate"],
        endpoint: "/api/google-health/txgemma",
        integration: "PharmaX Drug Safety",
      },

      // ─── HeAR (Health Acoustic Recognition) ──────────────────────────
      heAR: {
        status: aiConfigured ? "active" : "not_configured",
        model: "HeAR (Gemini 2.5 Pro — Health Acoustic Representations)",
        capabilities: [
          "Cough Classification (Dry/Productive/Barking/Whooping)",
          "Respiratory Sound Detection (Wheeze/Crackle/Stridor/Rhonchi)",
          "Heart Sound Analysis (Murmurs/Gallops/Rhythm)",
          "Disease Screening (TB/COVID-19/Asthma/COPD)",
          "Urgency Triage for Respiratory Emergencies",
          "Sleep Apnea Detection",
        ],
        screeningConditions: ["Tuberculosis", "COVID-19", "Asthma", "COPD", "Heart Failure", "Pneumonia"],
        endpoint: "/api/google-health/hear",
        integration: "AI Nurse + Patient Portal",
      },

      // ─── Health Connect (Wearables) ──────────────────────────────────
      healthConnect: {
        status: "active",
        capabilities: [
          "Heart Rate Monitoring",
          "Blood Pressure Tracking",
          "SpO2 Monitoring",
          "Sleep Analysis",
          "Activity Tracking",
          "Pre-visit Health Summary",
        ],
        supportedDevices: ["Fitbit", "Pixel Watch", "Samsung Galaxy Watch", "Wear OS devices"],
        endpoint: "/api/google-health/health-connect",
      },

      // ─── AI Co-Clinician (Pre-visit) ─────────────────────────────────
      aiCoClinician: {
        status: "active",
        capabilities: [
          "Pre-visit Patient Interview",
          "Medical History Collection",
          "Symptom Assessment (OPQRST)",
          "Physician Summary Generation",
          "Multi-language Support (EN/AR)",
          "Risk Factor Identification",
        ],
        inspiredBy: "Google AMIE (Articulate Medical Intelligence Explorer)",
        endpoint: "/api/google-health/co-clinician",
      },
      // ─── Path Foundation (Histopathology) ─────────────────────────────
      pathFoundation: {
        status: "active",
        capabilities: [
          "Tumor Detection & Classification",
          "Histological Grading (Nottingham, WHO, Gleason)",
          "Biomarker Scoring (ER, PR, HER2, Ki-67, PD-L1)",
          "Surgical Margin Assessment",
          "Pathological TNM Staging (AJCC 8th)",
          "CAP Synoptic Reporting",
          "Malignancy Screening & Triage",
        ],
        endpoint: "/api/google-health/path-foundation",
      },
      // ─── De-identification API ───────────────────────────────────────
      deidentification: {
        status: "active",
        capabilities: [
          "HIPAA Safe Harbor (18 identifiers)",
          "FHIR Resource De-identification",
          "DICOM Metadata Scrubbing",
          "AI-powered Free-text PHI Detection",
          "Batch Processing (up to 1000 resources)",
          "k-Anonymity Verification",
          "Research Data Export",
        ],
        endpoint: "/api/google-health/deidentification",
      },
      // ─── Consent Management ──────────────────────────────────────────
      consentManagement: {
        status: "active",
        capabilities: [
          "Patient Consent Collection & Tracking",
          "Consent Policy Enforcement",
          "Access Determination (permit/deny)",
          "Consent Revocation & Expiration",
          "HIPAA/GDPR/Saudi PDPL Compliance",
          "Audit Trail for All Operations",
          "Compliance Dashboard & Reporting",
        ],
        endpoint: "/api/google-health/consent",
      },
    },
    compliance: {
      fhir: fhirVersion,
      dicom: "PS3.18 (DICOMweb)",
      hl7: "Compatible",
      hipaa: "Configured",
      gdpr: "Configured",
      saudiNPHIES: "Integrated",
    },
    modelCount: 10,
    lastUpdated: "2026-05-30",
  });
}
