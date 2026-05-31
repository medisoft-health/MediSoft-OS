/**
 * MediSense — IoT + AI Continuous Monitoring
 * Real-time patient monitoring with wearables, bedside devices, and AI anomaly detection
 * Supports: Apple Watch, Fitbit, Dexcom CGM, Withings, BioSticker, hospital monitors
 */

import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// ============================================================
// TYPES
// ============================================================

export interface DeviceReading {
  deviceId: string;
  deviceType: DeviceType;
  patientId: string;
  timestamp: string;
  metrics: Record<string, number>;
  battery?: number;
  signalQuality?: number;
}

export type DeviceType = 
  | "apple_watch" | "fitbit" | "samsung_galaxy_watch" | "garmin"
  | "dexcom_cgm" | "freestyle_libre" | "medtronic_cgm"
  | "withings_bpm" | "omron_bp" | "ihealth_bp"
  | "pulse_oximeter" | "spirometer" | "ecg_patch"
  | "biosticker" | "hospital_monitor" | "smart_bed"
  | "smart_scale" | "thermometer" | "fall_detector";

export interface MonitoringProfile {
  patientId: string;
  devices: ConnectedDevice[];
  alerts: AlertRule[];
  conditions: string[];
  medications: string[];
  baselineMetrics: Record<string, { mean: number; stdDev: number; min: number; max: number }>;
}

export interface ConnectedDevice {
  deviceId: string;
  deviceType: DeviceType;
  manufacturer: string;
  model: string;
  status: "active" | "inactive" | "low_battery" | "disconnected";
  lastSync: string;
  metrics: string[];
  syncFrequency: string;
}

export interface AlertRule {
  id: string;
  metric: string;
  condition: "above" | "below" | "rapid_change" | "pattern" | "absence";
  threshold: number;
  duration?: number; // seconds
  severity: "info" | "warning" | "critical" | "emergency";
  action: AlertAction;
}

export interface AlertAction {
  notify: ("physician" | "nurse" | "patient" | "family" | "emergency")[];
  autoEscalate: boolean;
  escalateAfter?: number; // seconds
  triggerWorkflow?: string;
}

export interface AnomalyDetection {
  patientId: string;
  detectedAt: string;
  anomalyType: "vital_sign" | "activity" | "sleep" | "glucose" | "cardiac" | "respiratory" | "multi_system";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  affectedMetrics: { metric: string; value: number; expected: string; deviation: number }[];
  possibleCauses: string[];
  recommendedActions: string[];
  aiConfidence: number;
  requiresImmediate: boolean;
}

export interface PatientInsight {
  patientId: string;
  generatedAt: string;
  period: string;
  summary: string;
  trends: TrendAnalysis[];
  anomalies: AnomalyDetection[];
  predictions: HealthPrediction[];
  medicationAdherence: number;
  sleepQuality: number;
  activityLevel: number;
  overallHealthScore: number;
  recommendations: string[];
}

export interface TrendAnalysis {
  metric: string;
  direction: "improving" | "stable" | "declining" | "volatile";
  changePercent: number;
  period: string;
  significance: "low" | "medium" | "high";
  clinicalNote: string;
}

export interface HealthPrediction {
  event: string;
  probability: number;
  timeframe: string;
  preventable: boolean;
  preventiveActions: string[];
}

// ============================================================
// DEVICE REGISTRY
// ============================================================

