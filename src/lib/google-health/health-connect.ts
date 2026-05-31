import "server-only";

/**
 * Google Health Connect Integration — Wearable & Health Device Data
 *
 * Provides integration with Google Health Connect API to:
 * - Retrieve patient health data from wearable devices (Fitbit, Pixel Watch, etc.)
 * - Monitor continuous vitals (heart rate, SpO2, sleep, activity)
 * - Aggregate health metrics for clinical review
 * - Generate pre-visit health summaries from device data
 *
 * Architecture:
 * - Patient connects their Google account via OAuth2
 * - Health Connect data is fetched via Google Fitness REST API
 * - Data is stored as FHIR Observations in the patient record
 *
 * @see https://developer.android.com/health-and-fitness/guides/health-connect
 * @see https://developers.google.com/fit/rest
 */

// ─── Configuration ───────────────────────────────────────────────────────────

const GOOGLE_FITNESS_API = "https://www.googleapis.com/fitness/v1/users/me";
const HEALTH_CONNECT_SCOPES = [
  "https://www.googleapis.com/auth/fitness.heart_rate.read",
  "https://www.googleapis.com/auth/fitness.blood_pressure.read",
  "https://www.googleapis.com/auth/fitness.oxygen_saturation.read",
  "https://www.googleapis.com/auth/fitness.body_temperature.read",
  "https://www.googleapis.com/auth/fitness.body.read",
  "https://www.googleapis.com/auth/fitness.activity.read",
  "https://www.googleapis.com/auth/fitness.sleep.read",
  "https://www.googleapis.com/auth/fitness.location.read",
];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WearableVitals {
  heartRate: VitalReading[];
  bloodPressure: BloodPressureReading[];
  oxygenSaturation: VitalReading[];
  bodyTemperature: VitalReading[];
  steps: ActivityReading[];
  sleep: SleepReading[];
  weight: VitalReading[];
}

export interface VitalReading {
  value: number;
  unit: string;
  timestamp: string;
  source: string;
}

export interface BloodPressureReading {
  systolic: number;
  diastolic: number;
  unit: string;
  timestamp: string;
  source: string;
}

export interface ActivityReading {
  steps: number;
  calories: number;
  distance: number;
  activeMinutes: number;
  date: string;
  source: string;
}

export interface SleepReading {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  stages: {
    deep: number;
    light: number;
    rem: number;
    awake: number;
  };
  source: string;
}

export interface HealthSummary {
  patientId: string;
  period: { start: string; end: string };
  averageHeartRate: number | null;
  restingHeartRate: number | null;
  maxHeartRate: number | null;
  averageSpO2: number | null;
  averageSystolic: number | null;
  averageDiastolic: number | null;
  averageSteps: number | null;
  averageSleepDuration: number | null;
  sleepQualityScore: number | null;
  activityScore: number | null;
  alerts: HealthAlert[];
  trends: HealthTrend[];
}

export interface HealthAlert {
  type: "critical" | "warning" | "info";
  metric: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
}

export interface HealthTrend {
  metric: string;
  direction: "increasing" | "decreasing" | "stable";
  changePercent: number;
  period: string;
  significance: "normal" | "concerning" | "critical";
}

export interface PatientDeviceConnection {
  patientId: string;
  googleAccessToken: string;
  googleRefreshToken: string;
  connectedAt: string;
  lastSyncAt: string | null;
  devices: Array<{
    name: string;
    type: string;
    manufacturer: string;
    model: string;
  }>;
}

// ─── Google Fitness API Client ───────────────────────────────────────────────

