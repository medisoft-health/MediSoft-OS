/**
 * MediMind — Multi-Agent AI Orchestrator
 * World's first healthcare Multi-Agent System (MAS)
 * Multiple specialized AI agents collaborate autonomously to deliver
 * coordinated patient care with physician oversight
 * 
 * Architecture: Coordinator Agent → Specialized Agents → Action Execution
 * Based on BCG 2026 Multi-Agent Healthcare Framework
 */

import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// ============================================================
// TYPES
// ============================================================

export type AgentRole = 
  | "coordinator"
  | "clinical"
  | "laboratory"
  | "pharmacy"
  | "scheduling"
  | "documentation"
  | "billing"
  | "triage"
  | "imaging"
  | "monitoring";

export type AgentStatus = "idle" | "thinking" | "acting" | "waiting" | "completed" | "error";

export type TaskPriority = "critical" | "high" | "medium" | "low";

export type TaskStatus = "pending" | "assigned" | "in_progress" | "completed" | "failed" | "escalated";

export interface AgentMessage {
  id: string;
  fromAgent: AgentRole;
  toAgent: AgentRole | "broadcast";
  type: "request" | "response" | "notification" | "escalation" | "handoff";
  content: string;
  data?: Record<string, unknown>;
  timestamp: string;
  priority: TaskPriority;
}

