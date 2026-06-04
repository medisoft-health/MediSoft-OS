/**
 * MediSoft Device Integration Library
 * Handles Apple Health, Google Health Connect, Fitbit, Garmin, Samsung Health, Withings
 * 
 * Architecture:
 * - Mobile App (PWA/Native) → reads from HealthKit/Health Connect → sends to MediSoft API
 * - OAuth2 flow for cloud-based services (Fitbit, Garmin, Withings)
 * - Bluetooth Web API for direct device connections (BP monitors, glucose meters)
 * - Webhook receivers for real-time data from cloud services
 */

// ============ TYPES ============

export interface HealthReading {
  type: string;
  value: number;
  unit: string;
  measuredAt: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface DeviceSyncResult {
  success: boolean;
  readingsCount: number;
  alertsTriggered: number;
  lastSyncAt: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri: string;
}

// ============ OAUTH CONFIGURATIONS ============

export function getOAuthConfig(deviceType: string): OAuthConfig | null {
  const baseRedirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "https://app.medisofthealth.com"}/api/mediconnect/devices/callback`;

  switch (deviceType) {
    case "google_health_connect":
      return {
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scopes: [
          "https://www.googleapis.com/auth/fitness.activity.read",
          "https://www.googleapis.com/auth/fitness.blood_glucose.read",
          "https://www.googleapis.com/auth/fitness.blood_pressure.read",
          "https://www.googleapis.com/auth/fitness.body.read",
          "https://www.googleapis.com/auth/fitness.heart_rate.read",
          "https://www.googleapis.com/auth/fitness.oxygen_saturation.read",
          "https://www.googleapis.com/auth/fitness.sleep.read",
          "https://www.googleapis.com/auth/fitness.body_temperature.read",
        ],
        redirectUri: baseRedirectUri,
      };

    case "fitbit":
      return {
        clientId: process.env.FITBIT_CLIENT_ID || "",
        clientSecret: process.env.FITBIT_CLIENT_SECRET || "",
        authUrl: "https://www.fitbit.com/oauth2/authorize",
        tokenUrl: "https://api.fitbit.com/oauth2/token",
        scopes: ["activity", "heartrate", "sleep", "weight", "oxygen_saturation", "respiratory_rate", "temperature"],
        redirectUri: baseRedirectUri,
      };

    case "garmin":
      return {
        clientId: process.env.GARMIN_CLIENT_ID || "",
        clientSecret: process.env.GARMIN_CLIENT_SECRET || "",
        authUrl: "https://connect.garmin.com/oauthConfirm",
        tokenUrl: "https://connectapi.garmin.com/oauth-service/oauth/token",
        scopes: ["activity", "heartrate", "sleep", "body"],
        redirectUri: baseRedirectUri,
      };

    case "withings":
      return {
        clientId: process.env.WITHINGS_CLIENT_ID || "",
        clientSecret: process.env.WITHINGS_CLIENT_SECRET || "",
        authUrl: "https://account.withings.com/oauth2_user/authorize2",
        tokenUrl: "https://wbsapi.withings.net/v2/oauth2",
        scopes: ["user.metrics", "user.activity", "user.sleepevents"],
        redirectUri: baseRedirectUri,
      };

    case "samsung_health":
      return {
        clientId: process.env.SAMSUNG_HEALTH_CLIENT_ID || "",
        clientSecret: process.env.SAMSUNG_HEALTH_CLIENT_SECRET || "",
        authUrl: "https://account.samsung.com/accounts/v1/OIDC/authorize",
        tokenUrl: "https://account.samsung.com/accounts/v1/OIDC/token",
        scopes: ["openid", "health.heartrate", "health.bloodpressure", "health.sleep", "health.steps"],
        redirectUri: baseRedirectUri,
      };

    default:
      return null;
  }
}

/**
 * Generate OAuth authorization URL for a device type
 */
export function getOAuthUrl(deviceType: string, state: string): string | null {
  const config = getOAuthConfig(deviceType);
  if (!config || !config.clientId) return null;

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
    access_type: "offline",
    prompt: "consent",
  });

  return `${config.authUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  deviceType: string,
  code: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
  const config = getOAuthConfig(deviceType);
  if (!config) return null;

  try {
    const body = new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    });

    const res = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) return null;
    const data = await res.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || "",
      expiresIn: data.expires_in || 3600,
    };
  } catch (e) {
    console.error(`[HealthConnect] Token exchange failed for ${deviceType}:`, e);
    return null;
  }
}

/**
 * Refresh expired OAuth tokens
 */
