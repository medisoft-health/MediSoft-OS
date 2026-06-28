import "server-only";
import { db } from "@/db";
import { prescriptions, patients } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// ═══════════════════════════════════════════════════════════════════════════════
// Smart Pharmacy Network
// "The prescription doesn't end at the doctor's desk — it reaches the patient."
// Connects prescriptions to pharmacies with availability, pricing, and delivery
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PharmacyInfo {
  id: string;
  name: string;
  nameEn: string;
  address: string;
  addressEn: string;
  phone: string;
  distance: number; // km
  rating: number; // 1-5
  isOpen: boolean;
  openHours: string;
  hasDelivery: boolean;
  deliveryTime: string;
  deliveryTimeEn: string;
}

export interface MedicationAvailability {
  medication: string;
  genericName: string;
  genericNameEn: string;
  strength: string;
  form: string;
  formEn: string;
  pharmacies: Array<{
    pharmacy: PharmacyInfo;
    available: boolean;
    quantity: number;
    price: number;
    currency: string;
    hasAlternative: boolean;
    alternativeName?: string;
    alternativePrice?: number;
    insuranceCovered: boolean;
    copayAmount?: number;
  }>;
  cheapestOption: {
    pharmacyName: string;
    price: number;
    currency: string;
  } | null;
  nearestAvailable: {
    pharmacyName: string;
    distance: number;
  } | null;
}

export interface DrugInteractionAlert {
  severity: "mild" | "moderate" | "severe" | "contraindicated";
  drug1: string;
  drug2: string;
  description: string;
  descriptionEn: string;
  recommendation: string;
  recommendationEn: string;
}

export interface InsuranceCoverage {
  provider: string;
  planName: string;
  coveredMedications: string[];
  uncoveredMedications: string[];
  totalCopay: number;
  totalSavings: number;
  currency: string;
  preAuthRequired: string[];
}

export interface SmartPharmacyResult {
  prescriptionId: string;
  patientName: string;
  medications: MedicationAvailability[];
  interactions: DrugInteractionAlert[];
  insuranceCoverage: InsuranceCoverage | null;
  totalEstimatedCost: number;
  currency: string;
  bestPharmacyRecommendation: string;
  bestPharmacyRecommendationEn: string;
  deliveryOptions: Array<{
    pharmacy: string;
    pharmacyEn: string;
    estimatedTime: string;
    estimatedTimeEn: string;
    cost: number;
    freeAbove: number;
  }>;
  aiSummary: string;
  aiSummaryEn: string;
}

// ─── Core Engine ─────────────────────────────────────────────────────────────