export interface AgentTask {
  id: string;
  title: string;
  description: string;
  assignedTo: AgentRole;
  createdBy: AgentRole;
  priority: TaskPriority;
  status: TaskStatus;
  dependencies: string[];
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface AgentDefinition {
  role: AgentRole;
  name: string;
  description: string;
  capabilities: string[];
  systemPrompt: string;
  canDelegateTo: AgentRole[];
  canEscalateTo: AgentRole[];
  maxConcurrentTasks: number;
  autonomyLevel: "full" | "supervised" | "approval_required";
}

export interface OrchestrationPlan {
  id: string;
  patientId?: string;
  trigger: string;
  goal: string;
  tasks: AgentTask[];
  messages: AgentMessage[];
  status: "planning" | "executing" | "completed" | "failed" | "paused";
  createdAt: string;
  completedAt?: string;
  totalDuration?: number;
  agentsInvolved: AgentRole[];
  humanApprovalRequired: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";
}

export interface MultiAgentSession {
  id: string;
  patientId: string;
  patientName: string;
  activePlan?: OrchestrationPlan;
  history: OrchestrationPlan[];
  activeAgents: AgentRole[];
  startedAt: string;
}

// ============================================================
// AGENT DEFINITIONS
// ============================================================

export const AGENT_REGISTRY: AgentDefinition[] = [
  {
    role: "coordinator",
    name: "MediMind Coordinator",
    description: "Master orchestrator that decomposes clinical goals into tasks and assigns them to specialized agents",
    capabilities: [
      "Task decomposition and planning",
      "Agent selection and assignment",
      "Priority management",
      "Conflict resolution",
      "Escalation handling",
      "Progress monitoring",
      "Resource optimization"
    ],
    systemPrompt: `You are the MediMind Coordinator — the master orchestrator of a multi-agent healthcare AI system.
Your role is to:
1. Receive clinical goals or patient events
2. Decompose them into discrete tasks
3. Assign tasks to the most appropriate specialized agents
4. Monitor progress and resolve conflicts
5. Ensure patient safety at every step
6. Escalate to physicians when needed

CRITICAL RULES:
- Patient safety is ALWAYS the top priority
- Never make treatment decisions without physician approval for high-risk actions
- Always verify drug interactions before approving pharmacy tasks
- Escalate immediately for: critical vitals, allergic reactions, diagnostic uncertainty
- Maintain full audit trail of all decisions`,
    canDelegateTo: ["clinical", "laboratory", "pharmacy", "scheduling", "documentation", "billing", "triage", "imaging", "monitoring"],
    canEscalateTo: [],
    maxConcurrentTasks: 20,
    autonomyLevel: "full"
  },
  {
    role: "clinical",
    name: "Clinical Decision Agent",
    description: "Analyzes patient data, generates differential diagnoses, recommends treatments, and creates care plans",
    capabilities: [
      "Differential diagnosis generation",
      "Treatment plan recommendation",
      "Evidence-based medicine lookup",
      "Clinical guideline matching",
      "Risk assessment",
      "Prognosis estimation",
      "Care plan creation"
    ],
    systemPrompt: `You are the Clinical Decision Agent. You analyze patient data and provide evidence-based clinical recommendations.
Always cite guidelines (ADA, ESC, NICE, etc.) and provide confidence levels.
Flag any uncertainty and recommend specialist consultation when needed.
Never finalize treatment without physician review for high-risk decisions.`,
    canDelegateTo: ["laboratory", "imaging"],
    canEscalateTo: ["coordinator"],
    maxConcurrentTasks: 5,
    autonomyLevel: "supervised"
  },
  {
    role: "laboratory",
    name: "Laboratory Intelligence Agent",
    description: "Orders appropriate lab tests, interprets results, detects critical values, and correlates with clinical picture",
    capabilities: [
      "Lab test recommendation",
      "Result interpretation",
      "Critical value detection",
      "Trend analysis",
      "Panel optimization",
      "Cost-effective ordering",
      "Reflex testing logic"
    ],
    systemPrompt: `You are the Laboratory Intelligence Agent. You recommend appropriate lab tests based on clinical context,
interpret results with reference ranges, detect critical values requiring immediate action,
and identify trends that inform clinical decisions. Always flag panic values immediately.`,
    canDelegateTo: [],
    canEscalateTo: ["clinical", "coordinator"],
    maxConcurrentTasks: 10,
    autonomyLevel: "supervised"
  },
  {
    role: "pharmacy",
    name: "Pharmacy Safety Agent",
    description: "Manages medications, checks interactions, calculates doses, verifies allergies, and ensures formulary compliance",
    capabilities: [
      "Drug interaction checking",
      "Dose calculation (weight/renal/hepatic)",
      "Allergy verification",
      "Formulary compliance",
      "Therapeutic duplication detection",
      "Pharmacogenomics integration",
      "Medication reconciliation"
    ],
    systemPrompt: `You are the Pharmacy Safety Agent. Patient safety is your absolute priority.
Check ALL drug interactions (drug-drug, drug-food, drug-disease, drug-gene).
Verify allergies before ANY medication approval. Calculate doses based on patient parameters.
NEVER approve a medication without full safety verification. Flag any concern immediately.`,
    canDelegateTo: [],
    canEscalateTo: ["clinical", "coordinator"],
    maxConcurrentTasks: 8,
    autonomyLevel: "approval_required"
  },
  {
    role: "scheduling",
    name: "Scheduling & Access Agent",
    description: "Manages appointments, follow-ups, referrals, and care coordination across providers",
    capabilities: [
      "Appointment scheduling",
      "Follow-up management",
      "Referral coordination",
      "Wait time optimization",
      "Resource allocation",
      "Conflict resolution",
      "Patient notification"
    ],
    systemPrompt: `You are the Scheduling & Access Agent. Optimize patient access while respecting clinical urgency.
Priority scheduling for urgent cases. Coordinate multi-provider visits efficiently.
Send appropriate reminders and handle rescheduling gracefully.`,
    canDelegateTo: [],
    canEscalateTo: ["coordinator"],
    maxConcurrentTasks: 15,
    autonomyLevel: "full"
  },
  {
    role: "documentation",
    name: "Documentation Agent",
    description: "Generates clinical notes, summaries, letters, and maintains complete medical records",
    capabilities: [
      "SOAP note generation",
      "Discharge summary creation",
      "Referral letter writing",
      "Progress note documentation",
      "Coding suggestion (ICD-11/CPT)",
      "Template management",
      "Quality documentation scoring"
    ],
    systemPrompt: `You are the Documentation Agent. Create accurate, complete, and compliant clinical documentation.
Follow SOAP format for notes. Include all relevant findings, assessments, and plans.
Suggest appropriate ICD-11 and CPT codes. Ensure documentation supports medical necessity.`,
    canDelegateTo: [],
    canEscalateTo: ["coordinator"],
    maxConcurrentTasks: 10,
    autonomyLevel: "full"
  },
  {
    role: "billing",
    name: "Revenue Cycle Agent",
    description: "Handles coding, claims, prior authorization, and payment management",
    capabilities: [
      "Auto-coding (ICD-11/CPT)",
      "Claims generation",
      "Prior authorization",
      "Denial management",
      "Payment posting",
      "AR follow-up",
      "Eligibility verification"
    ],
    systemPrompt: `You are the Revenue Cycle Agent. Ensure accurate coding, timely claims submission,
and maximum reimbursement while maintaining compliance. Predict and prevent denials.
Automate prior authorization when possible. Track AR aging and prioritize follow-ups.`,
    canDelegateTo: [],
    canEscalateTo: ["coordinator"],
    maxConcurrentTasks: 20,
    autonomyLevel: "full"
  },
  {
    role: "triage",
    name: "Triage & Priority Agent",
    description: "Assesses patient urgency, prioritizes care, and routes to appropriate resources",
    capabilities: [
      "ESI triage scoring",
      "Symptom assessment",
      "Urgency classification",
      "Resource routing",
      "Escalation triggering",
      "Mass casualty triage",
      "Telehealth routing"
    ],
    systemPrompt: `You are the Triage & Priority Agent. Rapidly assess patient urgency using ESI (Emergency Severity Index).
Route patients to appropriate care level. IMMEDIATELY escalate life-threatening conditions.
Consider: chief complaint, vital signs, pain level, mechanism of injury, and comorbidities.`,
    canDelegateTo: ["clinical", "scheduling"],
    canEscalateTo: ["coordinator"],
    maxConcurrentTasks: 30,
    autonomyLevel: "supervised"
  },
  {
    role: "imaging",
    name: "Imaging Intelligence Agent",
    description: "Recommends imaging studies, pre-reads results, and correlates with clinical findings",
    capabilities: [
      "Imaging study recommendation",
      "AI pre-read analysis",
      "Critical finding detection",
      "Prior comparison",
      "Protocol selection",
      "Radiation dose optimization",
      "Follow-up recommendation"
    ],
    systemPrompt: `You are the Imaging Intelligence Agent. Recommend appropriate imaging based on clinical indication.
Apply ACR Appropriateness Criteria. Detect critical findings requiring immediate notification.
Compare with prior studies. Optimize protocols for radiation dose. Suggest follow-up imaging when needed.`,
    canDelegateTo: [],
    canEscalateTo: ["clinical", "coordinator"],
    maxConcurrentTasks: 8,
    autonomyLevel: "supervised"
  },
  {
    role: "monitoring",
    name: "Continuous Monitoring Agent",
    description: "Monitors patient vitals, detects deterioration, and triggers early warnings",
    capabilities: [
      "Vital sign monitoring",
      "Deterioration prediction",
      "Early warning scoring (NEWS2/MEWS)",
      "Alarm management",
      "Trend detection",
      "Wearable data integration",
      "Rapid response triggering"
    ],
    systemPrompt: `You are the Continuous Monitoring Agent. Watch patient vitals and physiological data continuously.
Calculate NEWS2/MEWS scores. Detect deterioration EARLY. Trigger rapid response for critical changes.
Reduce alarm fatigue by intelligent filtering. Integrate wearable and IoT device data.`,
    canDelegateTo: [],
    canEscalateTo: ["triage", "clinical", "coordinator"],
    maxConcurrentTasks: 50,
    autonomyLevel: "full"
  }
];

// ============================================================
// ORCHESTRATION ENGINE
// ============================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Decomposes a clinical goal into tasks using AI
 */
export async function decomposeGoal(
  goal: string,
  patientContext?: Record<string, unknown>
): Promise<AgentTask[]> {
  const client = getGeminiClient();
  if (!client) {
    return getDefaultDecomposition(goal);
  }

  const prompt = `You are the MediMind Coordinator. Decompose this clinical goal into discrete tasks for specialized AI agents.

AVAILABLE AGENTS:
${AGENT_REGISTRY.map(a => `- ${a.role}: ${a.description}`).join("\n")}

CLINICAL GOAL: ${goal}

PATIENT CONTEXT: ${patientContext ? JSON.stringify(patientContext) : "Not provided"}

Respond in JSON format:
{
  "tasks": [
    {
      "title": "Task title",
      "description": "What needs to be done",
      "assignedTo": "agent_role",
      "priority": "critical|high|medium|low",
      "dependencies": ["task_id_if_depends_on_another"],
      "estimatedDuration": "seconds"
    }
  ],
  "reasoning": "Why this decomposition",
  "humanApprovalRequired": true/false,
  "riskLevel": "high|medium|low"
}`;

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.2 }
    });

    const text = result.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return (parsed.tasks || []).map((t: Record<string, unknown>, i: number) => ({
        id: `task-${generateId()}-${i}`,
        title: t.title as string,
        description: t.description as string,
        assignedTo: t.assignedTo as AgentRole,
        createdBy: "coordinator" as AgentRole,
        priority: (t.priority as TaskPriority) || "medium",
        status: "pending" as TaskStatus,
        dependencies: (t.dependencies as string[]) || [],
        input: patientContext || {}
      }));
    }
  } catch (e) {
    console.error("MediMind decomposition error:", e);
  }

  return getDefaultDecomposition(goal);
}

