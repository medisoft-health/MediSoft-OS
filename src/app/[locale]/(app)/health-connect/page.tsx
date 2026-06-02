"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Watch,
  Heart,
  Activity,
  Moon,
  Droplets,
  Thermometer,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
  Plus,
} from "lucide-react";

// Demo data for display
const demoVitals = {
  heartRate: { current: 72, avg: 68, min: 55, max: 112, trend: "stable" as const },
  bloodPressure: { systolic: 122, diastolic: 78, trend: "stable" as const },
  oxygenSaturation: { current: 98, avg: 97.5, min: 95, trend: "stable" as const },
  steps: { today: 6842, avg: 7500, goal: 10000, trend: "decreasing" as const },
  sleep: { lastNight: 7.2, avg: 6.8, quality: 82, trend: "increasing" as const },
  temperature: { current: 36.6, trend: "stable" as const },
};

const demoAlerts = [
  {
    type: "info" as const,
    metric: "Activity",
    message: "Steps below 7-day average. Consider encouraging more activity.",
    time: "2 hours ago",
  },
];

const demoDevices = [
  { name: "Pixel Watch 3", type: "Smartwatch", status: "connected", lastSync: "5 min ago" },
  { name: "Fitbit Sense 2", type: "Fitness Tracker", status: "disconnected", lastSync: "2 days ago" },
];

