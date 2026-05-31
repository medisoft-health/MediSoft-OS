/**
 * MediFlow API — Autonomous Clinical Workflow Agent
 * Executes multi-step clinical workflows with AI
 */

import { NextRequest, NextResponse } from "next/server";
import { executeWorkflow, getAvailableWorkflows, executeFromNaturalLanguage, WORKFLOW_TEMPLATES, AGENT_CAPABILITIES } from "@/lib/mediflow";

export async function GET() {
  return NextResponse.json({
    service: "MediFlow",
    version: "1.0.0",
    status: "active",
    description: "Autonomous Clinical Workflow Agent — first fully agentic AI in healthcare",
    capabilities: AGENT_CAPABILITIES.map(c => c.name),
    workflows: WORKFLOW_TEMPLATES.map(w => ({
      id: w.id,
      name: w.name,
      category: w.category,
      priority: w.priority,
      steps: w.steps.length,
      estimatedTime: w.estimatedTime,
      triggerType: w.triggerType,
    })),
    stats: {
      totalWorkflows: WORKFLOW_TEMPLATES.length,
      categories: ["clinical", "administrative", "communication", "research", "quality"],
      agentCapabilities: AGENT_CAPABILITIES.length,
    },
    endpoints: {
      "GET /": "Service status and available workflows",
      "POST / (action: execute)": "Execute a specific workflow by ID",
      "POST / (action: natural_language)": "Execute workflow from natural language instruction",
      "POST / (action: list)": "List workflows filtered by category/priority",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, workflowId, patientId, instruction, category, priority, triggerType } = body;

    switch (action) {
      case "execute": {
        if (!workflowId) {
          return NextResponse.json({ error: "workflowId required" }, { status: 400 });
        }

        const execution = await executeWorkflow(workflowId, {
          patientId,
          initiatedBy: body.initiatedBy || "physician",
          customParams: body.params,
        });

        return NextResponse.json({
          success: true,
          data: execution,
        });
      }

      case "natural_language": {
        if (!instruction) {
          return NextResponse.json({ error: "instruction required" }, { status: 400 });
        }

        const result = await executeFromNaturalLanguage(instruction, patientId);

        return NextResponse.json({
          success: true,
          data: result,
        });
      }

      case "list": {
        const workflows = getAvailableWorkflows({ category, priority, triggerType });
        return NextResponse.json({
          success: true,
          data: {
            count: workflows.length,
            workflows: workflows.map(w => ({
              id: w.id,
              name: w.name,
              description: w.description,
              category: w.category,
              priority: w.priority,
              steps: w.steps.length,
              estimatedTime: w.estimatedTime,
              requiresApproval: w.requiredApproval,
            })),
          },
        });
      }

      default:
        return NextResponse.json({
          error: "Invalid action",
          validActions: ["execute", "natural_language", "list"],
        }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