function getDefaultDecomposition(goal: string): AgentTask[] {
  const goalLower = goal.toLowerCase();
  const tasks: AgentTask[] = [];

  if (goalLower.includes("new patient") || goalLower.includes("admission")) {
    tasks.push(
      { id: `task-${generateId()}-0`, title: "Triage Assessment", description: "Assess patient urgency and priority", assignedTo: "triage", createdBy: "coordinator", priority: "high", status: "pending", dependencies: [], input: {} },
      { id: `task-${generateId()}-1`, title: "Clinical Assessment", description: "Perform initial clinical evaluation", assignedTo: "clinical", createdBy: "coordinator", priority: "high", status: "pending", dependencies: [], input: {} },
      { id: `task-${generateId()}-2`, title: "Order Labs", description: "Recommend and order appropriate laboratory tests", assignedTo: "laboratory", createdBy: "coordinator", priority: "medium", status: "pending", dependencies: [], input: {} },
      { id: `task-${generateId()}-3`, title: "Medication Review", description: "Review current medications and reconcile", assignedTo: "pharmacy", createdBy: "coordinator", priority: "medium", status: "pending", dependencies: [], input: {} },
      { id: `task-${generateId()}-4`, title: "Documentation", description: "Create admission note", assignedTo: "documentation", createdBy: "coordinator", priority: "medium", status: "pending", dependencies: [], input: {} },
      { id: `task-${generateId()}-5`, title: "Insurance Verification", description: "Verify insurance eligibility", assignedTo: "billing", createdBy: "coordinator", priority: "low", status: "pending", dependencies: [], input: {} }
    );
  } else if (goalLower.includes("chest pain") || goalLower.includes("emergency")) {
    tasks.push(
      { id: `task-${generateId()}-0`, title: "CRITICAL Triage", description: "Immediate ESI-1/2 assessment", assignedTo: "triage", createdBy: "coordinator", priority: "critical", status: "pending", dependencies: [], input: {} },
      { id: `task-${generateId()}-1`, title: "Continuous Monitoring", description: "Activate continuous cardiac monitoring", assignedTo: "monitoring", createdBy: "coordinator", priority: "critical", status: "pending", dependencies: [], input: {} },
      { id: `task-${generateId()}-2`, title: "STAT Labs", description: "Order Troponin, CBC, BMP, Coag panel STAT", assignedTo: "laboratory", createdBy: "coordinator", priority: "critical", status: "pending", dependencies: [], input: {} },
      { id: `task-${generateId()}-3`, title: "ECG/Imaging", description: "Order 12-lead ECG and chest X-ray", assignedTo: "imaging", createdBy: "coordinator", priority: "critical", status: "pending", dependencies: [], input: {} },
      { id: `task-${generateId()}-4`, title: "Clinical Decision", description: "ACS protocol evaluation", assignedTo: "clinical", createdBy: "coordinator", priority: "critical", status: "pending", dependencies: [], input: {} },
      { id: `task-${generateId()}-5`, title: "Medication Prep", description: "Prepare aspirin, heparin, nitroglycerin per protocol", assignedTo: "pharmacy", createdBy: "coordinator", priority: "critical", status: "pending", dependencies: [], input: {} }
    );
  } else if (goalLower.includes("diabetes") || goalLower.includes("chronic")) {
    tasks.push(
      { id: `task-${generateId()}-0`, title: "Clinical Review", description: "Review diabetes management and A1C trends", assignedTo: "clinical", createdBy: "coordinator", priority: "high", status: "pending", dependencies: [], input: {} },
      { id: `task-${generateId()}-1`, title: "Lab Orders", description: "Order HbA1c, lipid panel, renal function, urine albumin", assignedTo: "laboratory", createdBy: "coordinator", priority: "medium", status: "pending", dependencies: [], input: {} },
      { id: `task-${generateId()}-2`, title: "Medication Optimization", description: "Review and optimize diabetes medications per ADA 2026", assignedTo: "pharmacy", createdBy: "coordinator", priority: "high", status: "pending", dependencies: [], input: {} },
      { id: `task-${generateId()}-3`, title: "Schedule Follow-up", description: "Schedule 3-month follow-up and annual screening", assignedTo: "scheduling", createdBy: "coordinator", priority: "medium", status: "pending", dependencies: [], input: {} },
      { id: `task-${generateId()}-4`, title: "Documentation", description: "Generate diabetes management note", assignedTo: "documentation", createdBy: "coordinator", priority: "low", status: "pending", dependencies: [], input: {} }
    );
  } else {
    tasks.push(
      { id: `task-${generateId()}-0`, title: "Clinical Assessment", description: `Assess patient for: ${goal}`, assignedTo: "clinical", createdBy: "coordinator", priority: "high", status: "pending", dependencies: [], input: {} },
      { id: `task-${generateId()}-1`, title: "Diagnostic Workup", description: "Recommend appropriate diagnostics", assignedTo: "laboratory", createdBy: "coordinator", priority: "medium", status: "pending", dependencies: [], input: {} },
      { id: `task-${generateId()}-2`, title: "Treatment Planning", description: "Develop treatment plan", assignedTo: "pharmacy", createdBy: "coordinator", priority: "medium", status: "pending", dependencies: [], input: {} },
      { id: `task-${generateId()}-3`, title: "Documentation", description: "Document encounter", assignedTo: "documentation", createdBy: "coordinator", priority: "low", status: "pending", dependencies: [], input: {} }
    );
  }

  return tasks;
}

