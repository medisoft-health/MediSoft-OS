"use client";

import * as React from "react";
import {
  Activity,
  Heart,
  Thermometer,
  Droplets,
  Weight,
  Plus,
  AlertTriangle,
  Smartphone,
  Watch,
  Loader2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Reading {
  id: number;
  type: string;
  value: number;
  secondaryValue?: number | null;
  unit: string;
  context?: string | null;
  source: string;
  deviceName?: string | null;
  notes?: string | null;
  measuredAt: string;
}

interface Alert {
  id: number;
  severity: "critical" | "warning" | "info";
  titleAr: string;
  messageAr: string;
  createdAt: string;
}

interface Props {
  patientId: number;
}

const READING_TYPES = [
  { value: "blood_pressure", label: "ضغط الدم", icon: Heart, unit: "mmHg", color: "text-red-600", hasSecondary: true },
  { value: "heart_rate", label: "معدل النبض", icon: Activity, unit: "bpm", color: "text-pink-600", hasSecondary: false },
  { value: "temperature", label: "الحرارة", icon: Thermometer, unit: "°C", color: "text-orange-600", hasSecondary: false },
  { value: "spo2", label: "الأكسجين", icon: Droplets, unit: "%", color: "text-blue-600", hasSecondary: false },
  { value: "blood_sugar", label: "السكر", icon: Droplets, unit: "mg/dL", color: "text-purple-600", hasSecondary: false },
  { value: "weight", label: "الوزن", icon: Weight, unit: "kg", color: "text-green-600", hasSecondary: false },
];

export function PatientReadingsTab({ patientId }: Props) {
  const [readings, setReadings] = React.useState<Reading[]>([]);
  const [alerts, setAlerts] = React.useState<Alert[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [selectedType, setSelectedType] = React.useState("blood_pressure");
  const [value, setValue] = React.useState("");
  const [secondaryValue, setSecondaryValue] = React.useState("");
  const [context, setContext] = React.useState("");
  const [source, setSource] = React.useState("manual");
  const [saving, setSaving] = React.useState(false);
  const [latestByType, setLatestByType] = React.useState<Record<string, Reading>>({});

  // Fetch readings and alerts
  React.useEffect(() => {
    async function fetchData() {
      try {
        const [readingsRes, alertsRes, latestRes] = await Promise.all([
          fetch(`/api/patient-360/readings?patientId=${patientId}&period=30d`),
          fetch(`/api/patient-360/readings?patientId=${patientId}&action=alerts`),
          fetch(`/api/patient-360/readings?patientId=${patientId}&action=latest`),
        ]);

        if (readingsRes.ok) {
          const data = await readingsRes.json();
          setReadings(data.readings || []);
        }
        if (alertsRes.ok) {
          const data = await alertsRes.json();
          setAlerts(data.alerts || []);
        }
        if (latestRes.ok) {
          const data = await latestRes.json();
          setLatestByType(data.latest || {});
        }
      } catch (err) {
        console.error("Failed to fetch readings:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [patientId]);

  // Save new reading
  const handleSave = async () => {
    if (!value) return;
    setSaving(true);
    try {
      const typeInfo = READING_TYPES.find((t) => t.value === selectedType);
      const res = await fetch("/api/patient-360/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          type: selectedType,
          value: Number(value),
          secondaryValue: secondaryValue ? Number(secondaryValue) : null,
          unit: typeInfo?.unit || "",
          context: context || null,
          source,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setReadings((prev) => [data.reading, ...prev]);
        if (data.alerts) {
          setAlerts((prev) => [...data.alerts, ...prev]);
        }
        // Update latest
        setLatestByType((prev) => ({ ...prev, [selectedType]: data.reading }));
        // Reset form
        setValue("");
        setSecondaryValue("");
        setContext("");
        setShowForm(false);
      }
    } catch (err) {
      console.error("Failed to save reading:", err);
    } finally {
      setSaving(false);
    }
  };

  const currentTypeInfo = READING_TYPES.find((t) => t.value === selectedType);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-green-50 to-emerald-50 border border-green-100 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">القراءات والقياسات</h2>
            <p className="text-sm text-gray-600">
              سجل قراءات الضغط، السكر، الحرارة، النبض، الأكسجين، والوزن. يتم مراقبتها تلقائياً وتنبيهك عند أي قيمة غير طبيعية.
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            قراءة جديدة
          </Button>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 3).map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border",
                alert.severity === "critical" && "bg-red-50 border-red-200",
                alert.severity === "warning" && "bg-amber-50 border-amber-200",
                alert.severity === "info" && "bg-blue-50 border-blue-200"
              )}
            >
              <AlertTriangle className={cn(
                "h-4 w-4",
                alert.severity === "critical" && "text-red-600",
                alert.severity === "warning" && "text-amber-600",
                alert.severity === "info" && "text-blue-600"
              )} />
              <div className="flex-1">
                <p className="text-sm font-medium">{alert.titleAr}</p>
                <p className="text-xs text-gray-600">{alert.messageAr}</p>
              </div>
              <span className="text-[10px] text-gray-500">
                {new Date(alert.createdAt).toLocaleDateString("ar")}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Latest Readings Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {READING_TYPES.map((type) => {
          const latest = latestByType[type.value] as Reading | undefined;
          const Icon = type.icon;
          return (
            <div key={type.value} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
              <Icon className={cn("h-5 w-5 mx-auto mb-1", type.color)} />
              <p className="text-[10px] text-gray-500">{type.label}</p>
              {latest ? (
                <>
                  <p className="text-lg font-bold text-gray-900" dir="ltr">
                    {latest.value}
                    {latest.secondaryValue ? `/${latest.secondaryValue}` : ""}
                  </p>
                  <p className="text-[10px] text-gray-400">{type.unit}</p>
                  <p className="text-[9px] text-gray-400 mt-1">
                    {new Date(latest.measuredAt).toLocaleDateString("ar")}
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-400 mt-1">لا توجد قراءة</p>
              )}
            </div>
          );
        })}
      </div>

      {/* New Reading Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-gray-900">تسجيل قراءة جديدة</h3>

          {/* Type selector */}
          <div className="flex flex-wrap gap-2">
            {READING_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-all",
                    selectedType === type.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {type.label}
                </button>
              );
            })}
          </div>

          {/* Value inputs */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-600 mb-1 block">
                {currentTypeInfo?.hasSecondary ? "الانقباضي (Systolic)" : "القيمة"}
              </label>
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={currentTypeInfo?.hasSecondary ? "120" : "القيمة"}
                dir="ltr"
              />
            </div>
            {currentTypeInfo?.hasSecondary && (
              <div className="flex-1">
                <label className="text-xs text-gray-600 mb-1 block">الانبساطي (Diastolic)</label>
                <Input
                  type="number"
                  value={secondaryValue}
                  onChange={(e) => setSecondaryValue(e.target.value)}
                  placeholder="80"
                  dir="ltr"
                />
              </div>
            )}
            <div className="flex-1">
              <label className="text-xs text-gray-600 mb-1 block">السياق</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={context}
                onChange={(e) => setContext(e.target.value)}
              >
                <option value="">عام</option>
                <option value="fasting">صائم</option>
                <option value="after_meal">بعد الأكل</option>
                <option value="before_meal">قبل الأكل</option>
                <option value="resting">راحة</option>
                <option value="after_exercise">بعد تمرين</option>
                <option value="morning">صباحي</option>
                <option value="evening">مسائي</option>
              </select>
            </div>
          </div>

          {/* Source */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-600">المصدر:</label>
            <div className="flex gap-2">
              {[
                { value: "manual", label: "يدوي", icon: Plus },
                { value: "device", label: "جهاز", icon: Smartphone },
                { value: "wearable", label: "ساعة ذكية", icon: Watch },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSource(s.value)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded text-xs border",
                    source === s.value ? "border-blue-500 bg-blue-50" : "border-gray-200"
                  )}
                >
                  <s.icon className="h-3 w-3" />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={!value || saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ القراءة
            </Button>
          </div>
        </div>
      )}

      {/* Readings History */}
      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
        </div>
      ) : readings.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">سجل القراءات (آخر 30 يوم)</h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {readings.map((reading) => {
              const typeInfo = READING_TYPES.find((t) => t.value === reading.type);
              const Icon = typeInfo?.icon || Activity;
              return (
                <div key={reading.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Icon className={cn("h-4 w-4", typeInfo?.color || "text-gray-500")} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{typeInfo?.label || reading.type}</span>
                    {reading.context && (
                      <Badge variant="outline" className="text-[9px] mr-2">{reading.context}</Badge>
                    )}
                  </div>
                  <span className="text-sm font-bold tabular-nums" dir="ltr">
                    {reading.value}{reading.secondaryValue ? `/${reading.secondaryValue}` : ""} {reading.unit}
                  </span>
                  <span className="text-[10px] text-gray-400 min-w-[80px] text-left" dir="ltr">
                    {new Date(reading.measuredAt).toLocaleString("ar", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {reading.source !== "manual" && (
                    <Badge variant="outline" className="text-[9px]">
                      {reading.source === "device" ? "📱" : "⌚"} {reading.deviceName || reading.source}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">لا توجد قراءات مسجلة بعد</p>
          <p className="text-xs text-gray-400 mt-1">اضغط «قراءة جديدة» لتسجيل أول قراءة</p>
        </div>
      )}
    </div>
  );
}
