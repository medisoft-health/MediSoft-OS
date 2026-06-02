import "server-only";
import { getGeminiClient, GEMINI_MODEL, decodeAllStrings } from "@/lib/ai/gemini";

// ─────────────────────────────────────────────────────────────────────────────
// MediDent — World's First Clinical-Grade AI Dental Platform
// 12 integrated modules for comprehensive dental care, AI-powered diagnostics,
// treatment planning, and specialty management
// ─────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
//  TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

// ── FDI Tooth Notation (ISO 3950) ──
export type Quadrant = 1 | 2 | 3 | 4; // UR=1, UL=2, LL=3, LR=4
export type ToothNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type FDITooth = `${Quadrant}${ToothNumber}`; // e.g., "11", "48"
export type ToothSurface = "mesial" | "distal" | "buccal" | "lingual" | "occlusal" | "incisal" | "palatal" | "cervical";

export type ToothCondition =
  | "healthy"
  | "caries"
  | "filled"
  | "crowned"
  | "missing"
  | "impacted"
  | "root_canal"
  | "bridge_abutment"
  | "bridge_pontic"
  | "implant"
  | "veneer"
  | "fractured"
  | "attrition"
  | "erosion"
  | "abrasion"
  | "mobility"
  | "periapical_lesion"
  | "supernumerary"
  | "deciduous"
  | "partially_erupted"
  | "rotated"
  | "tilted";

export type CariesClassification = "I" | "II" | "III" | "IV" | "V" | "VI";

// ── Module 1: Interactive Dental Chart ──
export interface DentalChart {
  patientId: number;
  chartDate: string;
  dentistId: string;
  notation: "FDI" | "Universal" | "Palmer";
  teeth: ToothRecord[];
  missingTeeth: FDITooth[];
  notes: string;
}

export interface ToothRecord {
  toothId: FDITooth;
  condition: ToothCondition;
  surfaces: SurfaceCondition[];
  mobility?: 0 | 1 | 2 | 3; // Miller classification
  furcation?: 0 | 1 | 2 | 3; // Furcation involvement
  notes?: string;
  lastTreated?: string;
  treatmentHistory?: ToothTreatment[];
}

export interface SurfaceCondition {
  surface: ToothSurface;
  condition: "healthy" | "caries" | "filled" | "defective_restoration" | "sealant" | "fracture";
  material?: "composite" | "amalgam" | "ceramic" | "gold" | "glass_ionomer" | "temporary";
  cariesDepth?: "enamel" | "dentin" | "pulp";
}

export interface ToothTreatment {
  date: string;
  procedure: string;
  surfaces?: ToothSurface[];
  material?: string;
  dentistId: string;
  notes?: string;
}

// ── Module 2: AI Radiograph Analysis ──
export interface DentalRadiograph {
  patientId: number;
  imageType: "periapical" | "bitewing" | "panoramic" | "cbct" | "cephalometric" | "occlusal";
  imageUrl: string;
  toothRegion?: FDITooth[];
  clinicalIndication?: string;
}

export interface RadiographAnalysis {
  findings: RadiographFinding[];
  overallAssessment: string;
  recommendations: string[];
  urgencyLevel: "routine" | "soon" | "urgent" | "emergency";
  confidenceScore: number;
  disclaimer: string;
}

export interface RadiographFinding {
  toothId?: FDITooth;
  finding: string;
  category: "caries" | "periapical" | "periodontal" | "fracture" | "impaction" | "pathology" | "developmental" | "iatrogenic" | "other";
  severity: "mild" | "moderate" | "severe";
  location: string;
  description: string;
  suggestedAction: string;
  confidence: number;
}

// ── Module 3: Periodontal Charting ──
export interface PeriodontalChart {
  patientId: number;
  examDate: string;
  examiner: string;
  teeth: PeriodontalTooth[];
  bleedingOnProbing: number; // percentage
  plaquScore: number; // percentage
  overallDiagnosis: PeriodontalDiagnosis;
  riskAssessment: PeriodontalRisk;
}

export interface PeriodontalTooth {
  toothId: FDITooth;
  probingDepths: {
    buccal: [number, number, number]; // MB, B, DB
    lingual: [number, number, number]; // ML, L, DL
  };
  recession: {
    buccal: [number, number, number];
    lingual: [number, number, number];
  };
  clinicalAttachmentLevel: {
    buccal: [number, number, number];
    lingual: [number, number, number];
  };
  bleedingOnProbing: {
    buccal: [boolean, boolean, boolean];
    lingual: [boolean, boolean, boolean];
  };
  suppuration: boolean;
  furcation?: 0 | 1 | 2 | 3;
  mobility?: 0 | 1 | 2 | 3;
  mucogingivalJunction?: number;
}

export interface PeriodontalDiagnosis {
  stage: "I" | "II" | "III" | "IV"; // AAP/EFP 2017
  grade: "A" | "B" | "C";
  extent: "localized" | "generalized";
  distribution: string;
  riskFactors: string[];
}

export interface PeriodontalRisk {
  overallRisk: "low" | "moderate" | "high";
  factors: Array<{
    factor: string;
    impact: "low" | "moderate" | "high";
    modifiable: boolean;
    recommendation: string;
  }>;
  recallInterval: number; // months
}

// ── Module 4: Treatment Planning ──
export interface DentalTreatmentPlan {
  patientId: number;
  planDate: string;
  dentistId: string;
  chiefComplaint: string;
  diagnosis: string[];
  phases: TreatmentPhase[];
  totalEstimatedCost: number;
  currency: string;
  insuranceCoverage?: InsuranceCoverage;
  prognosis: string;
  alternatives: AlternativePlan[];
}

export interface TreatmentPhase {
  phase: number;
  name: string; // "Emergency", "Disease Control", "Definitive", "Maintenance"
  procedures: PlannedProcedure[];
  estimatedDuration: string;
  priority: "immediate" | "high" | "medium" | "low";
}

export interface PlannedProcedure {
  toothId?: FDITooth;
  procedure: string;
  cptCode?: string;
  cdtCode?: string; // ADA CDT code
  surfaces?: ToothSurface[];
  estimatedCost: number;
  insuranceCovered: boolean;
  notes?: string;
  prerequisites?: string[];
}

export interface InsuranceCoverage {
  provider: string;
  policyNumber: string;
  coveragePercent: number;
  annualMax: number;
  remainingBenefit: number;
  waitingPeriods?: Array<{ procedure: string; months: number }>;
}

export interface AlternativePlan {
  description: string;
  pros: string[];
  cons: string[];
  costDifference: number;
  longevityEstimate: string;
}