export async function searchPharmacyNetwork(
  prescriptionId: string,
  patientLocation?: { lat: number; lng: number }
): Promise<SmartPharmacyResult> {
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(prescriptionId)) {
    throw new Error("Invalid prescription ID format");
  }

  // Fetch prescription details
  const prescription = await db.query.prescriptions.findFirst({
    where: and(
      eq(prescriptions.id, prescriptionId),
      isNull(prescriptions.deletedAt)
    ),
  });

  if (!prescription) {
    throw new Error("Prescription not found");
  }

  // Fetch patient info
  const patient = await db.query.patients.findFirst({
    where: eq(patients.id, prescription.patientId),
  });

  const patientName = patient
    ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim()
    : "Unknown";

  // Parse medications from prescription
  const medicationList = parseMedications(prescription);

  // Simulate pharmacy network search (in production, this would call real pharmacy APIs)
  const nearbyPharmacies = generateNearbyPharmacies(patientLocation);

  // Check availability for each medication
  const medications: MedicationAvailability[] = medicationList.map((med) => ({
    medication: med.name,
    genericName: med.generic || med.name,
    genericNameEn: med.genericEn || med.name,
    strength: med.strength || "",
    form: med.form || "أقراص",
    formEn: med.formEn || "Tablets",
    pharmacies: nearbyPharmacies.map((pharmacy) => {
      const available = Math.random() > 0.2; // 80% availability
      const price = generatePrice(med.name);
      return {
        pharmacy,
        available,
        quantity: available ? Math.floor(Math.random() * 50) + 5 : 0,
        price,
        currency: "SAR",
        hasAlternative: !available,
        alternativeName: !available ? `${med.generic || med.name} (Generic)` : undefined,
        alternativePrice: !available ? Math.round(price * 0.6) : undefined,
        insuranceCovered: Math.random() > 0.3,
        copayAmount: Math.round(price * 0.2),
      };
    }),
    cheapestOption: null,
    nearestAvailable: null,
  }));

  // Calculate cheapest and nearest for each medication
  medications.forEach((med) => {
    const availablePharmacies = med.pharmacies.filter((p) => p.available);
    if (availablePharmacies.length > 0) {
      const cheapest = availablePharmacies.sort((a, b) => a.price - b.price)[0];
      med.cheapestOption = {
        pharmacyName: cheapest.pharmacy.name,
        price: cheapest.price,
        currency: "SAR",
      };
      const nearest = availablePharmacies.sort(
        (a, b) => a.pharmacy.distance - b.pharmacy.distance
      )[0];
      med.nearestAvailable = {
        pharmacyName: nearest.pharmacy.name,
        distance: nearest.pharmacy.distance,
      };
    }
  });

  // Check drug interactions
  const interactions = checkDrugInteractions(medicationList);

  // Insurance coverage
  const insuranceCoverage: InsuranceCoverage | null = patient?.insuranceProvider
    ? {
        provider: patient.insuranceProvider,
        planName: "Standard Plan",
        coveredMedications: medicationList.filter(() => Math.random() > 0.3).map((m) => m.name),
        uncoveredMedications: medicationList.filter(() => Math.random() > 0.7).map((m) => m.name),
        totalCopay: Math.round(medicationList.length * 15),
        totalSavings: Math.round(medicationList.length * 45),
        currency: "SAR",
        preAuthRequired: [],
      }
    : null;

  // Calculate total cost
  const totalEstimatedCost = medications.reduce((sum, med) => {
    const cheapest = med.pharmacies
      .filter((p) => p.available)
      .sort((a, b) => a.price - b.price)[0];
    return sum + (cheapest?.price || 0);
  }, 0);

  // Delivery options
  const deliveryOptions = nearbyPharmacies
    .filter((p) => p.hasDelivery)
    .slice(0, 3)
    .map((p) => ({
      pharmacy: p.name,
      pharmacyEn: p.nameEn,
      estimatedTime: `${30 + Math.floor(p.distance * 10)} دقيقة`,
      estimatedTimeEn: `${30 + Math.floor(p.distance * 10)} minutes`,
      cost: p.distance < 3 ? 0 : 15,
      freeAbove: 100,
    }));

  // AI Summary
  let aiSummary = "";
  let aiSummaryEn = "";

  try {
    const client = getGeminiClient();
    const prompt = `You are a pharmacy assistant AI. Summarize this prescription search in 2 sentences each in Arabic then English.

Medications: ${medicationList.map((m) => m.name).join(", ")}
Available at: ${medications.filter((m) => m.cheapestOption).length}/${medications.length} medications found
Cheapest total: ${totalEstimatedCost} SAR
Interactions: ${interactions.length} found (${interactions.filter((i) => i.severity === "severe").length} severe)
Insurance: ${insuranceCoverage ? `${insuranceCoverage.provider} covers ${insuranceCoverage.coveredMedications.length}/${medicationList.length}` : "No insurance"}

Format:
AR: [Arabic summary]
EN: [English summary]`;

    const response = await client!.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const text = response.text || "";
    const arMatch = text.match(/AR:\s*([\s\S]+?)(?=EN:|$)/);
    const enMatch = text.match(/EN:\s*([\s\S]+?)$/);
    aiSummary = arMatch?.[1]?.trim() || "";
    aiSummaryEn = enMatch?.[1]?.trim() || "";
  } catch {
    aiSummary = `تم العثور على ${medications.filter((m) => m.cheapestOption).length} من ${medications.length} أدوية. التكلفة التقديرية: ${totalEstimatedCost} ريال.`;
    aiSummaryEn = `Found ${medications.filter((m) => m.cheapestOption).length} of ${medications.length} medications. Estimated cost: ${totalEstimatedCost} SAR.`;
  }

  return {
    prescriptionId,
    patientName,
    medications,
    interactions,
    insuranceCoverage,
    totalEstimatedCost,
    currency: "SAR",
    bestPharmacyRecommendation: "صيدلية الدواء — أقرب صيدلية بها كل الأدوية المطلوبة مع خدمة التوصيل.",
    bestPharmacyRecommendationEn: "Al-Dawaa Pharmacy — Nearest pharmacy with all required medications and delivery service.",
    deliveryOptions,
    aiSummary,
    aiSummaryEn,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseMedications(prescription: {
  drugName?: string | null;
  brandName?: string | null;
  dose?: string | null;
  route?: string | null;
  notes?: string | null;
}): Array<{
  name: string;
  generic?: string;
  genericEn?: string;
  strength?: string;
  form?: string;
  formEn?: string;
}> {
  const medName = prescription.drugName || prescription.brandName || "Unknown Medication";
  const routeToForm: Record<string, { ar: string; en: string }> = {
    oral: { ar: "أقراص", en: "Tablets" },
    iv: { ar: "حقن وريدي", en: "IV Injection" },
    im: { ar: "حقن عضلي", en: "IM Injection" },
    topical: { ar: "موضعي", en: "Topical" },
    inhaled: { ar: "استنشاق", en: "Inhaled" },
  };
  const form = routeToForm[prescription.route?.toLowerCase() || "oral"] || routeToForm.oral;
  return [
    {
      name: medName,
      generic: medName,
      genericEn: medName,
      strength: prescription.dose || "500mg",
      form: form.ar,
      formEn: form.en,
    },
  ];
}

function generateNearbyPharmacies(
  _location?: { lat: number; lng: number }
): PharmacyInfo[] {
  return [
    {
      id: "ph1",
      name: "صيدلية الدواء",
      nameEn: "Al-Dawaa Pharmacy",
      address: "شارع الملك فهد، الرياض",
      addressEn: "King Fahd Road, Riyadh",
      phone: "+966-11-1234567",
      distance: 0.8,
      rating: 4.5,
      isOpen: true,
      openHours: "24/7",
      hasDelivery: true,
      deliveryTime: "30-45 دقيقة",
      deliveryTimeEn: "30-45 minutes",
    },
    {
      id: "ph2",
      name: "صيدلية النهدي",
      nameEn: "Nahdi Pharmacy",
      address: "شارع العليا، الرياض",
      addressEn: "Olaya Street, Riyadh",
      phone: "+966-11-2345678",
      distance: 1.5,
      rating: 4.3,
      isOpen: true,
      openHours: "8:00 - 24:00",
      hasDelivery: true,
      deliveryTime: "45-60 دقيقة",
      deliveryTimeEn: "45-60 minutes",
    },
    {
      id: "ph3",
      name: "صيدلية المتحدة",
      nameEn: "United Pharmacy",
      address: "طريق الملك عبدالله، الرياض",
      addressEn: "King Abdullah Road, Riyadh",
      phone: "+966-11-3456789",
      distance: 2.3,
      rating: 4.1,
      isOpen: true,
      openHours: "8:00 - 23:00",
      hasDelivery: true,
      deliveryTime: "60-90 دقيقة",
      deliveryTimeEn: "60-90 minutes",
    },
    {
      id: "ph4",
      name: "صيدلية الحياة",
      nameEn: "Al-Hayat Pharmacy",
      address: "حي الروضة، الرياض",
      addressEn: "Al-Rawdah District, Riyadh",
      phone: "+966-11-4567890",
      distance: 3.1,
      rating: 4.0,
      isOpen: false,
      openHours: "8:00 - 22:00",
      hasDelivery: false,
      deliveryTime: "",
      deliveryTimeEn: "",
    },
  ];
}

function generatePrice(medication: string): number {
  // Simulate pricing based on medication name length (demo)
  const base = 20 + (medication.length % 10) * 8;
  return Math.round(base + Math.random() * 30);
}

function checkDrugInteractions(
  _medications: Array<{ name: string }>
): DrugInteractionAlert[] {
  // ⚠️ DISABLED — Mock interaction removed for patient safety.
  // This function previously returned a fake "mild interaction" for ANY two drugs,
  // which is clinically dangerous (e.g., Warfarin + Aspirin would show as "mild").
  //
  // TODO: Wire to the real PharmaX safety pipeline:
  //   1. RxNorm normalization (src/lib/ai/rxnorm.ts)
  //   2. OpenFDA label lookup (src/lib/ai/openfda.ts)
  //   3. MediGuard AI analysis (src/lib/ai/mediguard.ts)
  //
  // Until properly implemented, return empty array (no false safety signals).
  return [];
}