export default function HealthConnectPage() {
  const t = useTranslations("GoogleHealth");
  return (
    <div className="space-y-6 p-6 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 text-white">
            <Watch className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t("healthConnect")}</h1>
            <p className="text-sm text-[color:var(--color-muted-foreground)]">
              {t("wearableDevices")}
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
          <Plus className="size-4" />
          {t("connectDevice")}
        </button>
      </div>

      {/* Connected Devices */}
      <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-5">
        <h2 className="mb-4 text-sm font-semibold">{t("connectedDevices")}</h2>
        <div className="space-y-3">
          {demoDevices.map((device) => (
            <div
              key={device.name}
              className="flex items-center justify-between rounded-xl bg-[color:var(--color-muted)]/30 p-3"
            >
              <div className="flex items-center gap-3">
                <div className={`flex size-9 items-center justify-center rounded-lg ${
                  device.status === "connected" ? "bg-green-500/10 text-green-600" : "bg-gray-500/10 text-gray-400"
                }`}>
                  <Watch className="size-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">{device.name}</div>
                  <div className="text-xs text-[color:var(--color-muted-foreground)]">{device.type}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[color:var(--color-muted-foreground)]">
                  Last sync: {device.lastSync}
                </span>
                {device.status === "connected" ? (
                  <Wifi className="size-4 text-green-500" />
                ) : (
                  <WifiOff className="size-4 text-gray-400" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vitals Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <VitalCard
          icon={Heart}
          title="Heart Rate"
          value={`${demoVitals.heartRate.current}`}
          unit="bpm"
          subtitle={`Avg: ${demoVitals.heartRate.avg} | Range: ${demoVitals.heartRate.min}-${demoVitals.heartRate.max}`}
          trend={demoVitals.heartRate.trend}
          color="red"
        />
        <VitalCard
          icon={Activity}
          title="Blood Pressure"
          value={`${demoVitals.bloodPressure.systolic}/${demoVitals.bloodPressure.diastolic}`}
          unit="mmHg"
          subtitle="Normal range"
          trend={demoVitals.bloodPressure.trend}
          color="blue"
        />
        <VitalCard
          icon={Droplets}
          title="Oxygen Saturation"
          value={`${demoVitals.oxygenSaturation.current}`}
          unit="%"
          subtitle={`Avg: ${demoVitals.oxygenSaturation.avg}% | Min: ${demoVitals.oxygenSaturation.min}%`}
          trend={demoVitals.oxygenSaturation.trend}
          color="cyan"
        />
        <VitalCard
          icon={Activity}
          title="Steps Today"
          value={demoVitals.steps.today.toLocaleString()}
          unit="steps"
          subtitle={`Goal: ${demoVitals.steps.goal.toLocaleString()} (${Math.round(demoVitals.steps.today / demoVitals.steps.goal * 100)}%)`}
          trend={demoVitals.steps.trend}
          color="green"
        />
        <VitalCard
          icon={Moon}
          title="Sleep"
          value={`${demoVitals.sleep.lastNight}`}
          unit="hours"
          subtitle={`Quality: ${demoVitals.sleep.quality}% | Avg: ${demoVitals.sleep.avg}h`}
          trend={demoVitals.sleep.trend}
          color="purple"
        />
        <VitalCard
          icon={Thermometer}
          title="Temperature"
          value={`${demoVitals.temperature.current}`}
          unit="°C"
          subtitle="Normal"
          trend={demoVitals.temperature.trend}
          color="orange"
        />
      </div>

      {/* Alerts */}
      {demoAlerts.length > 0 && (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-yellow-700">
            <AlertTriangle className="size-4" />
            {t("healthAlerts")}
          </h2>
          <div className="space-y-2">
            {demoAlerts.map((alert, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg bg-white/50 p-3 dark:bg-black/20">
                <span className="text-sm">{alert.message}</span>
                <span className="text-xs text-[color:var(--color-muted-foreground)]">{alert.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pre-visit Summary */}
      <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("preVisitSummary")}</h2>
          <button className="flex items-center gap-1.5 rounded-lg border border-[color:var(--color-border)] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[color:var(--color-muted)]/50">
            <RefreshCw className="size-3" />
            Refresh
          </button>
        </div>
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <SummaryItem label="Average Resting HR" value="55 bpm" status="normal" />
          <SummaryItem label="BP Trend" value="122/78 → 120/76" status="normal" />
          <SummaryItem label="SpO2 Range" value="95-99%" status="normal" />
          <SummaryItem label="Sleep Quality" value="82% (improving)" status="good" />
          <SummaryItem label="Daily Steps Avg" value="7,500" status="normal" />
          <SummaryItem label="Active Minutes" value="45 min/day" status="normal" />
        </div>
      </div>
    </div>
  );
}

function VitalCard({
  icon: Icon,
  title,
  value,
  unit,
  subtitle,
  trend,
  color,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  unit: string;
  subtitle: string;
  trend: "increasing" | "decreasing" | "stable";
  color: string;
}) {
  const colorMap: Record<string, string> = {
    red: "bg-red-500/10 text-red-600",
    blue: "bg-blue-500/10 text-blue-600",
    cyan: "bg-cyan-500/10 text-cyan-600",
    green: "bg-green-500/10 text-green-600",
    purple: "bg-purple-500/10 text-purple-600",
    orange: "bg-orange-500/10 text-orange-600",
  };

  const TrendIcon = trend === "increasing" ? TrendingUp : trend === "decreasing" ? TrendingDown : Activity;

  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex size-9 items-center justify-center rounded-lg ${colorMap[color]}`}>
          <Icon className="size-4" />
        </div>
        <TrendIcon className={`size-4 ${
          trend === "increasing" ? "text-green-500" : trend === "decreasing" ? "text-red-500" : "text-gray-400"
        }`} />
      </div>
      <div className="text-xs text-[color:var(--color-muted-foreground)]">{title}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-sm text-[color:var(--color-muted-foreground)]">{unit}</span>
      </div>
      <div className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">{subtitle}</div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "normal" | "good" | "warning" | "critical";
}) {
  const statusColor = {
    normal: "text-blue-600",
    good: "text-green-600",
    warning: "text-orange-600",
    critical: "text-red-600",
  };

  return (
    <div className="flex items-center justify-between rounded-lg bg-[color:var(--color-muted)]/30 px-3 py-2">
      <span className="text-[color:var(--color-muted-foreground)]">{label}</span>
      <span className={`font-medium ${statusColor[status]}`}>{value}</span>
    </div>
  );
}