// ── Module 5: Implant Planning ──
export interface ImplantPlan {
  patientId: number;
  site: FDITooth;
  boneAssessment: BoneAssessment;
  implantSelection: ImplantSelection;
  surgicalApproach: SurgicalApproach;
  prostheticPlan: ProstheticPlan;
  riskFactors: ImplantRiskFactor[];
  successProbability: number;
  timeline: ImplantTimeline[];
}

export interface BoneAssessment {
  boneWidth: number; // mm
  boneHeight: number; // mm
  boneQuality: "D1" | "D2" | "D3" | "D4"; // Misch classification
  boneDensity: number; // HU (Hounsfield units)
  sinusProximity?: number; // mm
  nerveCanalDistance?: number; // mm
  augmentationNeeded: boolean;
  augmentationType?: "sinus_lift" | "block_graft" | "guided_bone_regeneration" | "ridge_split" | "distraction";
}

export interface ImplantSelection {
  system: string;
  diameter: number; // mm
  length: number; // mm
  type: "tissue_level" | "bone_level";
  surface: "SLA" | "TiUnite" | "Osseotite" | "Resorbable_Blast" | "other";
  connection: "internal_hex" | "external_hex" | "conical" | "tri_channel";
  rationale: string;
}

export interface SurgicalApproach {
  technique: "freehand" | "guided" | "navigated";
  flap: "full_thickness" | "split_thickness" | "flapless";
  immediateLoading: boolean;
  graftMaterial?: string;
  membrane?: string;
  provisionalRestoration: boolean;
}

export interface ProstheticPlan {
  type: "single_crown" | "bridge" | "overdenture" | "all_on_4" | "all_on_6";
  material: "zirconia" | "pfm" | "emax" | "titanium" | "acrylic";
  abutmentType: "stock" | "custom" | "angled";
  cementRetained: boolean;
  screwRetained: boolean;
}

export interface ImplantRiskFactor {
  factor: string;
  severity: "low" | "moderate" | "high";
  mitigation: string;
}

export interface ImplantTimeline {
  phase: string;
  duration: string;
  procedures: string[];
  healing: string;
}

// ── Module 6: Orthodontic Analysis ──
export interface OrthodonticAssessment {
  patientId: number;
  age: number;
  chiefComplaint: string;
  skeletalClassification: "I" | "II_div1" | "II_div2" | "III";
  molarRelation: { right: "I" | "II" | "III"; left: "I" | "II" | "III" };
  canineRelation: { right: "I" | "II" | "III"; left: "I" | "II" | "III" };
  overjet: number; // mm
  overbite: number; // mm or percentage
  crowding: { upper: number; lower: number }; // mm
  spacing: { upper: number; lower: number }; // mm
  crossbite: string[];
  openBite: boolean;
  midlineDeviation: { upper: number; lower: number }; // mm
  cephalometricAnalysis?: CephalometricData;
  treatmentOptions: OrthoTreatmentOption[];
}

export interface CephalometricData {
  sna: number; // degrees
  snb: number;
  anb: number;
  fma: number; // Frankfort-mandibular plane angle
  impa: number; // Lower incisor to mandibular plane
  upperIncisorToSN: number;
  wittsAppraisal: number; // mm
  facialAxis: number;
  growthPattern: "horizontal" | "average" | "vertical";
  interpretation: string;
}

export interface OrthoTreatmentOption {
  option: string;
  appliance: "fixed_brackets" | "clear_aligners" | "lingual" | "functional" | "headgear" | "expansion" | "surgical";
  duration: string; // months
  extractionRequired: boolean;
  extractionTeeth?: FDITooth[];
  complexity: "simple" | "moderate" | "complex";
  estimatedCost: number;
  pros: string[];
  cons: string[];
}

// ── Module 7: Endodontic Module ──
export interface EndodonticAssessment {
  patientId: number;
  toothId: FDITooth;
  chiefComplaint: string;
  pulpDiagnosis: "normal" | "reversible_pulpitis" | "irreversible_pulpitis" | "pulp_necrosis" | "previously_treated" | "previously_initiated";
  periapicalDiagnosis: "normal" | "symptomatic_apical_periodontitis" | "asymptomatic_apical_periodontitis" | "acute_apical_abscess" | "chronic_apical_abscess";
  diagnosticTests: EndodonticTests;
  canalMorphology: CanalMorphology;
  treatmentPlan: EndoTreatmentPlan;
  prognosis: "favorable" | "questionable" | "unfavorable";
  prognosisFactors: string[];
}

export interface EndodonticTests {
  coldTest: "normal" | "exaggerated" | "lingering" | "no_response";
  electricPulpTest: "normal" | "exaggerated" | "no_response";
  percussion: "normal" | "positive";
  palpation: "normal" | "positive";
  biteTest: "normal" | "positive";
  probingDepths: number[];
  sinusTract: boolean;
  swelling: boolean;
  mobility: 0 | 1 | 2 | 3;
  periapicalRadiolucency: boolean;
  radioluencySize?: number; // mm
}

export interface CanalMorphology {
  numberOfCanals: number;
  canals: Array<{
    name: string; // MB, DB, P, MB2, etc.
    curvature: "straight" | "moderate" | "severe" | "s_shaped";
    calcification: "none" | "partial" | "complete";
    workingLength?: number; // mm
    apicalSize?: number; // ISO size
  }>;
  anatomicVariation?: string;
  difficultyRating: "simple" | "moderate" | "complex";
}

export interface EndoTreatmentPlan {
  procedure: "pulp_cap" | "pulpotomy" | "root_canal" | "retreatment" | "apicoectomy" | "intentional_replantation";
  visits: number;
  irrigationProtocol: string[];
  obturationTechnique: "lateral_condensation" | "warm_vertical" | "continuous_wave" | "single_cone";
  sealerType: string;
  postRequired: boolean;
  postType?: "fiber" | "metal" | "cast";
  finalRestoration: string;
  antibioticRequired: boolean;
  followUpSchedule: string[];
}

// ── Module 8: Prosthodontic Planning ──
export interface ProsthodonticPlan {
  patientId: number;
  type: "fixed" | "removable" | "combined" | "maxillofacial";
  classification?: KennedyClassification;
  abutmentAssessment: AbutmentAssessment[];
  designPlan: ProsthesisDesign;
  materialSelection: MaterialSelection;
  occlusalScheme: OcclusalScheme;
  preparationGuide: PreparationGuide[];
  labPrescription: LabPrescription;
}

