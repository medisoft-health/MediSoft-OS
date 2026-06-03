/**
 * MediLearn API — Adaptive Medical Education
 * AI-powered personalized training with competency tracking
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { getAdaptiveCase, assessResponse, detectErrorPatterns, generateLearningPlan, getCMESummary, getDemoPhysician, CASE_DATABASE, COMPETENCY_FRAMEWORK } from "@/lib/medilearn";

export async function GET() {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  return NextResponse.json({
    service: "MediLearn",
    version: "1.0.0",
    status: "active",
    description: "Adaptive Medical Education — AI-powered personalized training with error pattern detection, competency assessment, and CME tracking",
    capabilities: [
      "Adaptive case-based learning (difficulty adjusts to learner level)",
      "6 competency domains (CanMEDS/ACGME framework)",
      "Error pattern detection and targeted remediation",
      "Personalized learning plans with weekly schedules",
      "CME credit tracking and compliance monitoring",
      "AI-generated feedback (Gemini 2.5 Pro)",
      "Miller's Pyramid competency progression",
    ],
    stats: {
      trainingCases: CASE_DATABASE.length,
      competencyDomains: COMPETENCY_FRAMEWORK.domains.length,
      specialties: [...new Set(CASE_DATABASE.map(c => c.specialty))].length,
      difficultyLevels: 4,
    },
    competencyFramework: COMPETENCY_FRAMEWORK.domains.map(d => ({
      name: d.name,
      subdomains: d.subdomains,
      weight: d.weight,
    })),
    endpoints: {
      "GET /": "Service status and competency framework",
      "POST / (action: adaptive_case)": "Get personalized training case for physician",
      "POST / (action: assess)": "Submit answers and get assessment with feedback",
      "POST / (action: error_patterns)": "Detect error patterns from learning history",
      "POST / (action: learning_plan)": "Generate personalized learning plan",
      "POST / (action: cme_summary)": "Get CME tracking summary",
      "POST / (action: demo)": "Full demo with physician profile, case, and assessment",
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "adaptive_case": {
        const { physician } = body;
        const phys = physician || getDemoPhysician();
        const adaptiveCase = await getAdaptiveCase(phys);

        return NextResponse.json({
          success: true,
          data: {
            physician: { id: phys.id, name: phys.name, level: phys.level, weakestDomain: phys.competencyProfile.domains.sort((a: { score: number }, b: { score: number }) => a.score - b.score)[0]?.name },
            case: adaptiveCase,
          },
        });
      }

      case "assess": {
        const { physician, caseId, answers, timeSpent } = body;
        
        if (!caseId || !answers) {
          return NextResponse.json({ error: "caseId and answers required" }, { status: 400 });
        }

        const phys = physician || getDemoPhysician();
        const result = await assessResponse({
          physician: phys,
          caseId,
          answers,
          timeSpent: timeSpent || 20,
        });

        return NextResponse.json({ success: true, data: result });
      }

      case "error_patterns": {
        const { physician } = body;
        const phys = physician || getDemoPhysician();
        const patterns = detectErrorPatterns(phys);

        return NextResponse.json({
          success: true,
          data: {
            physician: { id: phys.id, name: phys.name },
            errorPatterns: patterns,
            totalPatterns: patterns.length,
            criticalPatterns: patterns.filter(p => p.severity === "critical" || p.severity === "high").length,
          },
        });
      }

      case "learning_plan": {
        const { physician } = body;
        const phys = physician || getDemoPhysician();
        const plan = await generateLearningPlan(phys);

        return NextResponse.json({ success: true, data: plan });
      }

      case "cme_summary": {
        const { physician } = body;
        const phys = physician || getDemoPhysician();
        const summary = getCMESummary(phys);

        return NextResponse.json({ success: true, data: summary });
      }

      case "demo": {
        const physician = getDemoPhysician();
        const adaptiveCase = await getAdaptiveCase(physician);
        
        // Simulate assessment with demo answers
        const demoAnswers = adaptiveCase.questions.map(q => ({
          questionId: q.id,
          answer: Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer,
        }));
        
        const assessment = await assessResponse({
          physician,
          caseId: adaptiveCase.id,
          answers: demoAnswers,
          timeSpent: 22,
        });
        
        const learningPlan = await generateLearningPlan(physician);
        const cmeSummary = getCMESummary(physician);
        const errorPatterns = detectErrorPatterns(physician);

        return NextResponse.json({
          success: true,
          data: {
            physician: {
              ...physician,
              errorPatterns: undefined,
              learningHistory: undefined,
            },
            competencyProfile: physician.competencyProfile,
            adaptiveCase: {
              id: adaptiveCase.id,
              title: adaptiveCase.title,
              difficulty: adaptiveCase.difficulty,
              specialty: adaptiveCase.specialty,
              estimatedTime: adaptiveCase.estimatedTime,
              questionsCount: adaptiveCase.questions.length,
            },
            assessment: {
              score: assessment.score,
              feedback: assessment.feedback,
              nextRecommendation: assessment.nextRecommendation,
            },
            learningPlan: {
              goals: learningPlan.goals.length,
              priorityAreas: learningPlan.priorityAreas,
              estimatedHours: learningPlan.estimatedCompletionTime,
            },
            cmeSummary,
            errorPatterns: {
              total: errorPatterns.length,
              critical: errorPatterns.filter(p => p.severity === "high" || p.severity === "critical").length,
            },
          },
        });
      }

      default:
        return NextResponse.json({
          error: "Invalid action",
          validActions: ["adaptive_case", "assess", "error_patterns", "learning_plan", "cme_summary", "demo"],
        }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