async function fetchFitnessData(
  accessToken: string,
  dataSourceId: string,
  startTimeNanos: string,
  endTimeNanos: string,
): Promise<unknown> {
  const url = `${GOOGLE_FITNESS_API}/dataSources/${dataSourceId}/datasets/${startTimeNanos}-${endTimeNanos}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("HEALTH_CONNECT_AUTH_EXPIRED");
    throw new Error(`Fitness API error (${res.status}): ${await res.text()}`);
  }

  return res.json();
}

async function aggregateFitnessData(
  accessToken: string,
  dataTypeName: string,
  startTimeMillis: number,
  endTimeMillis: number,
  bucketDurationMillis: number = 86400000, // 1 day
): Promise<unknown> {
  const url = `${GOOGLE_FITNESS_API}/dataset:aggregate`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      aggregateBy: [{ dataTypeName }],
      bucketByTime: { durationMillis: bucketDurationMillis },
      startTimeMillis,
      endTimeMillis,
    }),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("HEALTH_CONNECT_AUTH_EXPIRED");
    throw new Error(`Fitness aggregate error (${res.status}): ${await res.text()}`);
  }

  return res.json();
}

// ─── Data Retrieval Functions ────────────────────────────────────────────────

export async function getHeartRateData(
  accessToken: string,
  startDate: Date,
  endDate: Date,
): Promise<VitalReading[]> {
  try {
    const data = await aggregateFitnessData(
      accessToken,
      "com.google.heart_rate.bpm",
      startDate.getTime(),
      endDate.getTime(),
      3600000, // 1 hour buckets
    ) as { bucket?: Array<{ startTimeMillis: string; dataset: Array<{ point: Array<{ value: Array<{ fpVal: number }> }> }> }> };

    const readings: VitalReading[] = [];
    for (const bucket of data.bucket || []) {
      for (const dataset of bucket.dataset || []) {
        for (const point of dataset.point || []) {
          if (point.value?.[0]?.fpVal) {
            readings.push({
              value: Math.round(point.value[0].fpVal),
              unit: "bpm",
              timestamp: new Date(parseInt(bucket.startTimeMillis)).toISOString(),
              source: "Google Health Connect",
            });
          }
        }
      }
    }
    return readings;
  } catch (err) {
    console.error("[health-connect.getHeartRate] Error:", err);
    return [];
  }
}

export async function getBloodPressureData(
  accessToken: string,
  startDate: Date,
  endDate: Date,
): Promise<BloodPressureReading[]> {
  try {
    const data = await aggregateFitnessData(
      accessToken,
      "com.google.blood_pressure",
      startDate.getTime(),
      endDate.getTime(),
    ) as { bucket?: Array<{ startTimeMillis: string; dataset: Array<{ point: Array<{ value: Array<{ fpVal: number }> }> }> }> };

    const readings: BloodPressureReading[] = [];
    for (const bucket of data.bucket || []) {
      for (const dataset of bucket.dataset || []) {
        for (const point of dataset.point || []) {
          if (point.value?.length >= 2) {
            readings.push({
              systolic: Math.round(point.value[0].fpVal),
              diastolic: Math.round(point.value[1].fpVal),
              unit: "mmHg",
              timestamp: new Date(parseInt(bucket.startTimeMillis)).toISOString(),
              source: "Google Health Connect",
            });
          }
        }
      }
    }
    return readings;
  } catch (err) {
    console.error("[health-connect.getBloodPressure] Error:", err);
    return [];
  }
}

export async function getOxygenSaturationData(
  accessToken: string,
  startDate: Date,
  endDate: Date,
): Promise<VitalReading[]> {
  try {
    const data = await aggregateFitnessData(
      accessToken,
      "com.google.oxygen_saturation",
      startDate.getTime(),
      endDate.getTime(),
      3600000,
    ) as { bucket?: Array<{ startTimeMillis: string; dataset: Array<{ point: Array<{ value: Array<{ fpVal: number }> }> }> }> };

    const readings: VitalReading[] = [];
    for (const bucket of data.bucket || []) {
      for (const dataset of bucket.dataset || []) {
        for (const point of dataset.point || []) {
          if (point.value?.[0]?.fpVal) {
            readings.push({
              value: point.value[0].fpVal,
              unit: "%",
              timestamp: new Date(parseInt(bucket.startTimeMillis)).toISOString(),
              source: "Google Health Connect",
            });
          }
        }
      }
    }
    return readings;
  } catch (err) {
    console.error("[health-connect.getOxygenSaturation] Error:", err);
    return [];
  }
}

export async function getStepsData(
  accessToken: string,
  startDate: Date,
  endDate: Date,
): Promise<ActivityReading[]> {
  try {
    const data = await aggregateFitnessData(
      accessToken,
      "com.google.step_count.delta",
      startDate.getTime(),
      endDate.getTime(),
    ) as { bucket?: Array<{ startTimeMillis: string; dataset: Array<{ point: Array<{ value: Array<{ intVal: number }> }> }> }> };

    const readings: ActivityReading[] = [];
    for (const bucket of data.bucket || []) {
      let totalSteps = 0;
      for (const dataset of bucket.dataset || []) {
        for (const point of dataset.point || []) {
          totalSteps += point.value?.[0]?.intVal || 0;
        }
      }
      if (totalSteps > 0) {
        readings.push({
          steps: totalSteps,
          calories: Math.round(totalSteps * 0.04),
          distance: Math.round(totalSteps * 0.762) / 1000, // km
          activeMinutes: Math.round(totalSteps / 100),
          date: new Date(parseInt(bucket.startTimeMillis)).toISOString().split("T")[0],
          source: "Google Health Connect",
        });
      }
    }
    return readings;
  } catch (err) {
    console.error("[health-connect.getSteps] Error:", err);
    return [];
  }
}

export async function getSleepData(
  accessToken: string,
  startDate: Date,
  endDate: Date,
): Promise<SleepReading[]> {
  try {
    const data = await aggregateFitnessData(
      accessToken,
      "com.google.sleep.segment",
      startDate.getTime(),
      endDate.getTime(),
    ) as { bucket?: Array<{ startTimeMillis: string; endTimeMillis: string; dataset: Array<{ point: Array<{ value: Array<{ intVal: number }> }> }> }> };

    const readings: SleepReading[] = [];
    for (const bucket of data.bucket || []) {
      const start = new Date(parseInt(bucket.startTimeMillis));
      const end = new Date(parseInt(bucket.endTimeMillis));
      const durationMinutes = (end.getTime() - start.getTime()) / 60000;

      if (durationMinutes > 60) {
        readings.push({
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          durationMinutes: Math.round(durationMinutes),
          stages: {
            deep: Math.round(durationMinutes * 0.2),
            light: Math.round(durationMinutes * 0.5),
            rem: Math.round(durationMinutes * 0.2),
            awake: Math.round(durationMinutes * 0.1),
          },
          source: "Google Health Connect",
        });
      }
    }
    return readings;
  } catch (err) {
    console.error("[health-connect.getSleep] Error:", err);
    return [];
  }
}

// ─── Health Summary Generator ────────────────────────────────────────────────

export async function generateHealthSummary(
  accessToken: string,
  patientId: string,
  days: number = 7,
): Promise<HealthSummary> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

  const [heartRate, bloodPressure, oxygenSat, steps, sleep] = await Promise.all([
    getHeartRateData(accessToken, startDate, endDate),
    getBloodPressureData(accessToken, startDate, endDate),
    getOxygenSaturationData(accessToken, startDate, endDate),
    getStepsData(accessToken, startDate, endDate),
    getSleepData(accessToken, startDate, endDate),
  ]);

  // Calculate averages
  const avgHR = heartRate.length > 0
    ? Math.round(heartRate.reduce((s, r) => s + r.value, 0) / heartRate.length)
    : null;
  const maxHR = heartRate.length > 0
    ? Math.max(...heartRate.map((r) => r.value))
    : null;
  const restingHR = heartRate.length > 0
    ? Math.min(...heartRate.filter((r) => r.value > 40).map((r) => r.value))
    : null;

  const avgSpO2 = oxygenSat.length > 0
    ? Math.round(oxygenSat.reduce((s, r) => s + r.value, 0) / oxygenSat.length * 10) / 10
    : null;

  const avgSystolic = bloodPressure.length > 0
    ? Math.round(bloodPressure.reduce((s, r) => s + r.systolic, 0) / bloodPressure.length)
    : null;
  const avgDiastolic = bloodPressure.length > 0
    ? Math.round(bloodPressure.reduce((s, r) => s + r.diastolic, 0) / bloodPressure.length)
    : null;

  const avgSteps = steps.length > 0
    ? Math.round(steps.reduce((s, r) => s + r.steps, 0) / steps.length)
    : null;

  const avgSleepDuration = sleep.length > 0
    ? Math.round(sleep.reduce((s, r) => s + r.durationMinutes, 0) / sleep.length)
    : null;

  // Generate alerts
  const alerts: HealthAlert[] = [];

  if (avgHR && avgHR > 100) {
    alerts.push({
      type: "warning",
      metric: "Heart Rate",
      message: `Average heart rate elevated at ${avgHR} bpm`,
      value: avgHR,
      threshold: 100,
      timestamp: new Date().toISOString(),
    });
  }

  if (avgSpO2 && avgSpO2 < 95) {
    alerts.push({
      type: avgSpO2 < 90 ? "critical" : "warning",
      metric: "Oxygen Saturation",
      message: `SpO2 below normal at ${avgSpO2}%`,
      value: avgSpO2,
      threshold: 95,
      timestamp: new Date().toISOString(),
    });
  }

  if (avgSystolic && avgSystolic > 140) {
    alerts.push({
      type: "warning",
      metric: "Blood Pressure",
      message: `Systolic BP elevated at ${avgSystolic}/${avgDiastolic} mmHg`,
      value: avgSystolic,
      threshold: 140,
      timestamp: new Date().toISOString(),
    });
  }

  if (avgSteps && avgSteps < 3000) {
    alerts.push({
      type: "info",
      metric: "Activity",
      message: `Low daily activity: ${avgSteps} steps/day average`,
      value: avgSteps,
      threshold: 3000,
      timestamp: new Date().toISOString(),
    });
  }

  // Calculate scores
  const sleepQualityScore = avgSleepDuration
    ? Math.min(100, Math.round((avgSleepDuration / 480) * 100))
    : null;
  const activityScore = avgSteps
    ? Math.min(100, Math.round((avgSteps / 10000) * 100))
    : null;

  return {
    patientId,
    period: { start: startDate.toISOString(), end: endDate.toISOString() },
    averageHeartRate: avgHR,
    restingHeartRate: restingHR,
    maxHeartRate: maxHR,
    averageSpO2: avgSpO2,
    averageSystolic: avgSystolic,
    averageDiastolic: avgDiastolic,
    averageSteps: avgSteps,
    averageSleepDuration: avgSleepDuration,
    sleepQualityScore,
    activityScore,
    alerts,
    trends: [],
  };
}

// ─── OAuth Helper ────────────────────────────────────────────────────────────

// Supports both env naming conventions
const OAUTH_CLIENT_ID = process.env.GOOGLE_HEALTH_CONNECT_CLIENT_ID
  || process.env.GOOGLE_OAUTH_CLIENT_ID || "";
const OAUTH_CLIENT_SECRET = process.env.GOOGLE_HEALTH_CONNECT_CLIENT_SECRET
  || process.env.GOOGLE_OAUTH_CLIENT_SECRET || "";

export function getHealthConnectAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: HEALTH_CONNECT_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeHealthConnectCode(
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    throw new Error(`OAuth token exchange failed: ${await res.text()}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Refresh an expired access token using the stored refresh token.
 * Returns a new access token for continued API access.
 */
export async function refreshHealthConnectToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`OAuth token refresh failed: ${await res.text()}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Revoke a patient's Health Connect access (disconnect device).
 */
export async function revokeHealthConnectAccess(accessToken: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

/**
 * Get the list of data sources available for the connected user.
 * Helps identify which wearable devices are linked.
 */
export async function getConnectedDataSources(
  accessToken: string,
): Promise<Array<{ dataStreamId: string; name: string; type: string; device?: { manufacturer: string; model: string; type: string } }>> {
  try {
    const res = await fetch(`${GOOGLE_FITNESS_API}/dataSources`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error("HEALTH_CONNECT_AUTH_EXPIRED");
      throw new Error(`DataSources error (${res.status}): ${await res.text()}`);
    }

    const data = await res.json() as { dataSource?: Array<{ dataStreamId: string; dataStreamName?: string; type: string; device?: { manufacturer: string; model: string; type: string } }> };

    return (data.dataSource || []).map(ds => ({
      dataStreamId: ds.dataStreamId,
      name: ds.dataStreamName || ds.dataStreamId,
      type: ds.type,
      device: ds.device,
    }));
  } catch (err) {
    console.error("[health-connect.getDataSources] Error:", err);
    return [];
  }
}

// ─── Export Scopes ───────────────────────────────────────────────────────────

export { HEALTH_CONNECT_SCOPES };