export interface KennedyClassification {
  arch: "maxillary" | "mandibular";
  class: "I" | "II" | "III" | "IV";
  modification: number;
  description: string;
}

export interface AbutmentAssessment {
  toothId: FDITooth;
  crownRootRatio: string;
  periodontalSupport: "adequate" | "compromised" | "poor";
  endodonticStatus: "vital" | "treated" | "needed";
  structuralIntegrity: "good" | "fair" | "poor";
  suitability: "ideal" | "acceptable" | "questionable" | "unsuitable";
}

export interface ProsthesisDesign {
  type: string;
  retainers: string[];
  connectors: string[];
  pontics?: string[];
  rests?: string[];
  clasps?: string[];
  framework?: string;
  esthetics: string;
}

export interface MaterialSelection {
  framework: string;
  veneering: string;
  rationale: string;
  alternatives: string[];
  longevityEstimate: string;
}

export interface OcclusalScheme {
  scheme: "canine_guidance" | "group_function" | "balanced" | "lingualized";
  verticalDimension: "maintain" | "increase" | "decrease";
  adjustments: string[];
}

export interface PreparationGuide {
  toothId: FDITooth;
  reductionBuccal: number; // mm
  reductionOcclusal: number; // mm
  reductionLingual: number; // mm
  marginType: "chamfer" | "shoulder" | "knife_edge" | "beveled_shoulder";
  marginLocation: "supragingival" | "equigingival" | "subgingival";
  taperAngle: number; // degrees
}

export interface LabPrescription {
  shade: string; // Vita shade
  stumpShade?: string;
  material: string;
  specialInstructions: string[];
  photos: string[];
  impressionType: "digital" | "conventional";
}

// ── Module 9: Pediatric Dentistry ──
export interface PediatricAssessment {
  patientId: number;
  age: number; // months
  dentitionStage: "primary" | "mixed" | "permanent";
  cariesRisk: CariesRiskAssessment;
  behaviorManagement: BehaviorAssessment;
  growthDevelopment: GrowthAssessment;
  preventivePlan: PreventivePlan;
  eruptionChart: EruptionStatus[];
}

export interface CariesRiskAssessment {
  riskLevel: "low" | "moderate" | "high" | "extreme";
  factors: Array<{
    category: "biological" | "protective" | "clinical";
    factor: string;
    present: boolean;
    weight: number;
  }>;
  dmft_dmfs?: { dmft: number; dmfs: number }; // Decayed-Missing-Filled
  recommendations: string[];
  recallInterval: number; // months
}

export interface BehaviorAssessment {
  frankl: 1 | 2 | 3 | 4; // Frankl behavior rating
  anxietyLevel: "none" | "mild" | "moderate" | "severe";
  cooperationHistory: string;
  managementTechniques: string[];
  sedationNeeded: boolean;
  sedationType?: "nitrous" | "oral" | "iv" | "general_anesthesia";
}

export interface GrowthAssessment {
  skeletalAge?: number;
  growthPotential: "active" | "decelerating" | "completed";
  habits: Array<{
    habit: string; // thumb_sucking, tongue_thrust, mouth_breathing
    duration: string;
    severity: "mild" | "moderate" | "severe";
    intervention: string;
  }>;
  spaceAnalysis?: {
    archLength: number;
    toothSizeSum: number;
    discrepancy: number;
    recommendation: string;
  };
}

export interface PreventivePlan {
  fluorideApplication: { type: string; frequency: string };
  sealants: FDITooth[];
  dietaryCounseling: string[];
  oralHygieneInstructions: string[];
  spaceMaintenanceNeeded: boolean;
  spaceMaintainerType?: string;
}

export interface EruptionStatus {
  toothId: FDITooth;
  status: "not_erupted" | "erupting" | "erupted" | "exfoliating" | "exfoliated" | "impacted" | "congenitally_absent";
  expectedEruptionAge?: number; // months
  actualEruptionDate?: string;
  notes?: string;
}

// ── Module 10: Oral Surgery Planning ──
export interface OralSurgeryPlan {
  patientId: number;
  procedure: OralSurgeryProcedure;
  medicalHistory: SurgicalMedicalHistory;
  preoperativeAssessment: PreoperativeAssessment;
  surgicalPlan: SurgicalPlanDetails;
  anesthesiaPlan: AnesthesiaPlan;
  postoperativeInstructions: PostopInstructions;
  complications: PotentialComplication[];
}

export type OralSurgeryProcedure =
  | "simple_extraction"
  | "surgical_extraction"
  | "wisdom_tooth"
  | "apicoectomy"
  | "cyst_enucleation"
  | "biopsy"
  | "frenectomy"
  | "alveoloplasty"
  | "torus_removal"
  | "implant_placement"
  | "sinus_lift"
  | "bone_graft"
  | "ridge_augmentation"
  | "coronectomy"
  | "marsupialization";

export interface SurgicalMedicalHistory {
  medications: Array<{ name: string; dose: string; anticoagulant: boolean }>;
  allergies: string[];
  bleedingDisorders: boolean;
  bisphosphonateUse: boolean;
  radiationHistory: boolean;
  immunocompromised: boolean;
  diabetesControl: "well_controlled" | "poorly_controlled" | "none";
  smokingStatus: "never" | "former" | "current";
  asaClassification: "I" | "II" | "III" | "IV";
}

export interface PreoperativeAssessment {
  toothId?: FDITooth;
  difficulty: "simple" | "moderate" | "difficult" | "very_difficult";
  pedersonScore?: number; // For wisdom teeth
  winterClassification?: string;
  pellGregoryClass?: "I" | "II" | "III";
  pellGregoryPosition?: "A" | "B" | "C";
  proximityToVitalStructures: Array<{
    structure: string; // IAN, mental foramen, sinus, etc.
    distance: number; // mm
    risk: "low" | "moderate" | "high";
  }>;
  cbctRequired: boolean;
}

export interface SurgicalPlanDetails {
  approach: string;
  incision: string;
  boneRemoval: boolean;
  toothSectioning: boolean;
  closureTechnique: string;
  estimatedDuration: number; // minutes
  specialInstruments: string[];
}

export interface AnesthesiaPlan {
  type: "local" | "local_with_sedation" | "general";
  technique: string;
  agent: string;
  vasoconstrictor: boolean;
  maxDose: string;
  supplementalTechniques?: string[];
}

export interface PostopInstructions {
  medications: Array<{ name: string; dose: string; frequency: string; duration: string }>;
  dietRestrictions: string[];
  activityRestrictions: string[];
  woundCare: string[];
  followUpSchedule: string[];
  warningSignsEmergency: string[];
}