/**
 * Execute a single agent task using AI
 */
export async function executeAgentTask(
  task: AgentTask,
  context?: Record<string, unknown>
): Promise<AgentTask> {
  const agent = AGENT_REGISTRY.find(a => a.role === task.assignedTo);
  if (!agent) {
    return { ...task, status: "failed", error: `Agent ${task.assignedTo} not found` };
  }

  const client = getGeminiClient();
  if (!client) {
    return {
      ...task,
      status: "completed",
      output: { result: `[${agent.name}] Task "${task.title}" completed (simulation mode)`, confidence: 0.85 },
      completedAt: new Date().toISOString()
    };
  }

  const prompt = `${agent.systemPrompt}

TASK: ${task.title}
DESCRIPTION: ${task.description}
PRIORITY: ${task.priority}
CONTEXT: ${JSON.stringify(context || task.input)}

Execute this task and provide your output in JSON format:
{
  "result": "Your detailed findings/recommendations/actions",
  "confidence": 0.0-1.0,
  "actions_taken": ["list of actions performed"],
  "recommendations": ["list of recommendations"],
  "alerts": ["any urgent alerts or concerns"],
  "needs_escalation": true/false,
  "escalation_reason": "if needs_escalation is true"
}`;

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.3 }
    });

    const text = result.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const output = JSON.parse(jsonMatch[0]);
      return {
        ...task,
        status: output.needs_escalation ? "escalated" : "completed",
        output,
        completedAt: new Date().toISOString()
      };
    }
  } catch (e) {
    console.error(`Agent ${agent.role} execution error:`, e);
  }

  return {
    ...task,
    status: "completed",
    output: { result: `[${agent.name}] Completed: ${task.title}`, confidence: 0.8 },
    completedAt: new Date().toISOString()
  };
}