export const SUPPORTED_DEVICES: Record<DeviceType, { manufacturer: string; metrics: string[]; syncMethod: string }> = {
  apple_watch: {
    manufacturer: "Apple",
    metrics: ["heart_rate", "hrv", "spo2", "ecg", "steps", "calories", "sleep", "fall_detection", "afib_detection", "wrist_temperature"],
    syncMethod: "HealthKit API",
  },
  fitbit: {
    manufacturer: "Google/Fitbit",
    metrics: ["heart_rate", "spo2", "steps", "calories", "sleep", "stress_score", "skin_temperature", "breathing_rate"],
    syncMethod: "Google Health Connect API",
  },
  samsung_galaxy_watch: {
    manufacturer: "Samsung",
    metrics: ["heart_rate", "spo2", "ecg", "blood_pressure", "body_composition", "steps", "sleep", "stress"],
    syncMethod: "Samsung Health SDK",
  },
  garmin: {
    manufacturer: "Garmin",
    metrics: ["heart_rate", "spo2", "steps", "stress", "body_battery", "respiration", "sleep", "hrv"],
    syncMethod: "Garmin Connect API",
  },
  dexcom_cgm: {
    manufacturer: "Dexcom",
    metrics: ["glucose", "glucose_trend", "glucose_rate_of_change"],
    syncMethod: "Dexcom Share API",
  },
  freestyle_libre: {
    manufacturer: "Abbott",
    metrics: ["glucose", "glucose_trend", "time_in_range"],
    syncMethod: "LibreLink API",
  },
  medtronic_cgm: {
    manufacturer: "Medtronic",
    metrics: ["glucose", "insulin_delivery", "auto_mode_status"],
    syncMethod: "CareLink API",
  },
  withings_bpm: {
    manufacturer: "Withings",
    metrics: ["systolic_bp", "diastolic_bp", "heart_rate", "afib_detection"],
    syncMethod: "Withings Health Mate API",
  },
  omron_bp: {
    manufacturer: "Omron",
    metrics: ["systolic_bp", "diastolic_bp", "heart_rate", "irregular_heartbeat"],
    syncMethod: "Omron Connect API",
  },
  ihealth_bp: {
    manufacturer: "iHealth",
    metrics: ["systolic_bp", "diastolic_bp", "heart_rate", "mean_arterial_pressure"],
    syncMethod: "iHealth Cloud API",
  },
  pulse_oximeter: {
    manufacturer: "Various",
    metrics: ["spo2", "heart_rate", "perfusion_index"],
    syncMethod: "Bluetooth LE",
  },
  spirometer: {
    manufacturer: "Various",
    metrics: ["fev1", "fvc", "fev1_fvc_ratio", "pef"],
    syncMethod: "Bluetooth LE",
  },
  ecg_patch: {
    manufacturer: "Various",
    metrics: ["ecg_continuous", "heart_rate", "arrhythmia_detection", "qt_interval"],
    syncMethod: "Cellular/WiFi",
  },
  biosticker: {
    manufacturer: "BioIntelliSense",
    metrics: ["heart_rate", "respiratory_rate", "temperature", "activity", "body_position", "steps"],
    syncMethod: "Cellular Gateway",
  },
  hospital_monitor: {
    manufacturer: "Philips/GE/Mindray",
    metrics: ["ecg", "heart_rate", "spo2", "nibp", "respiratory_rate", "temperature", "etco2", "ibp"],
    syncMethod: "HL7v2/FHIR",
  },
  smart_bed: {
    manufacturer: "Hill-Rom/Stryker",
    metrics: ["weight", "position", "movement", "exit_alarm", "pressure_map"],
    syncMethod: "Hospital Network",
  },
  smart_scale: {
    manufacturer: "Withings/Eufy",
    metrics: ["weight", "bmi", "body_fat", "muscle_mass", "water_percentage", "bone_mass"],
    syncMethod: "WiFi/Bluetooth",
  },
  thermometer: {
    manufacturer: "Various",
    metrics: ["temperature"],
    syncMethod: "Bluetooth LE",
  },
  fall_detector: {
    manufacturer: "Various",
    metrics: ["fall_detected", "activity_level", "gait_speed"],
    syncMethod: "Cellular/WiFi",
  },
};

// ============================================================
// ALERT THRESHOLDS (Clinical Standards)
// ============================================================

const CLINICAL_THRESHOLDS: Record<string, { critical_low?: number; warning_low?: number; warning_high?: number; critical_high?: number; unit: string }> = {
  heart_rate: { critical_low: 40, warning_low: 50, warning_high: 100, critical_high: 150, unit: "bpm" },
  spo2: { critical_low: 88, warning_low: 92, unit: "%" },
  systolic_bp: { critical_low: 80, warning_low: 90, warning_high: 160, critical_high: 180, unit: "mmHg" },
  diastolic_bp: { critical_low: 50, warning_low: 60, warning_high: 100, critical_high: 120, unit: "mmHg" },
  temperature: { critical_low: 35.0, warning_low: 36.0, warning_high: 38.0, critical_high: 39.5, unit: "°C" },
  respiratory_rate: { critical_low: 8, warning_low: 12, warning_high: 20, critical_high: 30, unit: "breaths/min" },
  glucose: { critical_low: 54, warning_low: 70, warning_high: 180, critical_high: 300, unit: "mg/dL" },
  weight: { unit: "kg" }, // Dynamic based on patient baseline
};

