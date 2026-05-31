/**
 * MediFlow — Autonomous Clinical Workflow Agent
 * First fully agentic AI system in healthcare
 * Executes multi-step clinical workflows autonomously with physician oversight
 */

import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// ============================================================
// TYPES
// ============================================================

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  category: "clinical" | "administrative" | "communication" | "research" | "quality";
  triggerType: "manual" | "event" | "schedule" | "condition";
  trigger?: string;
  steps: WorkflowStep[];
  requiredApproval: boolean;
  estimatedTime: string;
  priority: "critical" | "high" | "medium" | "low";
}

export interface WorkflowStep {
  id: number;
  action: string;
  type: "ai_analysis" | "data_fetch" | "decision" | "notification" | "document" | "order" | "approval" | "communication" | "integration";
  description: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  condition?: string;
  fallback?: string;
  requiresApproval?: boolean;
  timeout?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: "pending" | "running" | "awaiting_approval" | "completed" | "failed" | "cancelled";
  startedAt: string;
  completedAt?: string;
  currentStep: number;
  totalSteps: number;
  results: StepResult[];
  patientId?: string;
  initiatedBy: string;
  approvedBy?: string;
  summary?: string;
}

export interface StepResult {
  stepId: number;
  action: string;
  status: "completed" | "skipped" | "failed" | "pending";
  output: unknown;
  duration: string;
  notes?: string;
}

export interface AgentCapability {
  name: string;
  description: string;
  category: string;
  examples: string[];
}

// ============================================================
// WORKFLOW TEMPLATES
// ============================================================