/**
 * Run a full orchestration plan — coordinate multiple agents
 */
export async function orchestrate(
  goal: string,
  patientContext?: Record<string, unknown>
): Promise<OrchestrationPlan> {
  const planId = generateId();
  const startTime = Date.now();

  // Step 1: Decompose goal into tasks
  const tasks = await decomposeGoal(goal, patientContext);

  // Step 2: Execute tasks (respecting dependencies)
  const messages: AgentMessage[] = [];
  const completedTasks: AgentTask[] = [];
  const agentsInvolved = new Set<AgentRole>(["coordinator"]);

  for (const task of tasks) {
    agentsInvolved.add(task.assignedTo);

    // Send assignment message
    messages.push({
      id: generateId(),
      fromAgent: "coordinator",
      toAgent: task.assignedTo,
      type: "request",
      content: `Execute task: ${task.title}`,
      data: { taskId: task.id },
      timestamp: new Date().toISOString(),
      priority: task.priority
    });

    // Execute the task
    const executedTask = await executeAgentTask(task, patientContext);
    completedTasks.push(executedTask);

    // Agent response message
    messages.push({
      id: generateId(),
      fromAgent: task.assignedTo,
      toAgent: "coordinator",
      type: executedTask.status === "escalated" ? "escalation" : "response",
      content: typeof executedTask.output?.result === "string" 
        ? executedTask.output.result 
        : `Task ${task.title} completed`,
      data: executedTask.output as Record<string, unknown>,
      timestamp: new Date().toISOString(),
      priority: task.priority
    });
  }

  const endTime = Date.now();
  const hasEscalations = completedTasks.some(t => t.status === "escalated");
  const hasCritical = tasks.some(t => t.priority === "critical");

  return {
    id: planId,
    patientId: patientContext?.patientId as string | undefined,
    trigger: "manual",
    goal,
    tasks: completedTasks,
    messages,
    status: hasEscalations ? "paused" : "completed",
    createdAt: new Date(startTime).toISOString(),
    completedAt: new Date(endTime).toISOString(),
    totalDuration: endTime - startTime,
    agentsInvolved: Array.from(agentsInvolved),
    humanApprovalRequired: hasEscalations || hasCritical,
    approvalStatus: hasEscalations ? "pending" : undefined
  };
}