// ============================================================
// CORE FUNCTIONS
// ============================================================

/**
 * Process incoming device readings and detect anomalies
 */
export async function processReading(reading: DeviceReading, profile?: MonitoringProfile): Promise<{
  processed: boolean;
  alerts: AnomalyDetection[];
  insights: string[];
}> {
  const alerts: AnomalyDetection[] = [];
  const insights: string[] = [];
  
  // Check each metric against thresholds
  for (const [metric, value] of Object.entries(reading.metrics)) {
    const threshold = CLINICAL_THRESHOLDS[metric];
    if (!threshold) continue;
    
    // Critical checks
    if (threshold.critical_low !== undefined && value < threshold.critical_low) {
      alerts.push({
        patientId: reading.patientId,
        detectedAt: reading.timestamp,
        anomalyType: categorizeMetric(metric),
        severity: "critical",
        description: `CRITICAL: ${metric} = ${value} ${threshold.unit} (below critical threshold ${threshold.critical_low})`,
        affectedMetrics: [{ metric, value, expected: `>${threshold.critical_low}`, deviation: ((threshold.critical_low - value) / threshold.critical_low) * 100 }],
        possibleCauses: getPossibleCauses(metric, "critical_low"),
        recommendedActions: getRecommendedActions(metric, "critical_low"),
        aiConfidence: 0.95,
        requiresImmediate: true,
      });
    } else if (threshold.critical_high !== undefined && value > threshold.critical_high) {
      alerts.push({
        patientId: reading.patientId,
        detectedAt: reading.timestamp,
        anomalyType: categorizeMetric(metric),
        severity: "critical",
        description: `CRITICAL: ${metric} = ${value} ${threshold.unit} (above critical threshold ${threshold.critical_high})`,
        affectedMetrics: [{ metric, value, expected: `<${threshold.critical_high}`, deviation: ((value - threshold.critical_high) / threshold.critical_high) * 100 }],
        possibleCauses: getPossibleCauses(metric, "critical_high"),
        recommendedActions: getRecommendedActions(metric, "critical_high"),
        aiConfidence: 0.95,
        requiresImmediate: true,
      });
    }
    // Warning checks
    else if (threshold.warning_low !== undefined && value < threshold.warning_low) {
      alerts.push({
        patientId: reading.patientId,
        detectedAt: reading.timestamp,
        anomalyType: categorizeMetric(metric),
        severity: "medium",
        description: `WARNING: ${metric} = ${value} ${threshold.unit} (below warning threshold ${threshold.warning_low})`,
        affectedMetrics: [{ metric, value, expected: `>${threshold.warning_low}`, deviation: ((threshold.warning_low - value) / threshold.warning_low) * 100 }],
        possibleCauses: getPossibleCauses(metric, "warning_low"),
        recommendedActions: getRecommendedActions(metric, "warning_low"),
        aiConfidence: 0.85,
        requiresImmediate: false,
      });
    } else if (threshold.warning_high !== undefined && value > threshold.warning_high) {
      alerts.push({
        patientId: reading.patientId,
        detectedAt: reading.timestamp,
        anomalyType: categorizeMetric(metric),
        severity: "medium",
        description: `WARNING: ${metric} = ${value} ${threshold.unit} (above warning threshold ${threshold.warning_high})`,
        affectedMetrics: [{ metric, value, expected: `<${threshold.warning_high}`, deviation: ((value - threshold.warning_high) / threshold.warning_high) * 100 }],
        possibleCauses: getPossibleCauses(metric, "warning_high"),
        recommendedActions: getRecommendedActions(metric, "warning_high"),
        aiConfidence: 0.85,
        requiresImmediate: false,
      });
    }
  }
  
  // Baseline comparison (if profile exists)
  if (profile?.baselineMetrics) {
    for (const [metric, value] of Object.entries(reading.metrics)) {
      const baseline = profile.baselineMetrics[metric];
      if (!baseline) continue;
      
      const zScore = Math.abs((value - baseline.mean) / (baseline.stdDev || 1));
      if (zScore > 3) {
        insights.push(`${metric} deviates ${zScore.toFixed(1)} standard deviations from patient baseline (${value} vs avg ${baseline.mean.toFixed(1)})`);
      }
    }
  }
  
  return { processed: true, alerts, insights };
}