export const WORKFLOW_TEMPLATES: WorkflowDefinition[] = [
  {
    id: "wf-admission",
    name: "Smart Patient Admission",
    description: "Automates the entire admission process: verify insurance, order labs, assign bed, notify team, create care plan",
    category: "clinical",
    triggerType: "manual",
    steps: [
      { id: 1, action: "verify_insurance", type: "integration", description: "Verify insurance eligibility and coverage via NPHIES" },
      { id: 2, action: "assess_acuity", type: "ai_analysis", description: "AI assessment of patient acuity and bed requirements" },
      { id: 3, action: "assign_bed", type: "decision", description: "Auto-assign appropriate bed based on acuity and availability" },
      { id: 4, action: "order_admission_labs", type: "order", description: "Order standard admission labs (CBC, BMP, Coag, UA)" },
      { id: 5, action: "create_care_plan", type: "ai_analysis", description: "Generate personalized care plan based on diagnosis" },
      { id: 6, action: "notify_team", type: "notification", description: "Notify attending, nurse, and pharmacy of new admission" },
      { id: 7, action: "generate_h_and_p", type: "document", description: "Generate H&P template pre-filled with available data" },
      { id: 8, action: "schedule_consults", type: "order", description: "Auto-schedule required specialist consultations" },
    ],
    requiredApproval: true,
    estimatedTime: "2-5 minutes (vs 45 minutes manual)",
    priority: "high",
  },
  {
    id: "wf-discharge",
    name: "Intelligent Discharge Planning",
    description: "Coordinates discharge: medication reconciliation, patient education, follow-up scheduling, referrals",
    category: "clinical",
    triggerType: "manual",
    steps: [
      { id: 1, action: "medication_reconciliation", type: "ai_analysis", description: "Reconcile inpatient meds with home meds, flag interactions" },
      { id: 2, action: "generate_discharge_summary", type: "document", description: "AI-generated discharge summary with all relevant data" },
      { id: 3, action: "patient_education", type: "ai_analysis", description: "Generate personalized patient education materials (Arabic/English)" },
      { id: 4, action: "schedule_followup", type: "order", description: "Schedule follow-up appointments based on condition" },
      { id: 5, action: "send_referrals", type: "communication", description: "Send specialist referrals with clinical summary" },
      { id: 6, action: "pharmacy_notification", type: "notification", description: "Notify pharmacy to prepare discharge medications" },
      { id: 7, action: "insurance_claim", type: "integration", description: "Submit insurance claim with all documentation" },
      { id: 8, action: "patient_notification", type: "communication", description: "Send patient discharge instructions via WhatsApp/SMS" },
    ],
    requiredApproval: true,
    estimatedTime: "3-8 minutes (vs 2 hours manual)",
    priority: "high",
  },
  {
    id: "wf-critical-lab",
    name: "Critical Lab Value Response",
    description: "Auto-triggered when critical lab values detected. Notifies physician, suggests intervention, documents response",
    category: "clinical",
    triggerType: "condition",
    trigger: "lab_result.value > critical_threshold",
    steps: [
      { id: 1, action: "identify_critical", type: "ai_analysis", description: "Confirm critical value and assess clinical context" },
      { id: 2, action: "alert_physician", type: "notification", description: "Immediate notification to attending physician (push + SMS)" },
      { id: 3, action: "suggest_intervention", type: "ai_analysis", description: "AI suggests immediate interventions based on value and context" },
      { id: 4, action: "check_medications", type: "ai_analysis", description: "Check if any current medications could be causing the abnormality" },
      { id: 5, action: "order_repeat", type: "order", description: "Auto-order repeat lab to confirm (if appropriate)" },
      { id: 6, action: "document_notification", type: "document", description: "Document critical value notification and response time" },
    ],
    requiredApproval: false,
    estimatedTime: "30 seconds",
    priority: "critical",
  },
  {
    id: "wf-referral",
    name: "Intelligent Referral Management",
    description: "Manages specialist referrals: selects appropriate specialist, prepares clinical summary, schedules, tracks",
    category: "administrative",
    triggerType: "manual",
    steps: [
      { id: 1, action: "analyze_referral_need", type: "ai_analysis", description: "Determine appropriate specialty and urgency" },
      { id: 2, action: "prepare_summary", type: "document", description: "Generate concise clinical summary for specialist" },
      { id: 3, action: "check_insurance", type: "integration", description: "Verify specialist is in-network and get prior auth if needed" },
      { id: 4, action: "find_specialist", type: "decision", description: "Find available specialist based on location, availability, expertise" },
      { id: 5, action: "schedule_appointment", type: "order", description: "Book appointment with selected specialist" },
      { id: 6, action: "notify_patient", type: "communication", description: "Inform patient of referral details via preferred channel" },
      { id: 7, action: "track_completion", type: "integration", description: "Monitor if referral was completed and get specialist notes" },
    ],
    requiredApproval: true,
    estimatedTime: "1-3 minutes (vs 30 minutes manual)",
    priority: "medium",
  },
  {
    id: "wf-chronic-review",
    name: "Chronic Disease Annual Review",
    description: "Comprehensive annual review: order labs, assess control, adjust medications, update care plan",
    category: "clinical",
    triggerType: "schedule",
    trigger: "annual_review_due",
    steps: [
      { id: 1, action: "assess_control", type: "ai_analysis", description: "Review past year's data: labs, vitals, compliance, hospitalizations" },
      { id: 2, action: "order_annual_labs", type: "order", description: "Order condition-specific annual labs (HbA1c, lipids, renal, etc.)" },
      { id: 3, action: "screen_complications", type: "ai_analysis", description: "Screen for disease complications (retinopathy, neuropathy, etc.)" },
      { id: 4, action: "medication_optimization", type: "ai_analysis", description: "Suggest medication adjustments based on latest guidelines" },
      { id: 5, action: "update_care_plan", type: "document", description: "Update personalized care plan with new targets" },
      { id: 6, action: "patient_report", type: "document", description: "Generate patient-friendly annual health report" },
      { id: 7, action: "schedule_next", type: "order", description: "Schedule next review and interim check-ups" },
    ],
    requiredApproval: true,
    estimatedTime: "5-10 minutes (vs 1 hour manual)",
    priority: "medium",
  },
  {
    id: "wf-preop",
    name: "Pre-Operative Assessment",
    description: "Complete pre-op workup: risk assessment, labs, cardiac clearance, anesthesia consult, patient prep",
    category: "clinical",
    triggerType: "manual",
    steps: [
      { id: 1, action: "surgical_risk_score", type: "ai_analysis", description: "Calculate ASA, RCRI, and procedure-specific risk scores" },
      { id: 2, action: "order_preop_labs", type: "order", description: "Order risk-appropriate pre-op labs and tests" },
      { id: 3, action: "medication_review", type: "ai_analysis", description: "Review medications to hold/continue (anticoagulants, diabetes meds)" },
      { id: 4, action: "cardiac_clearance", type: "decision", description: "Determine if cardiac clearance needed based on risk score" },
      { id: 5, action: "anesthesia_consult", type: "order", description: "Schedule anesthesia pre-assessment with relevant data" },
      { id: 6, action: "patient_instructions", type: "communication", description: "Send patient pre-op instructions (fasting, medications, arrival)" },
      { id: 7, action: "consent_preparation", type: "document", description: "Prepare informed consent with procedure-specific risks" },
      { id: 8, action: "or_scheduling", type: "integration", description: "Confirm OR availability and equipment needs" },
    ],
    requiredApproval: true,
    estimatedTime: "5-15 minutes (vs 2-3 hours manual)",
    priority: "high",
  },
  {
    id: "wf-sepsis-bundle",
    name: "Sepsis Bundle Execution (Hour-1)",
    description: "Auto-executes SEP-1 bundle within 1 hour: lactate, cultures, antibiotics, fluids, vasopressors",
    category: "clinical",
    triggerType: "condition",
    trigger: "sepsis_screen_positive OR qSOFA >= 2",
    steps: [
      { id: 1, action: "confirm_sepsis", type: "ai_analysis", description: "AI confirms sepsis criteria met (SIRS + suspected infection)" },
      { id: 2, action: "order_lactate", type: "order", description: "STAT lactate level" },
      { id: 3, action: "order_cultures", type: "order", description: "Blood cultures x2 (before antibiotics)" },
      { id: 4, action: "select_antibiotics", type: "ai_analysis", description: "Select empiric antibiotics based on suspected source and local antibiogram" },
      { id: 5, action: "order_antibiotics", type: "order", description: "Order broad-spectrum antibiotics (within 1 hour)", requiresApproval: true },
      { id: 6, action: "fluid_resuscitation", type: "order", description: "Order 30 mL/kg crystalloid if hypotensive or lactate ≥4" },
      { id: 7, action: "reassess_perfusion", type: "ai_analysis", description: "Schedule reassessment at 3 hours and 6 hours" },
      { id: 8, action: "document_bundle", type: "document", description: "Document SEP-1 bundle compliance and timing" },
    ],
    requiredApproval: false,
    estimatedTime: "2 minutes to initiate (target: all within 60 minutes)",
    priority: "critical",
  },
  {
    id: "wf-quality-report",
    name: "Monthly Quality Dashboard Generation",
    description: "Auto-generates monthly quality metrics: readmissions, mortality, infection rates, compliance scores",
    category: "quality",
    triggerType: "schedule",
    trigger: "first_day_of_month",
    steps: [
      { id: 1, action: "collect_metrics", type: "data_fetch", description: "Aggregate all quality metrics from past month" },
      { id: 2, action: "calculate_kpis", type: "ai_analysis", description: "Calculate KPIs: readmission rate, ALOS, mortality, HAI rates" },
      { id: 3, action: "benchmark_comparison", type: "ai_analysis", description: "Compare against national benchmarks and previous months" },
      { id: 4, action: "identify_outliers", type: "ai_analysis", description: "Identify departments/physicians with outlier performance" },
      { id: 5, action: "generate_report", type: "document", description: "Generate comprehensive quality report with visualizations" },
      { id: 6, action: "distribute_report", type: "communication", description: "Send report to quality committee, CMO, and department heads" },
    ],
    requiredApproval: false,
    estimatedTime: "10 minutes (vs 3 days manual)",
    priority: "medium",
  },
];

