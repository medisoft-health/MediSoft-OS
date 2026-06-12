/**
 * MediMind API — Multi-Agent AI Orchestrator
 * World's first healthcare Multi-Agent System
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import {
  orchestrate,
  orchestrateFromNaturalLanguage,
  decomposeGoal,
  executeAgentTask,
  AGENT_REGISTRY,
  DEMO_SCENARIOS,
  type AgentTask
} from "@/lib/medimind";

export async function GET() {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  return NextResponse.json({
    service: "MediMind",
    version: "1.0.0",
    status: "active",
    description: "Multi-Agent AI Orchestrator — world's first healthcare multi-agent system with autonomous task coordination",
    architecture: {
      pattern: "Coordinator → Specialized Agents → Action Execution",
      totalAgents: AGENT_REGISTRY.length,
      agents: AGENT_REGISTRY.map(a => ({
        role: a.role,
        name: a.name,
        capabilities: a.capabilities.length,
        autonomyLevel: a.autonomyLevel,
        maxConcurrentTasks: a.maxConcurrentTasks
      }))
    },
    capabilities: [
      "Goal decomposition into multi-agent tasks",
      "Autonomous task assignment and execution",
      "Inter-agent communication and handoff",
      "Priority-based scheduling (critical/high/medium/low)",
      "Automatic escalation for high-risk decisions",
      "Natural language orchestration",
      "Full audit trail of all agent decisions",
      "Physician-in-the-loop for critical actions",
      "10 specialized agents working in coordination",
      "Real-time progress monitoring"
    ],
    demoScenarios: DEMO_SCENARIOS.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description
    })),
    endpoints: {
      "GET /": "Service status and agent registry",
      "POST / (action: orchestrate)": "Execute full multi-agent orchestration for a clinical goal",
      "POST / (action: decompose)": "Decompose a goal into tasks without executing",
      "POST / (action: execute_task)": "Execute a single agent task",
      "POST / (action: demo)": "Run a demo scenario",
      "POST / (action: natural_language)": "Orchestrate from natural language instruction"
    }
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "orchestrate": {
        const { goal, patientContext } = body;
        if (!goal) {
          return NextResponse.json({ error: "goal is required" }, { status: 400 });
        }
        const plan = await orchestrate(goal, patientContext);
        return NextResponse.json({
          success: true,
          plan: {
            id: plan.id,
            goal: plan.goal,
            status: plan.status,
            totalTasks: plan.tasks.length,
            completedTasks: plan.tasks.filter(t => t.status === "completed").length,
            escalatedTasks: plan.tasks.filter(t => t.status === "escalated").length,
            agentsInvolved: plan.agentsInvolved,
            humanApprovalRequired: plan.humanApprovalRequired,
            totalDuration: plan.totalDuration,
            tasks: plan.tasks.map(t => ({
              id: t.id,
              title: t.title,
              assignedTo: t.assignedTo,
              priority: t.priority,
              status: t.status,
              output: t.output
            })),
            messages: plan.messages.slice(0, 20),
            summary: generatePlanSummary(plan.tasks)
          }
        });
      }

      case "decompose": {
        const { goal, patientContext } = body;
        if (!goal) {
          return NextResponse.json({ error: "goal is required" }, { status: 400 });
        }
        const tasks = await decomposeGoal(goal, patientContext);
        return NextResponse.json({
          success: true,
          goal,
          totalTasks: tasks.length,
          tasks: tasks.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            assignedTo: t.assignedTo,
            priority: t.priority,
            dependencies: t.dependencies
          })),
          agentsNeeded: [...new Set(tasks.map(t => t.assignedTo))]
        });
      }

      case "execute_task": {
        const { task, context } = body;
        if (!task) {
          return NextResponse.json({ error: "task object is required" }, { status: 400 });
        }
        const result = await executeAgentTask(task as AgentTask, context);
        return NextResponse.json({ success: true, result });
      }

      case "demo": {
        const { scenarioId } = body;
        const scenario = DEMO_SCENARIOS.find(s => s.id === scenarioId) || DEMO_SCENARIOS[0];
        const plan = await orchestrate(scenario.goal, scenario.patientContext);
        return NextResponse.json({
          success: true,
          scenario: {
            id: scenario.id,
            name: scenario.name,
            description: scenario.description,
            patient: scenario.patientContext
          },
          plan: {
            id: plan.id,
            goal: plan.goal,
            status: plan.status,
            totalTasks: plan.tasks.length,
            completedTasks: plan.tasks.filter(t => t.status === "completed").length,
            agentsInvolved: plan.agentsInvolved,
            humanApprovalRequired: plan.humanApprovalRequired,
            totalDuration: plan.totalDuration,
            tasks: plan.tasks.map(t => ({
              title: t.title,
              agent: t.assignedTo,
              priority: t.priority,
              status: t.status,
              output: t.output
            })),
            messageCount: plan.messages.length
          }
        });
      }

      case "natural_language": {
        const { instruction, patientContext } = body;
        if (!instruction) {
          return NextResponse.json({ error: "instruction is required" }, { status: 400 });
        }
        const plan = await orchestrateFromNaturalLanguage(instruction, patientContext);
        return NextResponse.json({
          success: true,
          instruction,
          plan: {
            id: plan.id,
            status: plan.status,
            tasks: plan.tasks.map(t => ({
              title: t.title,
              agent: t.assignedTo,
              priority: t.priority,
              status: t.status,
              result: t.output?.result
            })),
            agentsInvolved: plan.agentsInvolved,
            totalDuration: plan.totalDuration
          }
        });
      }

      default:
        return NextResponse.json({
          error: "Invalid action",
          validActions: ["orchestrate", "decompose", "execute_task", "demo", "natural_language"]
        }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}

function generatePlanSummary(tasks: AgentTask[]): string {
  const completed = tasks.filter(t => t.status === "completed").length;
  const escalated = tasks.filter(t => t.status === "escalated").length;
  const total = tasks.length;
  const agents = [...new Set(tasks.map(t => t.assignedTo))];

  let summary = `Orchestration complete: ${completed}/${total} tasks executed by ${agents.length} agents.`;
  if (escalated > 0) {
    summary += ` ${escalated} task(s) escalated for physician review.`;
  }
  return summary;
}