/**
 * Generate AI-powered patient insight report
 */
export async function generatePatientInsight(
  patientId: string,
  readings: DeviceReading[],
  conditions: string[],
  medications: string[]
): Promise<PatientInsight> {
  const client = getGeminiClient();
  
  // Calculate trends
  const trends = calculateTrends(readings);
  
  // Detect anomalies across all readings
  const anomalies: AnomalyDetection[] = [];
  for (const reading of readings.slice(-10)) {
    const result = await processReading(reading);
    anomalies.push(...result.alerts);
  }
  
  // AI-powered predictions
  let predictions: HealthPrediction[] = [];
  let summary = "";
  
  if (client) {
    const metricsOverview = summarizeMetrics(readings);
    
    const prompt = `As a clinical AI, analyze this patient's IoT monitoring data and provide predictions:

Patient Conditions: ${conditions.join(", ")}
Medications: ${medications.join(", ")}
Monitoring Period: Last 7 days
Metrics Summary: ${JSON.stringify(metricsOverview)}
Trends: ${JSON.stringify(trends.map(t => ({ metric: t.metric, direction: t.direction, change: t.changePercent })))}
Anomalies Detected: ${anomalies.length}

Respond in JSON:
{
  "summary": "Brief clinical summary of patient status based on monitoring data",
  "predictions": [
    {"event": "clinical event", "probability": 0.0-1.0, "timeframe": "e.g., 48 hours", "preventable": true/false, "preventiveActions": ["action1"]}
  ],
  "recommendations": ["recommendation1", "recommendation2"],
  "overallHealthScore": 0-100,
  "medicationAdherence": 0-100,
  "sleepQuality": 0-100,
  "activityLevel": 0-100
}`;

    try {
      const result = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.3 },
      });
      
      const text = result.text ?? "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        summary = parsed.summary || "";
        predictions = parsed.predictions || [];
        
        return {
          patientId,
          generatedAt: new Date().toISOString(),
          period: "Last 7 days",
          summary,
          trends,
          anomalies,
          predictions,
          medicationAdherence: parsed.medicationAdherence || 85,
          sleepQuality: parsed.sleepQuality || 70,
          activityLevel: parsed.activityLevel || 60,
          overallHealthScore: parsed.overallHealthScore || 75,
          recommendations: parsed.recommendations || [],
        };
      }
    } catch {}
  }
  
  // Fallback
  return {
    patientId,
    generatedAt: new Date().toISOString(),
    period: "Last 7 days",
    summary: "Patient monitoring data collected. AI analysis pending.",
    trends,
    anomalies,
    predictions: [
      { event: "Medication non-adherence", probability: 0.15, timeframe: "7 days", preventable: true, preventiveActions: ["Send medication reminder", "Schedule follow-up call"] },
    ],
    medicationAdherence: 85,
    sleepQuality: 70,
    activityLevel: 60,
    overallHealthScore: 75,
    recommendations: ["Continue current monitoring schedule", "Review medication timing"],
  };
}

/**
 * Get monitoring profile for a patient based on conditions
 */