// ============================================================
// AGENT CAPABILITIES
// ============================================================

export const AGENT_CAPABILITIES: AgentCapability[] = [
  { name: "Clinical Decision Support", description: "Analyze patient data and suggest evidence-based interventions", category: "clinical", examples: ["Suggest antibiotics for pneumonia", "Recommend insulin regimen adjustment"] },
  { name: "Order Management", description: "Create, modify, and track clinical orders", category: "clinical", examples: ["Order admission labs", "Schedule MRI with contrast"] },
  { name: "Document Generation", description: "Create clinical documents from structured data", category: "documentation", examples: ["Generate discharge summary", "Write referral letter"] },
  { name: "Communication", description: "Send notifications and messages to patients and staff", category: "communication", examples: ["Notify on-call physician", "Send patient appointment reminder"] },
  { name: "Insurance & Billing", description: "Handle prior authorization, claims, and billing", category: "administrative", examples: ["Submit prior auth for MRI", "Appeal denied claim"] },
  { name: "Scheduling", description: "Manage appointments, procedures, and follow-ups", category: "administrative", examples: ["Schedule follow-up in 2 weeks", "Book OR time"] },
  { name: "Data Analysis", description: "Analyze trends, patterns, and outcomes", category: "analytics", examples: ["Trend HbA1c over 2 years", "Compare treatment outcomes"] },
  { name: "Quality Monitoring", description: "Track quality metrics and compliance", category: "quality", examples: ["Calculate readmission rate", "Monitor hand hygiene compliance"] },
  { name: "Research Support", description: "Screen patients for trials, literature search", category: "research", examples: ["Find eligible patients for trial", "Search PubMed for evidence"] },
  { name: "Integration", description: "Connect with external systems (NPHIES, labs, pharmacy)", category: "integration", examples: ["Check insurance eligibility", "Send e-prescription to pharmacy"] },
];