export async function refreshTokens(
  deviceType: string,
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
  const config = getOAuthConfig(deviceType);
  if (!config) return null;

  try {
    const body = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    });

    const res = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) return null;
    const data = await res.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in || 3600,
    };
  } catch (e) {
    console.error(`[HealthConnect] Token refresh failed for ${deviceType}:`, e);
    return null;
  }
}

// ============ DATA FETCHERS ============

/**
 * Fetch health data from Google Fitness API
 */
export async function fetchGoogleFitData(
  accessToken: string,
  dataTypes: string[],
  startTime: Date,
  endTime: Date
): Promise<HealthReading[]> {
  const readings: HealthReading[] = [];

  const dataSourceMap: Record<string, { dataType: string; unit: string }> = {
    heart_rate: { dataType: "com.google.heart_rate.bpm", unit: "bpm" },
    steps: { dataType: "com.google.step_count.delta", unit: "steps" },
    weight: { dataType: "com.google.weight", unit: "kg" },
    blood_pressure: { dataType: "com.google.blood_pressure", unit: "mmHg" },
    spo2: { dataType: "com.google.oxygen_saturation", unit: "%" },
    sleep: { dataType: "com.google.sleep.segment", unit: "min" },
    glucose: { dataType: "com.google.blood_glucose", unit: "mg/dL" },
  };

  for (const type of dataTypes) {
    const source = dataSourceMap[type];
    if (!source) continue;

    try {
      const res = await fetch(
        "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            aggregateBy: [{ dataTypeName: source.dataType }],
            bucketByTime: { durationMillis: 3600000 }, // 1 hour buckets
            startTimeMillis: startTime.getTime(),
            endTimeMillis: endTime.getTime(),
          }),
        }
      );

      if (!res.ok) continue;
      const data = await res.json();

      for (const bucket of data.bucket || []) {
        for (const dataset of bucket.dataset || []) {
          for (const point of dataset.point || []) {
            const value = point.value?.[0]?.fpVal || point.value?.[0]?.intVal || 0;
            if (value > 0) {
              readings.push({
                type,
                value,
                unit: source.unit,
                measuredAt: new Date(parseInt(point.startTimeNanos) / 1000000).toISOString(),
                source: "google_health_connect",
              });
            }
          }
        }
      }
    } catch (e) {
      console.error(`[GoogleFit] Failed to fetch ${type}:`, e);
    }
  }

  return readings;
}

/**
 * Fetch health data from Fitbit API
 */
