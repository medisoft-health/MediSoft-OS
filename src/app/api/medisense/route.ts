/**
 * MediSense API — IoT + AI Continuous Monitoring
 * Real-time patient monitoring with wearables and AI anomaly detection
 */

import { NextRequest, NextResponse } from "next/server";
import { processReading, generatePatientInsight, getRecommendedMonitoring, SUPPORTED_DEVICES } from "@/lib/medisense";

export async function GET() {
  return NextResponse.json({
    service: "MediSense",
    version: "1.0.0",
    status: "active",
    description: "IoT + AI Continuous Monitoring — real-time patient monitoring with wearables and AI anomaly detection",
    supportedDevices: Object.entries(SUPPORTED_DEVICES).map(([type, info]) => ({
      type,
      manufacturer: info.manufacturer,
      metrics: info.metrics,
      syncMethod: info.syncMethod,
    })),
    stats: {
      totalDeviceTypes: Object.keys(SUPPORTED_DEVICES).length,
      totalMetrics: new Set(Object.values(SUPPORTED_DEVICES).flatMap(d => d.metrics)).size,
    },
    endpoints: {
      "GET /": "Service status and supported devices",
      "POST / (action: process_reading)": "Process incoming device reading and detect anomalies",
      "POST / (action: patient_insight)": "Generate AI-powered patient insight report",
      "POST / (action: recommend_monitoring)": "Get recommended monitoring setup for patient conditions",
      "POST / (action: simulate)": "Simulate real-time monitoring with demo data",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "process_reading": {
        const { deviceId, deviceType, patientId, metrics } = body;
        
        if (!patientId || !metrics) {
          return NextResponse.json({ error: "patientId and metrics required" }, { status: 400 });
        }

        const result = await processReading({
          deviceId: deviceId || `dev-${Date.now()}`,
          deviceType: deviceType || "apple_watch",
          patientId,
          timestamp: new Date().toISOString(),
          metrics,
        });

        return NextResponse.json({
          success: true,
          data: result,
        });
      }

      case "patient_insight": {
        const { patientId, conditions, medications } = body;
        
        if (!patientId) {
          return NextResponse.json({ error: "patientId required" }, { status: 400 });
        }

        // Generate demo readings for insight
        const demoReadings = generateDemoReadings(patientId, conditions || []);
        const insight = await generatePatientInsight(
          patientId,
          demoReadings,
          conditions || ["Type 2 Diabetes", "Hypertension"],
          medications || ["Metformin 1000mg", "Amlodipine 5mg"],
        );

        return NextResponse.json({
          success: true,
          data: insight,
        });
      }

      case "recommend_monitoring": {
        const { conditions } = body;
        
        if (!conditions || !Array.isArray(conditions)) {
          return NextResponse.json({ error: "conditions array required" }, { status: 400 });
        }

        const recommendation = getRecommendedMonitoring(conditions);

        return NextResponse.json({
          success: true,
          data: {
            ...recommendation,
            deviceDetails: recommendation.recommendedDevices.map(d => ({
              type: d,
              ...SUPPORTED_DEVICES[d],
            })),
          },
        });
      }

      case "simulate": {
        const { patientId, scenario } = body;
        
        const simulation = generateSimulation(patientId || "demo-patient", scenario || "normal");

        return NextResponse.json({
          success: true,
          data: simulation,
        });
      }

      default:
        return NextResponse.json({
          error: "Invalid action",
          validActions: ["process_reading", "patient_insight", "recommend_monitoring", "simulate"],
        }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function generateDemoReadings(patientId: string, conditions: string[]) {
  const readings = [];
  const hasGlucose = conditions.some(c => c.toLowerCase().includes("diabetes"));
  
  for (let i = 0; i < 48; i++) {
    const metrics: Record<string, number> = {
      heart_rate: 65 + Math.round(Math.random() * 20),
      spo2: 95 + Math.round(Math.random() * 4),
      systolic_bp: 120 + Math.round(Math.random() * 30),
      diastolic_bp: 70 + Math.round(Math.random() * 15),
      respiratory_rate: 14 + Math.round(Math.random() * 4),
      steps: Math.round(Math.random() * 500),
    };
    
    if (hasGlucose) {
      metrics.glucose = 100 + Math.round(Math.random() * 80);
    }
    
    readings.push({
      deviceId: "demo-device",
      deviceType: "apple_watch" as const,
      patientId,
      timestamp: new Date(Date.now() - i * 1800000).toISOString(),
      metrics,
    });
  }
  
  return readings;
}

function generateSimulation(patientId: string, scenario: string) {
  const scenarios: Record<string, { description: string; readings: Record<string, number>[]; alerts: string[] }> = {
    normal: {
      description: "Normal patient — all vitals within range",
      readings: [
        { heart_rate: 72, spo2: 97, systolic_bp: 125, diastolic_bp: 78, glucose: 110 },
        { heart_rate: 68, spo2: 98, systolic_bp: 122, diastolic_bp: 76, glucose: 105 },
      ],
      alerts: [],
    },
    deteriorating: {
      description: "Patient deteriorating — early sepsis pattern",
      readings: [
        { heart_rate: 88, spo2: 95, systolic_bp: 110, diastolic_bp: 68, temperature: 37.8 },
        { heart_rate: 102, spo2: 93, systolic_bp: 95, diastolic_bp: 58, temperature: 38.5 },
        { heart_rate: 118, spo2: 90, systolic_bp: 85, diastolic_bp: 50, temperature: 39.2 },
      ],
      alerts: ["Tachycardia trend detected", "SpO2 declining", "Hypotension developing", "SEPSIS ALERT: qSOFA ≥ 2"],
    },
    hypoglycemia: {
      description: "Diabetic patient — nocturnal hypoglycemia",
      readings: [
        { heart_rate: 75, glucose: 95, spo2: 97 },
        { heart_rate: 80, glucose: 78, spo2: 97 },
        { heart_rate: 88, glucose: 62, spo2: 96 },
        { heart_rate: 95, glucose: 48, spo2: 96 },
      ],
      alerts: ["Glucose declining rapidly", "CRITICAL: Glucose 48 mg/dL — hypoglycemia alert sent to patient and family"],
    },
    cardiac_event: {
      description: "Patient with AF — rapid ventricular response",
      readings: [
        { heart_rate: 82, spo2: 96, systolic_bp: 135 },
        { heart_rate: 110, spo2: 95, systolic_bp: 128 },
        { heart_rate: 145, spo2: 93, systolic_bp: 105 },
        { heart_rate: 162, spo2: 91, systolic_bp: 90 },
      ],
      alerts: ["Heart rate rising rapidly", "Irregular rhythm detected", "CRITICAL: HR 162 + hypotension — immediate intervention needed"],
    },
  };
  
  const sim = scenarios[scenario] || scenarios.normal;
  
  return {
    patientId,
    scenario,
    description: sim.description,
    timeline: sim.readings.map((r, i) => ({
      time: `T+${i * 30} min`,
      metrics: r,
    })),
    alertsTriggered: sim.alerts,
    aiRecommendation: scenario === "deteriorating" 
      ? "Pattern consistent with early sepsis. Recommend: Blood cultures, Lactate, Broad-spectrum antibiotics within 1 hour (Surviving Sepsis Campaign)."
      : scenario === "hypoglycemia"
        ? "Nocturnal hypoglycemia pattern. Recommend: Reduce basal insulin by 20%, add bedtime snack, set CGM alarm at 80 mg/dL."
        : scenario === "cardiac_event"
          ? "AF with RVR and hemodynamic instability. Recommend: IV Amiodarone or synchronized cardioversion if unstable."
          : "All vitals within normal limits. Continue routine monitoring.",
  };
}