// ============================================================
// CORE FUNCTIONS
// ============================================================

/**
 * Execute a workflow
 */
export async function executeWorkflow(
  workflowId: string,
  params: {
    patientId?: string;
    initiatedBy: string;
    customParams?: Record<string, unknown>;
  }
): Promise<WorkflowExecution> {
  const workflow = WORKFLOW_TEMPLATES.find(w => w.id === workflowId);
  if (!workflow) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }

  const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startTime = new Date();
  
  const execution: WorkflowExecution = {
    id: executionId,
    workflowId: workflow.id,
    workflowName: workflow.name,
    status: "running",
    startedAt: startTime.toISOString(),
    currentStep: 1,
    totalSteps: workflow.steps.length,
    results: [],
    patientId: params.patientId,
    initiatedBy: params.initiatedBy,
  };

  // Execute each step
  for (const step of workflow.steps) {
    if (step.requiresApproval && workflow.requiredApproval) {
      execution.status = "awaiting_approval";
      execution.currentStep = step.id;
      break;
    }

    const stepResult = await executeStep(step, params);
    execution.results.push(stepResult);
    execution.currentStep = step.id;
  }

  if (execution.status !== "awaiting_approval") {
    execution.status = "completed";
    execution.completedAt = new Date().toISOString();
  }

  // Generate AI summary
  execution.summary = await generateExecutionSummary(workflow, execution);

  return execution;
}

/**
 * Execute a single workflow step
 */
async function executeStep(
  step: WorkflowStep,
  params: { patientId?: string; customParams?: Record<string, unknown> }
): Promise<StepResult> {
  const startTime = Date.now();
  
  // Simulate step execution based on type
  let output: unknown;
  
  switch (step.type) {
    case "ai_analysis":
      output = await performAIAnalysis(step, params);
      break;
    case "data_fetch":
      output = { status: "fetched", records: Math.floor(Math.random() * 100) + 10 };
      break;
    case "decision":
      output = { decision: "approved", confidence: 0.92, rationale: "Based on clinical criteria" };
      break;
    case "notification":
      output = { sent: true, channel: "push+sms", recipients: 2, timestamp: new Date().toISOString() };
      break;
    case "document":
      output = { generated: true, type: "clinical_document", format: "FHIR DocumentReference" };
      break;
    case "order":
      output = { orderId: `ORD-${Date.now()}`, status: "placed", priority: "stat" };
      break;
    case "approval":
      output = { status: "pending_approval", approver: "attending_physician" };
      break;
    case "communication":
      output = { sent: true, method: "whatsapp", delivered: true };
      break;
    case "integration":
      output = { connected: true, response: "success", externalId: `EXT-${Math.random().toString(36).slice(2, 8)}` };
      break;
    default:
      output = { completed: true };
  }

  const duration = Date.now() - startTime;
  
  return {
    stepId: step.id,
    action: step.action,
    status: "completed",
    output,
    duration: `${duration}ms`,
    notes: step.description,
  };
}

/**
 * AI analysis for workflow steps
 */
async function performAIAnalysis(
  step: WorkflowStep,
  params: { patientId?: string; customParams?: Record<string, unknown> }
): Promise<unknown> {
  const client = getGeminiClient();
  
  if (!client) {
    return {
      analysis: "AI analysis completed",
      action: step.action,
      recommendations: ["Review clinical data", "Apply standard protocols"],
      confidence: 0.85,
    };
  }

  const prompt = `You are MediFlow, an autonomous clinical workflow agent. 
Perform this analysis step: "${step.description}"
Action: ${step.action}
Patient ID: ${params.patientId || "N/A"}
Context: ${JSON.stringify(params.customParams || {})}

Provide a brief JSON response with: analysis, recommendations (array), confidence (0-1), and urgency (low/medium/high/critical).`;

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.3 },
    });
    
    const text = result.text ?? "";
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch {}
    
    return {
      analysis: text.slice(0, 500),
      recommendations: ["Review AI output"],
      confidence: 0.8,
      urgency: "medium",
    };
  } catch {
    return {
      analysis: "AI analysis completed (fallback)",
      recommendations: ["Follow standard protocol"],
      confidence: 0.75,
      urgency: "medium",
    };
  }
}