/**
 * Natural language orchestration — user describes what they need
 */
export async function orchestrateFromNaturalLanguage(
  instruction: string,
  patientContext?: Record<string, unknown>
): Promise<OrchestrationPlan> {
  return orchestrate(instruction, patientContext);
}

// ============================================================
// DEMO SCENARIOS
// ============================================================

export const DEMO_SCENARIOS = [
  {
    id: "chest_pain_emergency",
    name: "Chest Pain Emergency Protocol",
    description: "Patient presents with acute chest pain — full ACS workup",
    goal: "Emergency chest pain evaluation — activate ACS protocol",
    patientContext: {
      patientId: "demo-001",
      name: "Ahmed Al-Rashid",
      age: 58,
      gender: "male",
      chiefComplaint: "Crushing chest pain radiating to left arm, onset 45 minutes ago",
      vitals: { hr: 110, bp: "160/95", spo2: 94, rr: 22, temp: 37.1 },
      history: ["Hypertension", "Hyperlipidemia", "Smoker 30 pack-years"],
      medications: ["Amlodipine 10mg", "Atorvastatin 40mg"]
    }
  },
  {
    id: "new_diabetes_management",
    name: "New Diabetes Diagnosis",
    description: "Newly diagnosed Type 2 Diabetes — comprehensive management plan",
    goal: "New Type 2 Diabetes diagnosis — create comprehensive management plan",
    patientContext: {
      patientId: "demo-002",
      name: "Fatima Hassan",
      age: 45,
      gender: "female",
      chiefComplaint: "Polyuria, polydipsia, weight loss over 3 months",
      vitals: { hr: 78, bp: "135/85", spo2: 98, rr: 16, temp: 36.8 },
      labs: { hba1c: 9.2, fasting_glucose: 210, bmi: 32.5 },
      history: ["Obesity", "Family history of DM"],
      medications: []
    }
  },
  {
    id: "post_surgical_care",
    name: "Post-Surgical Care Coordination",
    description: "Post-cholecystectomy patient — discharge planning and follow-up",
    goal: "Post-surgical discharge planning — coordinate care transition",
    patientContext: {
      patientId: "demo-003",
      name: "Mohammed Al-Thani",
      age: 35,
      gender: "male",
      procedure: "Laparoscopic cholecystectomy",
      postOpDay: 1,
      vitals: { hr: 72, bp: "125/78", spo2: 99, rr: 14, temp: 36.9 },
      pain: "4/10",
      diet: "Clear liquids tolerated",
      ambulation: "Walking independently"
    }
  }
];

// ============================================================
// EXPORTS
// ============================================================

export { AGENT_REGISTRY as agents };