export interface PotentialComplication {
  complication: string;
  probability: "rare" | "uncommon" | "common";
  severity: "mild" | "moderate" | "severe";
  prevention: string;
  management: string;
}

// ── Module 11: TMJ Assessment ──
export interface TMJAssessment {
  patientId: number;
  chiefComplaint: string;
  painAssessment: TMJPainAssessment;
  rangeOfMotion: TMJRangeOfMotion;
  jointSounds: TMJSounds;
  muscleExamination: MuscleExam[];
  diagnosis: TMJDiagnosis;
  treatmentPlan: TMJTreatmentPlan;
}

export interface TMJPainAssessment {
  location: string[];
  intensity: number; // VAS 0-10
  character: "sharp" | "dull" | "throbbing" | "burning" | "aching";
  duration: string;
  frequency: string;
  aggravatingFactors: string[];
  relievingFactors: string[];
  radiating: boolean;
  radiationPattern?: string;
}

export interface TMJRangeOfMotion {
  maxOpening: number; // mm
  maxOpeningWithPain: number; // mm
  rightLateral: number; // mm
  leftLateral: number; // mm
  protrusion: number; // mm
  deviationOnOpening: "none" | "right" | "left";
  deflectionOnOpening: "none" | "right" | "left";
}

export interface TMJSounds {
  rightJoint: {
    clicking: boolean;
    clickTiming?: "early" | "mid" | "late";
    crepitus: boolean;
    reciprocalClick: boolean;
  };
  leftJoint: {
    clicking: boolean;
    clickTiming?: "early" | "mid" | "late";
    crepitus: boolean;
    reciprocalClick: boolean;
  };
}

export interface MuscleExam {
  muscle: string; // masseter, temporalis, medial_pterygoid, lateral_pterygoid, SCM, trapezius
  side: "right" | "left" | "bilateral";
  tenderness: 0 | 1 | 2 | 3; // 0=none, 3=severe
  triggerPoints: boolean;
  referredPain?: string;
}

export interface TMJDiagnosis {
  dc_tmd: string[]; // DC/TMD Axis I diagnoses
  axisII?: {
    painDisability: "low" | "moderate" | "high";
    depression: "normal" | "moderate" | "severe";
    somatization: "normal" | "moderate" | "severe";
  };
  classification: "muscular" | "articular" | "combined";
}

export interface TMJTreatmentPlan {
  phase: "conservative" | "intermediate" | "surgical";
  interventions: Array<{
    intervention: string;
    type: "behavioral" | "physical_therapy" | "pharmacological" | "occlusal" | "surgical";
    duration: string;
    priority: number;
  }>;
  splintTherapy?: {
    type: "stabilization" | "anterior_repositioning" | "nti";
    wearSchedule: string;
    adjustmentInterval: string;
  };
  referrals?: string[];
  followUp: string;
}

// ── Module 12: Dental AI Assistant ──
export interface DentalAIQuery {
  patientId?: number;
  query: string;
  context?: {
    dentalChart?: DentalChart;
    perioChart?: PeriodontalChart;
    radiographs?: string[];
    currentTreatment?: string;
  };
  mode: "clinical_decision" | "patient_education" | "treatment_planning" | "differential_diagnosis" | "material_selection" | "evidence_search";
}

export interface DentalAIResponse {
  answer: string;
  references: Array<{ source: string; relevance: number }>;
  confidence: number;
  suggestedActions: string[];
  disclaimer: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AI-POWERED FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Module 1: Interactive Dental Chart AI ──
export async function analyzeDentalChart(chart: DentalChart): Promise<{
  summary: string;
  riskAreas: Array<{ tooth: FDITooth; risk: string; priority: string }>;
  treatmentSuggestions: string[];
  maintenancePlan: string;
  patientReport: string;
}> {
  const ai = getGeminiClient();
  if (!ai) throw new Error("Gemini AI not configured");

  const prompt = `You are MediDent AI — a world-class dental clinical decision support system.
Analyze this dental chart and provide comprehensive clinical insights.

DENTAL CHART DATA:
${JSON.stringify(chart, null, 2)}

Respond in JSON format:
{
  "summary": "Brief clinical summary of oral health status",
  "riskAreas": [{"tooth": "FDI number", "risk": "description of risk", "priority": "immediate|high|medium|low"}],
  "treatmentSuggestions": ["prioritized treatment suggestions"],
  "maintenancePlan": "Recommended maintenance schedule and home care",
  "patientReport": "Patient-friendly explanation in Arabic and English"
}

Consider:
- Patterns of decay (diet-related, stress-related, medication-related)
- Structural integrity and biomechanical risks
- Periodontal implications
- Occlusal factors
- Age-appropriate recommendations
- Evidence-based preventive strategies`;

  const result = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.3, responseMimeType: "application/json" },
  });

  const text = result.text ?? "{}";
  return decodeAllStrings(JSON.parse(text));
}

// ── Module 2: AI Radiograph Analysis ──
export async function analyzeRadiograph(data: DentalRadiograph): Promise<RadiographAnalysis> {
  const ai = getGeminiClient();
  if (!ai) throw new Error("Gemini AI not configured");

  const prompt = `You are MediDent AI Radiology — specialized in dental radiograph interpretation.
Analyze this dental radiograph and provide detailed findings.

RADIOGRAPH DATA:
- Type: ${data.imageType}
- Region: ${data.toothRegion?.join(", ") || "Full mouth"}
- Clinical Indication: ${data.clinicalIndication || "Routine examination"}
- Patient ID: ${data.patientId}

Provide analysis in JSON format:
{
  "findings": [
    {
      "toothId": "FDI number or null",
      "finding": "Brief finding title",
      "category": "caries|periapical|periodontal|fracture|impaction|pathology|developmental|iatrogenic|other",
      "severity": "mild|moderate|severe",
      "location": "Specific anatomical location",
      "description": "Detailed radiographic description",
      "suggestedAction": "Recommended clinical action",
      "confidence": 0.0-1.0
    }
  ],
  "overallAssessment": "Comprehensive radiographic assessment",
  "recommendations": ["Ordered list of recommendations"],
  "urgencyLevel": "routine|soon|urgent|emergency",
  "confidenceScore": 0.0-1.0,
  "disclaimer": "AI-assisted analysis. Must be verified by qualified dental professional. Not a substitute for clinical examination."
}

Analyze for:
- Caries (interproximal, occlusal, cervical, recurrent)
- Periapical pathology (radiolucencies, condensing osteitis)
- Periodontal bone loss (horizontal, vertical, furcation)
- Root fractures and resorption
- Impacted teeth and their classification
- Pathological lesions (cysts, tumors)
- Quality of existing restorations
- Developmental anomalies
- Calculus deposits
- Sinus pathology (for maxillary teeth)`;

  const result = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.2, responseMimeType: "application/json" },
  });

  const text = result.text ?? "{}";
  return decodeAllStrings(JSON.parse(text));
}