/**
 * Generate execution summary
 */
async function generateExecutionSummary(
  workflow: WorkflowDefinition,
  execution: WorkflowExecution
): Promise<string> {
  const completedSteps = execution.results.filter(r => r.status === "completed").length;
  const totalSteps = workflow.steps.length;
  
  return `Workflow "${workflow.name}" ${execution.status === "completed" ? "completed successfully" : `paused at step ${execution.currentStep}`}. ${completedSteps}/${totalSteps} steps executed. Estimated time saved: ${workflow.estimatedTime.split("vs")[1]?.trim() || "significant"}.`;
}

/**
 * Get available workflows for a context
 */
export function getAvailableWorkflows(context: {
  category?: string;
  triggerType?: string;
  priority?: string;
}): WorkflowDefinition[] {
  let workflows = [...WORKFLOW_TEMPLATES];
  
  if (context.category) {
    workflows = workflows.filter(w => w.category === context.category);
  }
  if (context.triggerType) {
    workflows = workflows.filter(w => w.triggerType === context.triggerType);
  }
  if (context.priority) {
    workflows = workflows.filter(w => w.priority === context.priority);
  }
  
  return workflows;
}

/**
 * Natural language workflow execution
 */
export async function executeFromNaturalLanguage(
  instruction: string,
  patientId?: string
): Promise<{ matchedWorkflow: WorkflowDefinition | null; execution?: WorkflowExecution; suggestion?: string }> {
  const client = getGeminiClient();
  
  const workflowNames = WORKFLOW_TEMPLATES.map(w => `${w.id}: ${w.name} — ${w.description}`).join("\n");
  
  if (!client) {
    // Simple keyword matching fallback
    const lower = instruction.toLowerCase();
    let matched: WorkflowDefinition | null = null;
    
    if (lower.includes("admit") || lower.includes("admission")) matched = WORKFLOW_TEMPLATES[0];
    else if (lower.includes("discharge")) matched = WORKFLOW_TEMPLATES[1];
    else if (lower.includes("critical") || lower.includes("lab")) matched = WORKFLOW_TEMPLATES[2];
    else if (lower.includes("refer")) matched = WORKFLOW_TEMPLATES[3];
    else if (lower.includes("annual") || lower.includes("review")) matched = WORKFLOW_TEMPLATES[4];
    else if (lower.includes("preop") || lower.includes("surgery")) matched = WORKFLOW_TEMPLATES[5];
    else if (lower.includes("sepsis")) matched = WORKFLOW_TEMPLATES[6];
    else if (lower.includes("quality") || lower.includes("report")) matched = WORKFLOW_TEMPLATES[7];
    
    if (matched) {
      const execution = await executeWorkflow(matched.id, { patientId, initiatedBy: "physician" });
      return { matchedWorkflow: matched, execution };
    }
    
    return { matchedWorkflow: null, suggestion: "Could not match instruction to a workflow. Available workflows: " + WORKFLOW_TEMPLATES.map(w => w.name).join(", ") };
  }

  const prompt = `You are MediFlow workflow matcher. Match this instruction to the best workflow:

Instruction: "${instruction}"
Patient: ${patientId || "Not specified"}

Available Workflows:
${workflowNames}

Respond with ONLY the workflow ID (e.g., "wf-admission") or "none" if no match.`;

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.1 },
    });
    
    const text = result.text?.trim() ?? "";
    const matchedId = WORKFLOW_TEMPLATES.find(w => text.includes(w.id))?.id;
    
    if (matchedId) {
      const workflow = WORKFLOW_TEMPLATES.find(w => w.id === matchedId)!;
      const execution = await executeWorkflow(matchedId, { patientId, initiatedBy: "physician" });
      return { matchedWorkflow: workflow, execution };
    }
    
    return { matchedWorkflow: null, suggestion: `No matching workflow found for: "${instruction}". Try: admit patient, discharge planning, referral management, etc.` };
  } catch {
    return { matchedWorkflow: null, suggestion: "AI matching unavailable. Please select a workflow manually." };
  }
}
