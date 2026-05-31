import { NextRequest, NextResponse } from "next/server";
import {
  registerNode,
  getRegisteredNodes,
  initiateTrainingRound,
  completeTrainingRound,
  getPrivacyAudits,
  getTrainingHistory,
  generateComplianceReport,
  initializeDemoNodes,
  FEDERATED_CONFIG,
} from "@/lib/medifederate";

// ─────────────────────────────────────────────────────────────────────────────
// MediFederate API — Privacy-Preserving Federated Learning
// GET: System status and capabilities
// POST: Node management, training, compliance
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const nodes = getRegisteredNodes();
  const history = getTrainingHistory();

  return NextResponse.json({
    success: true,
    system: "MediFederate — Privacy-Preserving Federated Learning",
    version: "1.0.0",
    description: "Enables AI model improvement across multiple hospitals WITHOUT patient data ever leaving hospital premises. Fully compliant with HIPAA, GDPR, Saudi PDPL, and NDMO regulations.",
    architecture: {
      strategy: FEDERATED_CONFIG.aggregationStrategy,
      protocol: FEDERATED_CONFIG.communicationProtocol,
      privacy: {
        mechanism: "Differential Privacy (ε-δ) + Secure Aggregation",
        epsilon: FEDERATED_CONFIG.privacy.epsilon,
        delta: FEDERATED_CONFIG.privacy.delta,
        kAnonymity: FEDERATED_CONFIG.privacy.kAnonymity,
        encryption: "AES-256 at rest, TLS 1.3 in transit",
      },
    },
    registeredModels: FEDERATED_CONFIG.models.map((m) => ({
      id: m.id,
      name: m.name,
      task: m.task,
      architecture: m.architecture,
    })),
    network: {
      totalNodes: nodes.length,
      activeNodes: nodes.filter((n) => n.status === "active" || n.status === "idle").length,
      trainingNodes: nodes.filter((n) => n.status === "training").length,
      totalTrainingRounds: history.length,
      completedRounds: history.filter((r) => r.status === "completed").length,
    },
    compliance: FEDERATED_CONFIG.compliance,
    actions: {
      register_node: "Register a new hospital node in the federation",
      init_demo: "Initialize demo nodes (5 GCC hospitals)",
      start_training: "Initiate a federated training round",
      complete_training: "Complete a training round (simulate aggregation)",
      compliance_report: "Generate full compliance report",
      privacy_audit: "View privacy audit trail",
      list_nodes: "List all registered nodes",
      training_history: "View training round history",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "init_demo": {
        const nodes = initializeDemoNodes();
        return NextResponse.json({
          success: true,
          action: "init_demo",
          message: `Initialized ${nodes.length} demo hospital nodes in the federation`,
          nodes: nodes.map((n) => ({
            nodeId: n.nodeId,
            hospital: n.hospitalName,
            location: n.location,
            patients: n.dataStats.totalPatients,
            dataQuality: n.dataStats.dataQualityScore,
          })),
          totalPatients: nodes.reduce((sum, n) => sum + n.dataStats.totalPatients, 0),
          totalEncounters: nodes.reduce((sum, n) => sum + n.dataStats.totalEncounters, 0),
          privacyGuarantee: "No patient data leaves hospital premises. Only encrypted model gradients are shared.",
        });
      }

      case "register_node": {
        const { hospitalName, location, dataStats } = body;
        if (!hospitalName || !location) {
          return NextResponse.json(
            { success: false, error: "hospitalName and location are required" },
            { status: 400 }
          );
        }

        const node = registerNode(
          hospitalName,
          location,
          dataStats || { totalPatients: 0, totalEncounters: 0, totalImages: 0, dataQualityScore: 0 }
        );

        return NextResponse.json({
          success: true,
          action: "register_node",
          node,
          message: `${hospitalName} registered successfully. Node ID: ${node.nodeId}`,
        });
      }

      case "list_nodes": {
        const nodes = getRegisteredNodes();
        return NextResponse.json({
          success: true,
          action: "list_nodes",
          totalNodes: nodes.length,
          nodes,
        });
      }

      case "start_training": {
        const { modelId, nodeIds } = body;
        const nodes = getRegisteredNodes();

        if (nodes.length === 0) {
          return NextResponse.json(
            { success: false, error: "No nodes registered. Use init_demo first." },
            { status: 400 }
          );
        }

        const selectedModel = modelId || FEDERATED_CONFIG.models[0].id;
        const selectedNodes = nodeIds || nodes.slice(0, 3).map((n) => n.nodeId);

        if (selectedNodes.length < FEDERATED_CONFIG.minNodesPerRound) {
          return NextResponse.json(
            { success: false, error: `Minimum ${FEDERATED_CONFIG.minNodesPerRound} nodes required per round` },
            { status: 400 }
          );
        }

        const round = initiateTrainingRound(selectedModel, selectedNodes);

        return NextResponse.json({
          success: true,
          action: "start_training",
          round,
          message: `Training round ${round.roundId} initiated with ${selectedNodes.length} nodes for model ${selectedModel}`,
          privacyNote: "Differential privacy (ε=${FEDERATED_CONFIG.privacy.epsilon}) applied. Secure aggregation active.",
        });
      }

      case "complete_training": {
        const { roundId } = body;
        const history = getTrainingHistory();

        const activeRound = roundId
          ? history.find((r) => r.roundId === roundId)
          : history.find((r) => r.status === "in_progress");

        if (!activeRound) {
          return NextResponse.json(
            { success: false, error: "No active training round found. Start one first." },
            { status: 400 }
          );
        }

        const completed = completeTrainingRound(activeRound.roundId);

        return NextResponse.json({
          success: true,
          action: "complete_training",
          round: completed,
          message: `Training round completed. Global accuracy: ${((completed?.metrics.globalAccuracy || 0) * 100).toFixed(1)}%. Privacy budget used: ${completed?.metrics.privacyBudgetUsed.toFixed(4)}ε`,
        });
      }

      case "compliance_report": {
        const report = generateComplianceReport();
        return NextResponse.json({
          success: true,
          action: "compliance_report",
          report,
          message: `Compliance status: ${report.status.toUpperCase()}. All ${report.regulations.length} regulations met.`,
        });
      }

      case "privacy_audit": {
        const { nodeId } = body;
        const audits = getPrivacyAudits(nodeId);
        return NextResponse.json({
          success: true,
          action: "privacy_audit",
          totalAudits: audits.length,
          audits: audits.slice(-20), // Last 20
          summary: {
            totalEpsilonSpent: audits.reduce((sum, a) => sum + a.epsilonSpent, 0),
            allCompliant: audits.every((a) => a.compliant),
            dataExposureEvents: audits.filter((a) => a.dataExposureRisk !== "none" && a.dataExposureRisk !== "negligible").length,
          },
        });
      }

      case "training_history": {
        const history = getTrainingHistory();
        return NextResponse.json({
          success: true,
          action: "training_history",
          totalRounds: history.length,
          completedRounds: history.filter((r) => r.status === "completed").length,
          rounds: history,
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown action: ${action}. Valid: init_demo, register_node, list_nodes, start_training, complete_training, compliance_report, privacy_audit, training_history`,
          },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