// ── Module 3: Periodontal Analysis ──
export async function analyzePeriodontalChart(chart: PeriodontalChart): Promise<{
  diagnosis: PeriodontalDiagnosis;
  riskAssessment: PeriodontalRisk;
  treatmentPlan: string[];
  prognosis: Array<{ tooth: FDITooth; prognosis: string; rationale: string }>;
  patientReport: string;
  comparisonWithPrevious?: string;
}> {
  const ai = getGeminiClient();
  if (!ai) throw new Error("Gemini AI not configured");

  const prompt = `You are MediDent Periodontal AI — specialized in periodontal diagnosis and treatment planning.
Analyze this periodontal chart using the 2017 AAP/EFP Classification system.

PERIODONTAL CHART DATA:
${JSON.stringify(chart, null, 2)}

Respond in JSON format:
{
  "diagnosis": {
    "stage": "I|II|III|IV",
    "grade": "A|B|C",
    "extent": "localized|generalized",
    "distribution": "Description of affected areas",
    "riskFactors": ["identified risk factors"]
  },
  "riskAssessment": {
    "overallRisk": "low|moderate|high",
    "factors": [{"factor": "name", "impact": "low|moderate|high", "modifiable": true/false, "recommendation": "action"}],
    "recallInterval": number_in_months
  },
  "treatmentPlan": ["Phase 1: ...", "Phase 2: ...", etc.],
  "prognosis": [{"tooth": "FDI", "prognosis": "good|fair|poor|hopeless", "rationale": "explanation"}],
  "patientReport": "Patient-friendly explanation in Arabic and English"
}

Apply:
- 2017 AAP/EFP Staging (I-IV) based on CAL, bone loss, tooth loss
- Grading (A-C) based on rate of progression, risk factors
- Individual tooth prognosis (McGuire/Nunn)
- Evidence-based treatment sequencing
- Risk factor modification strategies`;

  const result = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.3, responseMimeType: "application/json" },
  });

  const text = result.text ?? "{}";
  return decodeAllStrings(JSON.parse(text));
}

// ── Module 4: AI Treatment Planning ──
export async function generateTreatmentPlan(data: {
  patientId: number;
  age: number;
  chiefComplaint: string;
  dentalChart: DentalChart;
  perioChart?: PeriodontalChart;
  medicalHistory?: string;
  budget?: string;
  preferences?: string;
}): Promise<DentalTreatmentPlan> {
  const ai = getGeminiClient();
  if (!ai) throw new Error("Gemini AI not configured");

  const prompt = `You are MediDent Treatment Planning AI — creating comprehensive, phased dental treatment plans.

PATIENT DATA:
${JSON.stringify(data, null, 2)}

Generate a comprehensive treatment plan in JSON format:
{
  "patientId": ${data.patientId},
  "planDate": "${new Date().toISOString().split("T")[0]}",
  "dentistId": "AI-generated",
  "chiefComplaint": "${data.chiefComplaint}",
  "diagnosis": ["list of diagnoses"],
  "phases": [
    {
      "phase": 1,
      "name": "Phase name (Emergency/Disease Control/Definitive/Maintenance)",
      "procedures": [
        {
          "toothId": "FDI or null",
          "procedure": "Procedure name",
          "cdtCode": "CDT code",
          "surfaces": ["affected surfaces"],
          "estimatedCost": cost_in_SAR,
          "insuranceCovered": true/false,
          "notes": "Clinical notes",
          "prerequisites": ["required before this"]
        }
      ],
      "estimatedDuration": "time estimate",
      "priority": "immediate|high|medium|low"
    }
  ],
  "totalEstimatedCost": total_SAR,
  "currency": "SAR",
  "prognosis": "Overall prognosis with rationale",
  "alternatives": [
    {
      "description": "Alternative approach",
      "pros": ["advantages"],
      "cons": ["disadvantages"],
      "costDifference": difference_SAR,
      "longevityEstimate": "expected duration"
    }
  ]
}

Follow these principles:
1. Emergency phase first (pain, infection, trauma)
2. Disease control (caries, periodontal disease)
3. Definitive restorative/prosthetic
4. Maintenance phase
5. Consider patient's budget and preferences
6. Provide alternatives at each decision point
7. Use CDT codes for Saudi dental insurance compatibility
8. Evidence-based material and technique selection`;

  const result = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.3, responseMimeType: "application/json" },
  });

  const text = result.text ?? "{}";
  return decodeAllStrings(JSON.parse(text));
}

// ── Module 5: Implant Planning AI ──
export async function planImplant(data: {
  patientId: number;
  site: FDITooth;
  boneData: Partial<BoneAssessment>;
  medicalHistory: string;
  smokingStatus: string;
  budget?: string;
}): Promise<ImplantPlan> {
  const ai = getGeminiClient();
  if (!ai) throw new Error("Gemini AI not configured");

  const prompt = `You are MediDent Implant AI — specialized in dental implant planning using evidence-based protocols.

IMPLANT CASE DATA:
${JSON.stringify(data, null, 2)}

Generate comprehensive implant plan in JSON format:
{
  "patientId": ${data.patientId},
  "site": "${data.site}",
  "boneAssessment": {
    "boneWidth": mm,
    "boneHeight": mm,
    "boneQuality": "D1|D2|D3|D4",
    "boneDensity": HU,
    "sinusProximity": mm_or_null,
    "nerveCanalDistance": mm_or_null,
    "augmentationNeeded": boolean,
    "augmentationType": "type or null"
  },
  "implantSelection": {
    "system": "recommended system",
    "diameter": mm,
    "length": mm,
    "type": "tissue_level|bone_level",
    "surface": "surface type",
    "connection": "connection type",
    "rationale": "why this selection"
  },
  "surgicalApproach": {
    "technique": "freehand|guided|navigated",
    "flap": "flap type",
    "immediateLoading": boolean,
    "graftMaterial": "material or null",
    "membrane": "membrane or null",
    "provisionalRestoration": boolean
  },
  "prostheticPlan": {
    "type": "restoration type",
    "material": "material",
    "abutmentType": "type",
    "cementRetained": boolean,
    "screwRetained": boolean
  },
  "riskFactors": [{"factor": "name", "severity": "low|moderate|high", "mitigation": "strategy"}],
  "successProbability": 0-100,
  "timeline": [{"phase": "name", "duration": "time", "procedures": ["list"], "healing": "description"}]
}

Apply ITI Treatment Guide protocols and consider:
- Bone quality and quantity (Misch classification)
- Anatomical limitations (IAN, sinus, mental foramen)
- Risk factors (smoking, diabetes, bisphosphonates, bruxism)
- Loading protocol (immediate, early, conventional)
- Soft tissue management
- Prosthetic-driven planning
- Long-term maintenance requirements`;

  const result = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.3, responseMimeType: "application/json" },
  });

  const text = result.text ?? "{}";
  return decodeAllStrings(JSON.parse(text));
}

