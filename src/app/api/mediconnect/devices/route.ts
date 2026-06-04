import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { db } from "@/db";
import {
  patientDeviceConnections,
  patientReadings,
  patientAlerts,
  patientNotifications,
  patients,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// Thresholds for automatic alerts
const ALERT_THRESHOLDS: Record<string, { critical: [number, number]; warning: [number, number] }> = {
  blood_glucose: { critical: [40, 300], warning: [70, 200] },
  systolic_bp: { critical: [70, 180], warning: [90, 140] },
  diastolic_bp: { critical: [40, 120], warning: [60, 90] },
  heart_rate: { critical: [40, 150], warning: [50, 100] },
  spo2: { critical: [85, 101], warning: [92, 101] },
  temperature: { critical: [34, 40], warning: [35.5, 38.5] },
};

function checkThreshold(type: string, value: number): "critical" | "warning" | null {
  const threshold = ALERT_THRESHOLDS[type];
  if (!threshold) return null;
  if (value < threshold.critical[0] || value > threshold.critical[1]) return "critical";
  if (value < threshold.warning[0] || value > threshold.warning[1]) return "warning";
  return null;
}

/**
 * GET /api/mediconnect/devices — Get device connections and sync status
 */
export async function GET(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const action = searchParams.get("action") || "list";

  if (!patientId) {
    return NextResponse.json({ success: false, error: "patientId required" }, { status: 400 });
  }

  try {
    switch (action) {
      case "list": {
        const devices = await db
          .select()
          .from(patientDeviceConnections)
          .where(eq(patientDeviceConnections.patientId, parseInt(patientId)))
          .orderBy(desc(patientDeviceConnections.lastSyncAt));

        return NextResponse.json({ success: true, data: devices });
      }

      case "available": {
        // Return available device types for connection
        const available = [
          {
            type: "apple_health",
            name: "Apple Health",
            nameAr: "صحة Apple",
            icon: "apple",
            description: "Sync heart rate, blood pressure, steps, sleep from iPhone/Apple Watch",
            descriptionAr: "مزامنة النبض والضغط والخطوات والنوم من iPhone/Apple Watch",
            dataTypes: ["heart_rate", "blood_pressure", "steps", "sleep", "spo2", "weight", "ecg"],
            requiresOAuth: true,
          },
          {
            type: "google_health_connect",
            name: "Google Health Connect",
            nameAr: "Google Health Connect",
            icon: "google",
            description: "Sync health data from Android devices and Wear OS",
            descriptionAr: "مزامنة البيانات الصحية من أجهزة Android و Wear OS",
            dataTypes: ["heart_rate", "blood_pressure", "steps", "sleep", "spo2", "weight", "glucose"],
            requiresOAuth: true,
          },
          {
            type: "bluetooth_bp",
            name: "Bluetooth Blood Pressure Monitor",
            nameAr: "جهاز ضغط بلوتوث",
            icon: "bluetooth",
            description: "Connect Omron, Withings, or other BLE blood pressure monitors",
            descriptionAr: "اتصال بأجهزة قياس الضغط عبر البلوتوث",
            dataTypes: ["blood_pressure", "heart_rate"],
            requiresOAuth: false,
          },
          {
            type: "bluetooth_glucose",
            name: "Bluetooth Glucose Meter",
            nameAr: "جهاز سكر بلوتوث",
            icon: "bluetooth",
            description: "Connect FreeStyle Libre, Dexcom, or other CGM devices",
            descriptionAr: "اتصال بأجهزة قياس السكر المستمرة",
            dataTypes: ["glucose"],
            requiresOAuth: false,
          },
          {
            type: "fitbit",
            name: "Fitbit",
            nameAr: "Fitbit",
            icon: "watch",
            description: "Sync Fitbit wearable data",
            descriptionAr: "مزامنة بيانات Fitbit",
            dataTypes: ["heart_rate", "steps", "sleep", "spo2", "weight"],
            requiresOAuth: true,
          },
          {
            type: "garmin",
            name: "Garmin",
            nameAr: "Garmin",
            icon: "watch",
            description: "Sync Garmin wearable data",
            descriptionAr: "مزامنة بيانات Garmin",
            dataTypes: ["heart_rate", "steps", "sleep", "spo2", "stress"],
            requiresOAuth: true,
          },
          {
            type: "samsung_health",
            name: "Samsung Health",
            nameAr: "Samsung Health",
            icon: "watch",
            description: "Sync Samsung Galaxy Watch and Health data",
            descriptionAr: "مزامنة بيانات Samsung Galaxy Watch",
            dataTypes: ["heart_rate", "blood_pressure", "steps", "sleep", "spo2", "ecg"],
            requiresOAuth: true,
          },
          {
            type: "withings",
            name: "Withings",
            nameAr: "Withings",
            icon: "scale",
            description: "Sync Withings smart scale, BP monitor, sleep tracker",
            descriptionAr: "مزامنة ميزان Withings الذكي وجهاز الضغط ومتتبع النوم",
            dataTypes: ["weight", "blood_pressure", "heart_rate", "sleep", "spo2"],
            requiresOAuth: true,
          },
        ];

        return NextResponse.json({ success: true, data: available });
      }

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[Devices GET]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/mediconnect/devices — Connect device, sync data, disconnect
 */
export async function POST(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const body = await req.json();
  const { action } = body;

  try {
    switch (action) {
      case "connect": {
        const { patientId, deviceType, deviceName, deviceModel, dataTypes, oauthToken, refreshToken } = body;
        if (!patientId || !deviceType) {
          return NextResponse.json({ success: false, error: "patientId and deviceType required" }, { status: 400 });
        }

        const [device] = await db
          .insert(patientDeviceConnections)
          .values({
            patientId,
            deviceType,
            deviceName: deviceName || null,
            deviceModel: deviceModel || null,
            connectionStatus: oauthToken ? "connected" : "pending",
            oauthToken: oauthToken || null,
            refreshToken: refreshToken || null,
            tokenExpiresAt: oauthToken ? new Date(Date.now() + 3600000) : null,
            dataTypes: dataTypes || [],
            lastSyncAt: new Date(),
          })
          .returning();

        return NextResponse.json({ success: true, data: device }, { status: 201 });
      }

      case "sync_readings": {
        // Receive batch readings from a device
        const { patientId, deviceId, readings } = body;
        if (!patientId || !readings || !Array.isArray(readings)) {
          return NextResponse.json({ success: false, error: "patientId and readings array required" }, { status: 400 });
        }

        const results = [];
        const alerts = [];

        for (const reading of readings) {
          const { type, value, unit, measuredAt, metadata: readingMeta } = reading;

          // Insert reading
          const [r] = await db
            .insert(patientReadings)
            .values({
              patientId,
              readingType: type,
              valuePrimary: value.toString(),
              unit: unit || "",
              source: deviceId ? "device_bluetooth" : "manual",
              deviceId: deviceId || null,
              deviceName: readingMeta?.deviceName || null,
              notes: readingMeta ? JSON.stringify(readingMeta) : null,
            })
            .returning();

          results.push(r);

          // Check thresholds
          const alertLevel = checkThreshold(type, parseFloat(value));
          if (alertLevel) {
            const [alert] = await db
              .insert(patientAlerts)
              .values({
                patientId,
                readingId: r.id,
                alertType: "abnormal_reading",
                severity: alertLevel,
                title: alertLevel === "critical"
                  ? `⚠️ قراءة حرجة: ${type}`
                  : `تحذير: ${type}`,
                titleAr: alertLevel === "critical"
                  ? `⚠️ قراءة حرجة: ${type}`
                  : `تحذير: ${type}`,
                message: `القيمة ${value} ${unit} ${alertLevel === "critical" ? "خارج النطاق الآمن" : "تحتاج مراقبة"}`,
                messageAr: `القيمة ${value} ${unit} ${alertLevel === "critical" ? "خارج النطاق الآمن" : "تحتاج مراقبة"}`,
                notifyPatient: true,
                notifyPhysician: true,
                metadata: { readingType: type, value, unit, threshold: ALERT_THRESHOLDS[type] },
              })
              .returning();

            alerts.push(alert);

            // Create patient notification for critical alerts
            if (alertLevel === "critical") {
              await db.insert(patientNotifications).values({
                patientId,
                type: "reading_alert",
                severity: "critical",
                title: `Critical Reading Alert`,
                titleAr: `تنبيه قراءة حرجة`,
                body: `Your ${type.replace("_", " ")} reading of ${value} ${unit} is outside safe range. Please seek medical attention.`,
                bodyAr: `قراءة ${type === "blood_glucose" ? "السكر" : type === "systolic_bp" ? "الضغط" : type} بقيمة ${value} ${unit} خارج النطاق الآمن. يرجى مراجعة الطبيب.`,
                actionUrl: `/patient-portal?tab=readings`,
                channelsSent: ["in_app", "push", "sms"],
              });
            }
          }
        }

        // Update device last sync time
        if (deviceId) {
          await db
            .update(patientDeviceConnections)
            .set({ lastSyncAt: new Date(), updatedAt: new Date() })
            .where(eq(patientDeviceConnections.id, deviceId));
        }

        return NextResponse.json({
          success: true,
          data: { readings: results, alerts },
          summary: {
            total: results.length,
            alerts: alerts.length,
            critical: alerts.filter((a) => a.severity === "critical").length,
          },
        });
      }

      case "disconnect": {
        const { deviceId } = body;
        if (!deviceId) {
          return NextResponse.json({ success: false, error: "deviceId required" }, { status: 400 });
        }

        await db
          .update(patientDeviceConnections)
          .set({
            connectionStatus: "disconnected",
            oauthToken: null,
            refreshToken: null,
            updatedAt: new Date(),
          })
          .where(eq(patientDeviceConnections.id, deviceId));

        return NextResponse.json({ success: true });
      }

      case "oauth_callback": {
        // Handle OAuth callback from Apple Health / Google Health Connect
        const { deviceId, code, state } = body;
        if (!deviceId || !code) {
          return NextResponse.json({ success: false, error: "deviceId and code required" }, { status: 400 });
        }

        // Get device to determine type
        const device = await db
          .select()
          .from(patientDeviceConnections)
          .where(eq(patientDeviceConnections.id, deviceId))
          .then((r) => r[0]);

        if (!device) {
          return NextResponse.json({ success: false, error: "Device not found" }, { status: 404 });
        }

        // Exchange code for tokens based on device type
        let tokenData: any = {};

        if (device.deviceType === "google_health_connect") {
          // Exchange with Google OAuth
          const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              code,
              client_id: process.env.GOOGLE_CLIENT_ID || "",
              client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
              redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/mediconnect/devices/callback`,
              grant_type: "authorization_code",
            }),
          });
          tokenData = await tokenRes.json();
        } else if (device.deviceType === "fitbit") {
          const tokenRes = await fetch("https://api.fitbit.com/oauth2/token", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${Buffer.from(`${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`).toString("base64")}`,
            },
            body: new URLSearchParams({
              code,
              grant_type: "authorization_code",
              redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/mediconnect/devices/callback`,
            }),
          });
          tokenData = await tokenRes.json();
        }

        // Update device with tokens
        await db
          .update(patientDeviceConnections)
          .set({
            connectionStatus: "connected",
            oauthToken: tokenData.access_token || null,
            refreshToken: tokenData.refresh_token || null,
            tokenExpiresAt: tokenData.expires_in
              ? new Date(Date.now() + tokenData.expires_in * 1000)
              : null,
            lastSyncAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(patientDeviceConnections.id, deviceId));

        return NextResponse.json({ success: true, data: { connected: true } });
      }

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[Devices POST]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