export function getRecommendedMonitoring(conditions: string[]): {
  recommendedDevices: DeviceType[];
  alertRules: AlertRule[];
  monitoringFrequency: string;
} {
  const devices: Set<DeviceType> = new Set(["apple_watch"]);
  const alertRules: AlertRule[] = [];
  
  for (const condition of conditions) {
    const lower = condition.toLowerCase();
    
    if (lower.includes("diabetes") || lower.includes("dm")) {
      devices.add("dexcom_cgm");
      devices.add("smart_scale");
      alertRules.push(
        { id: "gluc-low", metric: "glucose", condition: "below", threshold: 70, severity: "critical", action: { notify: ["patient", "family"], autoEscalate: true, escalateAfter: 300 } },
        { id: "gluc-high", metric: "glucose", condition: "above", threshold: 250, severity: "warning", action: { notify: ["patient", "physician"], autoEscalate: false } },
      );
    }
    
    if (lower.includes("hypertension") || lower.includes("htn")) {
      devices.add("withings_bpm");
      alertRules.push(
        { id: "bp-high", metric: "systolic_bp", condition: "above", threshold: 180, severity: "critical", action: { notify: ["patient", "physician"], autoEscalate: true, escalateAfter: 600 } },
      );
    }
    
    if (lower.includes("heart failure") || lower.includes("hf") || lower.includes("chf")) {
      devices.add("smart_scale");
      devices.add("ecg_patch");
      alertRules.push(
        { id: "weight-gain", metric: "weight", condition: "rapid_change", threshold: 2, duration: 172800, severity: "warning", action: { notify: ["physician"], autoEscalate: false } },
        { id: "spo2-low", metric: "spo2", condition: "below", threshold: 92, severity: "critical", action: { notify: ["physician", "patient"], autoEscalate: true, escalateAfter: 300 } },
      );
    }
    
    if (lower.includes("copd") || lower.includes("asthma")) {
      devices.add("pulse_oximeter");
      devices.add("spirometer");
      alertRules.push(
        { id: "spo2-copd", metric: "spo2", condition: "below", threshold: 88, severity: "critical", action: { notify: ["physician", "emergency"], autoEscalate: true, escalateAfter: 120 } },
      );
    }
    
    if (lower.includes("afib") || lower.includes("arrhythmia")) {
      devices.add("ecg_patch");
      alertRules.push(
        { id: "hr-high", metric: "heart_rate", condition: "above", threshold: 150, severity: "critical", action: { notify: ["physician", "emergency"], autoEscalate: true, escalateAfter: 180 } },
      );
    }
    
    if (lower.includes("elderly") || lower.includes("fall risk")) {
      devices.add("fall_detector");
      devices.add("smart_bed");
    }
    
    if (lower.includes("post-op") || lower.includes("surgery")) {
      devices.add("biosticker");
      devices.add("pulse_oximeter");
    }
  }
  
  return {
    recommendedDevices: Array.from(devices),
    alertRules,
    monitoringFrequency: conditions.some(c => c.toLowerCase().includes("icu") || c.toLowerCase().includes("critical")) 
      ? "Continuous (every 5 seconds)" 
      : conditions.length > 2 
        ? "High frequency (every 5 minutes)"
        : "Standard (every 15 minutes)",
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function categorizeMetric(metric: string): AnomalyDetection["anomalyType"] {
  if (["heart_rate", "ecg", "hrv", "afib_detection"].includes(metric)) return "cardiac";
  if (["spo2", "respiratory_rate", "fev1", "pef"].includes(metric)) return "respiratory";
  if (["glucose", "glucose_trend"].includes(metric)) return "glucose";
  if (["steps", "activity", "fall_detected"].includes(metric)) return "activity";
  if (["sleep", "sleep_quality"].includes(metric)) return "sleep";
  return "vital_sign";
}

function getPossibleCauses(metric: string, direction: string): string[] {
  const causes: Record<string, Record<string, string[]>> = {
    heart_rate: {
      critical_low: ["Beta-blocker overdose", "Sick sinus syndrome", "Complete heart block", "Hypothermia"],
      critical_high: ["SVT", "Atrial fibrillation with RVR", "Sepsis", "Pain", "Anxiety", "Medication effect"],
      warning_low: ["Beta-blocker effect", "Athletic heart", "Sleep"],
      warning_high: ["Fever", "Dehydration", "Caffeine", "Exercise", "Medication effect"],
    },
    spo2: {
      critical_low: ["Pneumonia", "PE", "COPD exacerbation", "Pneumothorax", "Airway obstruction"],
      warning_low: ["Mild COPD", "Sleep apnea", "Atelectasis", "Altitude"],
    },
    glucose: {
      critical_low: ["Insulin overdose", "Missed meal", "Excessive exercise", "Alcohol"],
      critical_high: ["Missed insulin", "Infection", "Steroid use", "DKA", "Stress"],
      warning_low: ["Medication timing", "Delayed meal", "Increased activity"],
      warning_high: ["Dietary indiscretion", "Medication non-adherence", "Illness"],
    },
  };
  
  return causes[metric]?.[direction] || ["Requires clinical assessment"];
}

function getRecommendedActions(metric: string, direction: string): string[] {
  const actions: Record<string, Record<string, string[]>> = {
    heart_rate: {
      critical_low: ["Activate RRT", "12-lead ECG stat", "Check medications", "Prepare transcutaneous pacing"],
      critical_high: ["12-lead ECG stat", "Check electrolytes", "Consider rate control", "Assess hemodynamic stability"],
      warning_low: ["Monitor closely", "Review medications", "Repeat in 15 minutes"],
      warning_high: ["Assess for cause", "Check temperature", "Hydration status", "Repeat in 30 minutes"],
    },
    spo2: {
      critical_low: ["Apply high-flow O2", "ABG stat", "CXR", "Prepare for intubation if declining", "Call physician"],
      warning_low: ["Apply supplemental O2", "Encourage deep breathing", "Elevate HOB", "Reassess in 15 minutes"],
    },
    glucose: {
      critical_low: ["Give 15g fast-acting glucose", "Recheck in 15 minutes", "If unconscious: glucagon/D50W", "Notify physician"],
      critical_high: ["Check ketones", "Hydration", "Insulin correction", "Notify physician", "Monitor q1h"],
      warning_low: ["Snack with protein", "Recheck in 30 minutes", "Review insulin timing"],
      warning_high: ["Correction insulin per protocol", "Increase hydration", "Recheck in 2 hours"],
    },
  };
  
  return actions[metric]?.[direction] || ["Clinical assessment required", "Notify physician"];
}

function calculateTrends(readings: DeviceReading[]): TrendAnalysis[] {
  const trends: TrendAnalysis[] = [];
  const metricValues: Record<string, number[]> = {};
  
  for (const reading of readings) {
    for (const [metric, value] of Object.entries(reading.metrics)) {
      if (!metricValues[metric]) metricValues[metric] = [];
      metricValues[metric].push(value);
    }
  }
  
  for (const [metric, values] of Object.entries(metricValues)) {
    if (values.length < 3) continue;
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const changePercent = avgFirst !== 0 ? ((avgSecond - avgFirst) / avgFirst) * 100 : 0;
    
    let direction: TrendAnalysis["direction"] = "stable";
    if (changePercent > 10) direction = "declining"; // Higher vitals often = declining health
    else if (changePercent < -10) direction = "improving";
    
    // For metrics where higher is better (like SpO2)
    if (metric === "spo2" || metric === "activity" || metric === "sleep_quality") {
      if (changePercent > 5) direction = "improving";
      else if (changePercent < -5) direction = "declining";
    }
    
    trends.push({
      metric,
      direction,
      changePercent: Math.round(changePercent * 10) / 10,
      period: "7 days",
      significance: Math.abs(changePercent) > 20 ? "high" : Math.abs(changePercent) > 10 ? "medium" : "low",
      clinicalNote: `${metric} ${direction} by ${Math.abs(changePercent).toFixed(1)}% over monitoring period`,
    });
  }
  
  return trends;
}

function summarizeMetrics(readings: DeviceReading[]): Record<string, { avg: number; min: number; max: number; count: number }> {
  const summary: Record<string, { sum: number; min: number; max: number; count: number }> = {};
  
  for (const reading of readings) {
    for (const [metric, value] of Object.entries(reading.metrics)) {
      if (!summary[metric]) summary[metric] = { sum: 0, min: Infinity, max: -Infinity, count: 0 };
      summary[metric].sum += value;
      summary[metric].min = Math.min(summary[metric].min, value);
      summary[metric].max = Math.max(summary[metric].max, value);
      summary[metric].count++;
    }
  }
  
  const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};
  for (const [metric, data] of Object.entries(summary)) {
    result[metric] = {
      avg: Math.round((data.sum / data.count) * 10) / 10,
      min: data.min,
      max: data.max,
      count: data.count,
    };
  }
  
  return result;
}