// ── Module 6: Orthodontic Analysis AI ──
export async function analyzeOrthodontics(data: {
  patientId: number;
  age: number;
  chiefComplaint: string;
  molarRelation: { right: string; left: string };
  overjet: number;
  overbite: number;
  crowding?: { upper: number; lower: number };
  cephalometrics?: Partial<CephalometricData>;
  photos?: string[];
}): Promise<OrthodonticAssessment> {
  const ai = getGeminiClient();
  if (!ai) throw new Error("Gemini AI not configured");

  const prompt = `You are MediDent Orthodontic AI — specialized in orthodontic diagnosis and treatment planning.

ORTHODONTIC CASE DATA:
${JSON.stringify(data, null, 2)}

Generate comprehensive orthodontic assessment in JSON format:
{
  "patientId": ${data.patientId},
  "age": ${data.age},
  "chiefComplaint": "${data.chiefComplaint}",
  "skeletalClassification": "I|II_div1|II_div2|III",
  "molarRelation": {"right": "I|II|III", "left": "I|II|III"},
  "canineRelation": {"right": "I|II|III", "left": "I|II|III"},
  "overjet": ${data.overjet},
  "overbite": ${data.overbite},
  "crowding": {"upper": mm, "lower": mm},
  "spacing": {"upper": mm, "lower": mm},
  "crossbite": ["affected teeth"],
  "openBite": boolean,
  "midlineDeviation": {"upper": mm, "lower": mm},
  "cephalometricAnalysis": {
    "sna": degrees,
    "snb": degrees,
    "anb": degrees,
    "fma": degrees,
    "impa": degrees,
    "upperIncisorToSN": degrees,
    "wittsAppraisal": mm,
    "facialAxis": degrees,
    "growthPattern": "horizontal|average|vertical",
    "interpretation": "detailed interpretation"
  },
  "treatmentOptions": [
    {
      "option": "Description",
      "appliance": "fixed_brackets|clear_aligners|lingual|functional|headgear|expansion|surgical",
      "duration": "months",
      "extractionRequired": boolean,
      "extractionTeeth": ["FDI numbers"],
      "complexity": "simple|moderate|complex",
      "estimatedCost": SAR,
      "pros": ["advantages"],
      "cons": ["disadvantages"]
    }
  ]
}

Consider:
- Skeletal vs dental discrepancy
- Growth potential (CVM stage for adolescents)
- Extraction vs non-extraction decision
- Anchorage requirements
- Stability and retention
- Patient preferences and compliance
- Evidence-based treatment timing`;

  const result = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.3, responseMimeType: "application/json" },
  });

  const text = result.text ?? "{}";
  return decodeAllStrings(JSON.parse(text));
}

// ── Module 7: Endodontic Assessment AI ──
export async function assessEndodontic(data: {
  patientId: number;
  toothId: FDITooth;
  chiefComplaint: string;
  tests: Partial<EndodonticTests>;
  canalInfo?: Partial<CanalMorphology>;
}): Promise<EndodonticAssessment> {
  const ai = getGeminiClient();
  if (!ai) throw new Error("Gemini AI not configured");

  const prompt = `You are MediDent Endodontic AI — specialized in pulpal and periapical diagnosis.

ENDODONTIC CASE DATA:
${JSON.stringify(data, null, 2)}

Generate comprehensive endodontic assessment in JSON format:
{
  "patientId": ${data.patientId},
  "toothId": "${data.toothId}",
  "chiefComplaint": "${data.chiefComplaint}",
  "pulpDiagnosis": "normal|reversible_pulpitis|irreversible_pulpitis|pulp_necrosis|previously_treated|previously_initiated",
  "periapicalDiagnosis": "normal|symptomatic_apical_periodontitis|asymptomatic_apical_periodontitis|acute_apical_abscess|chronic_apical_abscess",
  "diagnosticTests": { full test results },
  "canalMorphology": {
    "numberOfCanals": number,
    "canals": [{"name": "canal name", "curvature": "type", "calcification": "level", "workingLength": mm, "apicalSize": ISO}],
    "anatomicVariation": "description or null",
    "difficultyRating": "simple|moderate|complex"
  },
  "treatmentPlan": {
    "procedure": "procedure type",
    "visits": number,
    "irrigationProtocol": ["solutions and sequence"],
    "obturationTechnique": "technique",
    "sealerType": "sealer",
    "postRequired": boolean,
    "postType": "type or null",
    "finalRestoration": "restoration type",
    "antibioticRequired": boolean,
    "followUpSchedule": ["schedule"]
  },
  "prognosis": "favorable|questionable|unfavorable",
  "prognosisFactors": ["factors affecting prognosis"]
}

Apply AAE diagnostic terminology and consider:
- Pulp vitality testing interpretation
- Periapical pathology classification
- Canal anatomy (Vertucci classification)
- Difficulty assessment (AAE case difficulty)
- Evidence-based irrigation protocols
- Obturation technique selection
- Restoration timing and type`;

  const result = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.3, responseMimeType: "application/json" },
  });

  const text = result.text ?? "{}";
  return decodeAllStrings(JSON.parse(text));
}

// ── Module 8: Prosthodontic Planning AI ──
export async function planProsthodontics(data: {
  patientId: number;
  type: "fixed" | "removable" | "combined";
  missingTeeth: FDITooth[];
  remainingTeeth: Array<{ tooth: FDITooth; condition: string }>;
  occlusion: string;
  esthetics: string;
  budget?: string;
}): Promise<ProsthodonticPlan> {
  const ai = getGeminiClient();
  if (!ai) throw new Error("Gemini AI not configured");

  const prompt = `You are MediDent Prosthodontic AI — specialized in fixed and removable prosthodontics.

PROSTHODONTIC CASE DATA:
${JSON.stringify(data, null, 2)}

Generate comprehensive prosthodontic plan in JSON format with:
- Kennedy classification (if removable)
- Abutment assessment for each tooth
- Design details (retainers, connectors, pontics)
- Material selection with rationale
- Occlusal scheme recommendation
- Preparation guide for each abutment
- Lab prescription details

Follow prosthodontic principles:
- Ante's Law for fixed bridges
- Surveying principles for RPDs
- Biomechanical considerations
- Esthetic zone management
- Occlusal stability
- Retrievability
- Long-term maintenance`;

  const result = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.3, responseMimeType: "application/json" },
  });

  const text = result.text ?? "{}";
  return decodeAllStrings(JSON.parse(text));
}