export async function fetchFitbitData(
  accessToken: string,
  dataTypes: string[],
  date: string // YYYY-MM-DD
): Promise<HealthReading[]> {
  const readings: HealthReading[] = [];

  const endpoints: Record<string, { url: string; unit: string; parser: (data: any) => number[] }> = {
    heart_rate: {
      url: `/1/user/-/activities/heart/date/${date}/1d/1min.json`,
      unit: "bpm",
      parser: (data) => data["activities-heart-intraday"]?.dataset?.map((d: any) => d.value) || [],
    },
    steps: {
      url: `/1/user/-/activities/date/${date}.json`,
      unit: "steps",
      parser: (data) => [data.summary?.steps || 0],
    },
    spo2: {
      url: `/1/user/-/spo2/date/${date}.json`,
      unit: "%",
      parser: (data) => [data.value?.avg || 0],
    },
    weight: {
      url: `/1/user/-/body/log/weight/date/${date}.json`,
      unit: "kg",
      parser: (data) => data.weight?.map((w: any) => w.weight) || [],
    },
  };

  for (const type of dataTypes) {
    const endpoint = endpoints[type];
    if (!endpoint) continue;

    try {
      const res = await fetch(`https://api.fitbit.com${endpoint.url}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) continue;
      const data = await res.json();
      const values = endpoint.parser(data);

      for (const value of values) {
        if (value > 0) {
          readings.push({
            type,
            value,
            unit: endpoint.unit,
            measuredAt: new Date().toISOString(),
            source: "fitbit",
          });
        }
      }
    } catch (e) {
      console.error(`[Fitbit] Failed to fetch ${type}:`, e);
    }
  }

  return readings;
}

// ============ BLUETOOTH WEB API HELPERS ============

/**
 * Generate Bluetooth connection instructions for the client-side
 * These are used by the mobile/PWA app to connect to BLE devices
 */
export function getBluetoothServiceUUIDs(deviceType: string): string[] {
  switch (deviceType) {
    case "bluetooth_bp":
      return ["00001810-0000-1000-8000-00805f9b34fb"]; // Blood Pressure Service
    case "bluetooth_glucose":
      return ["00001808-0000-1000-8000-00805f9b34fb"]; // Glucose Service
    case "bluetooth_hr":
      return ["0000180d-0000-1000-8000-00805f9b34fb"]; // Heart Rate Service
    case "bluetooth_weight":
      return ["0000181d-0000-1000-8000-00805f9b34fb"]; // Body Composition Service
    case "bluetooth_thermometer":
      return ["00001809-0000-1000-8000-00805f9b34fb"]; // Health Thermometer Service
    case "bluetooth_spo2":
      return ["00001822-0000-1000-8000-00805f9b34fb"]; // Pulse Oximeter Service
    default:
      return [];
  }
}

/**
 * Parse raw Bluetooth data from health devices
 */
export function parseBluetoothReading(
  deviceType: string,
  rawData: ArrayBuffer
): HealthReading | null {
  const view = new DataView(rawData);

  switch (deviceType) {
    case "bluetooth_bp": {
      // Blood Pressure Measurement characteristic (0x2A35)
      const flags = view.getUint8(0);
      const systolic = view.getFloat32(1, true);
      const diastolic = view.getFloat32(3, true);
      return {
        type: "blood_pressure",
        value: systolic, // Store systolic, diastolic in metadata
        unit: "mmHg",
        measuredAt: new Date().toISOString(),
        source: "bluetooth_bp",
        metadata: { systolic, diastolic },
      };
    }

    case "bluetooth_glucose": {
      // Glucose Measurement characteristic (0x2A18)
      const glucose = view.getFloat32(3, true);
      return {
        type: "blood_glucose",
        value: glucose,
        unit: "mg/dL",
        measuredAt: new Date().toISOString(),
        source: "bluetooth_glucose",
      };
    }

    case "bluetooth_hr": {
      // Heart Rate Measurement characteristic (0x2A37)
      const flags2 = view.getUint8(0);
      const hr = flags2 & 0x01 ? view.getUint16(1, true) : view.getUint8(1);
      return {
        type: "heart_rate",
        value: hr,
        unit: "bpm",
        measuredAt: new Date().toISOString(),
        source: "bluetooth_hr",
      };
    }

    default:
      return null;
  }
}

// ============ APPLE HEALTH (via PWA/Native bridge) ============

/**
 * Apple Health data types mapping
 * These are used by the native iOS bridge to request HealthKit permissions
 */
export const APPLE_HEALTH_TYPES = {
  heart_rate: "HKQuantityTypeIdentifierHeartRate",
  blood_pressure_systolic: "HKQuantityTypeIdentifierBloodPressureSystolic",
  blood_pressure_diastolic: "HKQuantityTypeIdentifierBloodPressureDiastolic",
  spo2: "HKQuantityTypeIdentifierOxygenSaturation",
  steps: "HKQuantityTypeIdentifierStepCount",
  weight: "HKQuantityTypeIdentifierBodyMass",
  glucose: "HKQuantityTypeIdentifierBloodGlucose",
  temperature: "HKQuantityTypeIdentifierBodyTemperature",
  sleep: "HKCategoryTypeIdentifierSleepAnalysis",
  ecg: "HKElectrocardiogramType",
  respiratory_rate: "HKQuantityTypeIdentifierRespiratoryRate",
  vo2max: "HKQuantityTypeIdentifierVO2Max",
  active_energy: "HKQuantityTypeIdentifierActiveEnergyBurned",
  resting_heart_rate: "HKQuantityTypeIdentifierRestingHeartRate",
  walking_heart_rate_average: "HKQuantityTypeIdentifierWalkingHeartRateAverage",
  heart_rate_variability: "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
};

/**
 * Normalize Apple Health readings to our standard format
 */
export function normalizeAppleHealthReadings(
  rawReadings: Array<{ type: string; value: number; unit: string; startDate: string; endDate: string }>
): HealthReading[] {
  return rawReadings.map((r) => {
    // Map Apple Health type identifiers to our standard types
    let type = r.type;
    if (type.includes("HeartRate") && !type.includes("Variability") && !type.includes("Walking") && !type.includes("Resting")) {
      type = "heart_rate";
    } else if (type.includes("BloodPressureSystolic")) {
      type = "systolic_bp";
    } else if (type.includes("BloodPressureDiastolic")) {
      type = "diastolic_bp";
    } else if (type.includes("OxygenSaturation")) {
      type = "spo2";
    } else if (type.includes("StepCount")) {
      type = "steps";
    } else if (type.includes("BodyMass")) {
      type = "weight";
    } else if (type.includes("BloodGlucose")) {
      type = "blood_glucose";
    } else if (type.includes("BodyTemperature")) {
      type = "temperature";
    }

    return {
      type,
      value: r.value,
      unit: r.unit,
      measuredAt: r.startDate,
      source: "apple_health",
    };
  });
}