// ── Module 9: Pediatric Assessment AI ──
export async function assessPediatric(data: {
  patientId: number;
  ageMonths: number;
  chiefComplaint: string;
  dentitionStage: "primary" | "mixed" | "permanent";
  cariesHistory: string;
  behaviorHistory?: string;
  habits?: string[];
  parentConcerns?: string;
}): Promise<PediatricAssessment> {
  const ai = getGeminiClient();
  if (!ai) throw new Error("Gemini AI not configured");

  const prompt = `You are MediDent Pediatric AI — specialized in pediatric dentistry and child development.

PEDIATRIC CASE DATA:
${JSON.stringify(data, null, 2)}

Generate comprehensive pediatric assessment in JSON format:
{
  "patientId": ${data.patientId},
  "age": ${data.ageMonths},
  "dentitionStage": "${data.dentitionStage}",
  "cariesRisk": {
    "riskLevel": "low|moderate|high|extreme",
    "factors": [{"category": "biological|protective|clinical", "factor": "name", "present": boolean, "weight": 1-5}],
    "dmft_dmfs": {"dmft": number, "dmfs": number},
    "recommendations": ["preventive measures"],
    "recallInterval": months
  },
  "behaviorManagement": {
    "frankl": 1-4,
    "anxietyLevel": "none|mild|moderate|severe",
    "cooperationHistory": "description",
    "managementTechniques": ["recommended techniques"],
    "sedationNeeded": boolean,
    "sedationType": "type or null"
  },
  "growthDevelopment": {
    "growthPotential": "active|decelerating|completed",
    "habits": [{"habit": "name", "duration": "time", "severity": "level", "intervention": "recommendation"}],
    "spaceAnalysis": {"archLength": mm, "toothSizeSum": mm, "discrepancy": mm, "recommendation": "action"}
  },
  "preventivePlan": {
    "fluorideApplication": {"type": "varnish/gel/rinse", "frequency": "schedule"},
    "sealants": ["teeth to seal"],
    "dietaryCounseling": ["recommendations"],
    "oralHygieneInstructions": ["age-appropriate instructions"],
    "spaceMaintenanceNeeded": boolean,
    "spaceMaintainerType": "type or null"
  },
  "eruptionChart": [{"toothId": "FDI", "status": "status", "expectedEruptionAge": months, "notes": "any concerns"}]
}

Apply AAPD guidelines and consider:
- Age-appropriate caries risk assessment (CAMBRA)
- Behavior management hierarchy (tell-show-do → sedation)
- Growth and development milestones
- Space management and eruption guidance
- Preventive strategies (fluoride, sealants, diet)
- Habit intervention timing
- Parent education and counseling`;

  const result = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.3, responseMimeType: "application/json" },
  });

  const text = result.text ?? "{}";
  return decodeAllStrings(JSON.parse(text));
}

// ── Module 10: Oral Surgery Planning AI ──
export async function planOralSurgery(data: {
  patientId: number;
  procedure: OralSurgeryProcedure;
  toothId?: FDITooth;
  medicalHistory: Partial<SurgicalMedicalHistory>;
  radiographicFindings?: string;
  difficulty?: string;
}): Promise<OralSurgeryPlan> {
  const ai = getGeminiClient();
  if (!ai) throw new Error("Gemini AI not configured");

  const prompt = `You are MediDent Oral Surgery AI — specialized in oral and maxillofacial surgery planning.

SURGICAL CASE DATA:
${JSON.stringify(data, null, 2)}

Generate comprehensive surgical plan in JSON format with:
- Preoperative assessment (difficulty scoring, vital structure proximity)
- Surgical plan (approach, incision, bone removal, sectioning)
- Anesthesia plan (type, technique, agent, dose)
- Postoperative instructions (medications, diet, activity, wound care)
- Potential complications (probability, prevention, management)

Apply evidence-based protocols:
- Pederson difficulty index (wisdom teeth)
- Winter/Pell-Gregory classification
- ASA physical status classification
- Antibiotic prophylaxis guidelines (AHA/AAOS)
- Anticoagulation management protocols
- BRONJ risk assessment (bisphosphonates)
- Informed consent elements`;

  const result = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.3, responseMimeType: "application/json" },
  });

  const text = result.text ?? "{}";
  return decodeAllStrings(JSON.parse(text));
}

// ── Module 11: TMJ Assessment AI ──
export async function assessTMJ(data: {
  patientId: number;
  chiefComplaint: string;
  painData: Partial<TMJPainAssessment>;
  rangeOfMotion: Partial<TMJRangeOfMotion>;
  jointSounds?: Partial<TMJSounds>;
  muscleFindings?: Partial<MuscleExam>[];
  history?: string;
}): Promise<TMJAssessment> {
  const ai = getGeminiClient();
  if (!ai) throw new Error("Gemini AI not configured");

  const prompt = `You are MediDent TMJ AI — specialized in temporomandibular disorders using DC/TMD criteria.

TMJ CASE DATA:
${JSON.stringify(data, null, 2)}

Generate comprehensive TMJ assessment in JSON format with:
- Pain assessment (VAS, character, pattern)
- Range of motion analysis
- Joint sounds interpretation
- Muscle examination findings
- DC/TMD Axis I diagnosis
- Axis II psychosocial assessment
- Treatment plan (conservative → intermediate → surgical)
- Splint therapy recommendations if indicated

Apply DC/TMD diagnostic criteria:
- Myalgia (local, myofascial pain, myofascial pain with referral)
- Arthralgia
- Disc displacement (with/without reduction, with/without limited opening)
- Degenerative joint disease
- Subluxation
- Headache attributed to TMD`;

  const result = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.3, responseMimeType: "application/json" },
  });

  const text = result.text ?? "{}";
  return decodeAllStrings(JSON.parse(text));
}

// ── Module 12: Dental AI Assistant ──
export async function queryDentalAI(query: DentalAIQuery): Promise<DentalAIResponse> {
  const ai = getGeminiClient();
  if (!ai) throw new Error("Gemini AI not configured");

  const modeInstructions = {
    clinical_decision: "Provide evidence-based clinical decision support for the dentist. Reference guidelines and literature.",
    patient_education: "Explain in simple, patient-friendly language (Arabic and English). Use analogies and avoid jargon.",
    treatment_planning: "Suggest treatment options with pros/cons, costs, and timelines. Consider patient factors.",
    differential_diagnosis: "Provide ranked differential diagnoses with distinguishing features and recommended tests.",
    material_selection: "Compare dental materials for the specific clinical situation. Consider longevity, esthetics, cost.",
    evidence_search: "Summarize current evidence and guidelines relevant to the query. Cite sources.",
  };

  const prompt = `You are MediDent AI Assistant — a world-class dental clinical decision support system.

MODE: ${query.mode}
INSTRUCTIONS: ${modeInstructions[query.mode]}

QUERY: ${query.query}

${query.context ? `PATIENT CONTEXT:\n${JSON.stringify(query.context, null, 2)}` : ""}

Respond in JSON format:
{
  "answer": "Comprehensive answer (bilingual Arabic/English where appropriate)",
  "references": [{"source": "guideline/study name", "relevance": 0.0-1.0}],
  "confidence": 0.0-1.0,
  "suggestedActions": ["actionable next steps"],
  "disclaimer": "Appropriate clinical disclaimer"
}`;

  const result = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.4, responseMimeType: "application/json" },
  });

  const text = result.text ?? "{}";
  return decodeAllStrings(JSON.parse(text));
}

// ── Dental Cost Estimation ──
export async function estimateDentalCosts(data: {
  procedures: Array<{ procedure: string; tooth?: FDITooth; complexity?: string }>;
  region: string;
  insuranceProvider?: string;
}): Promise<{
  estimates: Array<{
    procedure: string;
    tooth?: string;
    minCost: number;
    maxCost: number;
    averageCost: number;
    cdtCode: string;
    insuranceCoverage: string;
  }>;
  totalMin: number;
  totalMax: number;
  totalAverage: number;
  currency: string;
  notes: string[];
}> {
  const ai = getGeminiClient();
  if (!ai) throw new Error("Gemini AI not configured");

  const prompt = `You are MediDent Cost AI — providing dental procedure cost estimates for Saudi Arabia.

PROCEDURES:
${JSON.stringify(data, null, 2)}

Provide cost estimates in JSON format:
{
  "estimates": [
    {
      "procedure": "name",
      "tooth": "FDI or null",
      "minCost": SAR,
      "maxCost": SAR,
      "averageCost": SAR,
      "cdtCode": "CDT code",
      "insuranceCoverage": "typically covered percentage"
    }
  ],
  "totalMin": total_SAR,
  "totalMax": total_SAR,
  "totalAverage": total_SAR,
  "currency": "SAR",
  "notes": ["important cost-related notes"]
}

Base estimates on Saudi Arabian dental market rates (2024-2026).
Consider complexity, materials, and regional variations.`;

  const result = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.3, responseMimeType: "application/json" },
  });

  const text = result.text ?? "{}";
  return decodeAllStrings(JSON.parse(text));
}

// ── Dental Emergency Triage ──
export async function triageDentalEmergency(data: {
  patientId: number;
  symptoms: string[];
  painLevel: number; // 0-10
  duration: string;
  swelling: boolean;
  bleeding: boolean;
  trauma: boolean;
  fever: boolean;
}): Promise<{
  urgencyLevel: "immediate" | "urgent" | "soon" | "routine";
  likelyDiagnosis: string[];
  immediateActions: string[];
  homeCarePending: string[];
  appointmentTimeframe: string;
  referralNeeded: boolean;
  referralSpecialty?: string;
  warningSignsForER: string[];
}> {
  const ai = getGeminiClient();
  if (!ai) throw new Error("Gemini AI not configured");

  const prompt = `You are MediDent Emergency AI — dental emergency triage system.

EMERGENCY DATA:
${JSON.stringify(data, null, 2)}

Triage this dental emergency in JSON format:
{
  "urgencyLevel": "immediate|urgent|soon|routine",
  "likelyDiagnosis": ["ranked differential diagnoses"],
  "immediateActions": ["what to do right now"],
  "homeCarePending": ["home care instructions until appointment"],
  "appointmentTimeframe": "when to be seen",
  "referralNeeded": boolean,
  "referralSpecialty": "specialty or null",
  "warningSignsForER": ["signs requiring emergency room visit"]
}

Consider:
- Airway compromise (Ludwig's angina, severe swelling)
- Uncontrolled bleeding
- Dental trauma (avulsion, luxation, fracture)
- Acute infection (abscess, cellulitis)
- Severe pain management
- Pediatric vs adult considerations`;

  const result = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.2, responseMimeType: "application/json" },
  });

  const text = result.text ?? "{}";
  return decodeAllStrings(JSON.parse(text));
}

// ── Dental Material Recommendation ──
export async function recommendMaterial(data: {
  procedure: string;
  tooth: FDITooth;
  location: "anterior" | "posterior";
  estheticDemand: "high" | "moderate" | "low";
  occlusionForce: "heavy" | "moderate" | "light";
  patientAge: number;
  budget: "premium" | "standard" | "economy";
  allergies?: string[];
}): Promise<{
  primaryRecommendation: {
    material: string;
    brand: string;
    rationale: string;
    longevity: string;
    esthetics: string;
    technique: string;
  };
  alternatives: Array<{
    material: string;
    pros: string[];
    cons: string[];
    costComparison: string;
  }>;
  contraindicated: Array<{ material: string; reason: string }>;
  clinicalTips: string[];
}> {
  const ai = getGeminiClient();
  if (!ai) throw new Error("Gemini AI not configured");

  const prompt = `You are MediDent Materials AI — dental materials science expert.

CASE DATA:
${JSON.stringify(data, null, 2)}

Recommend the best material in JSON format with:
- Primary recommendation with full rationale
- Alternative options with pros/cons
- Contraindicated materials with reasons
- Clinical tips for the selected material

Consider:
- Biomechanical properties (flexural strength, fracture toughness)
- Esthetic properties (translucency, shade matching, fluorescence)
- Biocompatibility and allergies
- Technique sensitivity
- Longevity data from clinical studies
- Cost-effectiveness
- Repairability
- Current evidence (2024-2026 literature)`;

  const result = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.3, responseMimeType: "application/json" },
  });

  const text = result.text ?? "{}";
  return decodeAllStrings(JSON.parse(text));
}
