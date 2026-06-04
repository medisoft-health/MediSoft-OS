"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Activity,
  Heart,
  Droplets,
  Thermometer,
  Scale,
  Wind,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Bell,
  MessageSquare,
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Send,
  Pill,
  Stethoscope,
} from "lucide-react";

interface Reading {
  id: string;
  readingType: string;
  value: number;
  unit: string;
  measuredAt: string;
  source: string;
}

interface PatientMobileDashboardProps {
  patientId: number;
  patientName?: string;
}

type ReadingType = "blood_glucose" | "systolic_bp" | "diastolic_bp" | "heart_rate" | "spo2" | "weight" | "temperature";

interface QuickReadingConfig {
  type: ReadingType;
  label: string;
  icon: React.ReactNode;
  unit: string;
  color: string;
  min: number;
  max: number;
  normalMin: number;
  normalMax: number;
  step: number;
}

export function PatientMobileDashboard({ patientId, patientName }: PatientMobileDashboardProps) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"overview" | "record" | "messages" | "appointments">("overview");
  const [recordingType, setRecordingType] = useState<ReadingType | null>(null);
  const [recordingValue, setRecordingValue] = useState("");
  const [recordingValue2, setRecordingValue2] = useState(""); // For BP diastolic
  const [submitting, setSubmitting] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; severity: string; createdAt: string }>>([]);

  const quickReadings: QuickReadingConfig[] = [
    { type: "blood_glucose", label: "السكر", icon: <Droplets className="h-5 w-5" />, unit: "mg/dL", color: "purple", min: 40, max: 500, normalMin: 70, normalMax: 140, step: 1 },
    { type: "systolic_bp", label: "الضغط", icon: <Activity className="h-5 w-5" />, unit: "mmHg", color: "blue", min: 60, max: 250, normalMin: 90, normalMax: 140, step: 1 },
    { type: "heart_rate", label: "النبض", icon: <Heart className="h-5 w-5" />, unit: "bpm", color: "red", min: 30, max: 220, normalMin: 60, normalMax: 100, step: 1 },
    { type: "spo2", label: "الأكسجين", icon: <Wind className="h-5 w-5" />, unit: "%", color: "cyan", min: 70, max: 100, normalMin: 95, normalMax: 100, step: 1 },
    { type: "weight", label: "الوزن", icon: <Scale className="h-5 w-5" />, unit: "kg", color: "green", min: 20, max: 300, normalMin: 50, normalMax: 100, step: 0.1 },
    { type: "temperature", label: "الحرارة", icon: <Thermometer className="h-5 w-5" />, unit: "°C", color: "amber", min: 34, max: 42, normalMin: 36.1, normalMax: 37.2, step: 0.1 },
  ];

  const fetchReadings = useCallback(async () => {
    try {
      const res = await fetch(`/api/patient-360/readings?patientId=${patientId}&limit=20`);
      const data = await res.json();
      if (data.success) setReadings(data.data || []);
    } catch (e) {
      console.error("Failed to fetch readings:", e);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/mediconnect/notifications?patientId=${patientId}&limit=5`);
      const data = await res.json();
      if (data.success) setNotifications(data.data || []);
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    }
  }, [patientId]);

  useEffect(() => {
    fetchReadings();
    fetchNotifications();
  }, [fetchReadings, fetchNotifications]);

  const submitReading = async () => {
    if (!recordingType || !recordingValue) return;
    setSubmitting(true);

    try {
      const payload: any = {
        patientId,
        readingType: recordingType,
        value: parseFloat(recordingValue),
        unit: quickReadings.find((r) => r.type === recordingType)?.unit || "",
        source: "patient_self_report",
      };

      // For blood pressure, submit both systolic and diastolic
      if (recordingType === "systolic_bp" && recordingValue2) {
        // Submit systolic
        await fetch("/api/patient-360/readings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        // Submit diastolic
        await fetch("/api/patient-360/readings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            readingType: "diastolic_bp",
            value: parseFloat(recordingValue2),
          }),
        });
      } else {
        await fetch("/api/patient-360/readings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setRecordingType(null);
      setRecordingValue("");
      setRecordingValue2("");
      fetchReadings();
    } catch (e) {
      console.error("Failed to submit reading:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const getLatestReading = (type: string) => {
    return readings.find((r) => r.readingType === type);
  };

  const getTrend = (type: string) => {
    const typeReadings = readings.filter((r) => r.readingType === type);
    if (typeReadings.length < 2) return "stable";
    const latest = typeReadings[0].value;
    const previous = typeReadings[1].value;
    if (latest > previous * 1.05) return "up";
    if (latest < previous * 0.95) return "down";
    return "stable";
  };

  const isNormal = (type: string, value: number) => {
    const config = quickReadings.find((r) => r.type === type);
    if (!config) return true;
    return value >= config.normalMin && value <= config.normalMax;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} دقيقة`;
    if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} ساعة`;
    return date.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
  };

  return (
    <div dir="rtl" className="space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center py-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
          مرحباً{patientName ? ` ${patientName}` : ""} 👋
        </h2>
        <p className="text-sm text-gray-500 mt-1">تابع صحتك يومياً</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: "overview" as const, label: "نظرة عامة", icon: <Activity className="h-4 w-4" /> },
          { id: "record" as const, label: "تسجيل قراءة", icon: <Plus className="h-4 w-4" /> },
          { id: "messages" as const, label: "الرسائل", icon: <MessageSquare className="h-4 w-4" /> },
          { id: "appointments" as const, label: "المواعيد", icon: <Calendar className="h-4 w-4" /> },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeSection === tab.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSection(tab.id)}
            className="flex-shrink-0 gap-1"
          >
            {tab.icon}
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Overview Section */}
      {activeSection === "overview" && (
        <div className="space-y-4">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {quickReadings.map((config) => {
              const latest = getLatestReading(config.type);
              const trend = getTrend(config.type);
              const normal = latest ? isNormal(config.type, latest.value) : true;

              return (
                <Card
                  key={config.type}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    !normal ? "border-red-200 bg-red-50/50 dark:bg-red-950/30" : ""
                  }`}
                  onClick={() => {
                    setRecordingType(config.type);
                    setActiveSection("record");
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`text-${config.color}-500`}>{config.icon}</div>
                      {trend === "up" && <TrendingUp className="h-3 w-3 text-red-500" />}
                      {trend === "down" && <TrendingDown className="h-3 w-3 text-green-500" />}
                      {trend === "stable" && <Minus className="h-3 w-3 text-gray-400" />}
                    </div>
                    <p className="text-xs text-gray-500">{config.label}</p>
                    {latest ? (
                      <>
                        <p className={`text-lg font-bold ${!normal ? "text-red-600" : "text-gray-800 dark:text-white"}`}>
                          {latest.value}
                          <span className="text-xs font-normal text-gray-400 mr-1">{config.unit}</span>
                        </p>
                        <p className="text-[10px] text-gray-400">{formatTime(latest.measuredAt)}</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-300 mt-1">لا توجد قراءة</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Recent Notifications */}
          {notifications.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bell className="h-4 w-4 text-amber-500" />
                  آخر التنبيهات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {notifications.slice(0, 3).map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-2 rounded-lg text-xs flex items-center gap-2 ${
                      notif.severity === "critical"
                        ? "bg-red-50 text-red-700 dark:bg-red-950"
                        : notif.severity === "warning"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950"
                        : "bg-blue-50 text-blue-700 dark:bg-blue-950"
                    }`}
                  >
                    {notif.severity === "critical" ? (
                      <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    ) : (
                      <Bell className="h-3 w-3 flex-shrink-0" />
                    )}
                    <span className="flex-1">{notif.title}</span>
                    <span className="text-[10px] opacity-70">{formatTime(notif.createdAt)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => setActiveSection("record")}
            >
              <Plus className="h-6 w-6 text-blue-500" />
              <span className="text-xs">سجل قراءة</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveSection("messages")}>
              <MessageSquare className="h-6 w-6 text-green-500" />
              <span className="text-xs">راسل طبيبك</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <FileText className="h-6 w-6 text-purple-500" />
              <span className="text-xs">ارفع تحليل</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <Pill className="h-6 w-6 text-amber-500" />
              <span className="text-xs">أدويتي</span>
            </Button>
          </div>
        </div>
      )}

      {/* Record Reading Section */}
      {activeSection === "record" && (
        <div className="space-y-4">
          {!recordingType ? (
            <>
              <h3 className="font-semibold text-center">اختر نوع القراءة</h3>
              <div className="grid grid-cols-2 gap-3">
                {quickReadings.map((config) => (
                  <Card
                    key={config.type}
                    className="cursor-pointer hover:shadow-md transition-all hover:border-blue-300"
                    onClick={() => setRecordingType(config.type)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className={`mx-auto w-12 h-12 rounded-full bg-${config.color}-100 dark:bg-${config.color}-900 flex items-center justify-center text-${config.color}-600 mb-2`}>
                        {config.icon}
                      </div>
                      <p className="font-medium text-sm">{config.label}</p>
                      <p className="text-[10px] text-gray-400">{config.unit}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card className="border-2 border-blue-200">
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <div className={`mx-auto w-16 h-16 rounded-full bg-${quickReadings.find((r) => r.type === recordingType)?.color}-100 flex items-center justify-center mb-3`}>
                    {quickReadings.find((r) => r.type === recordingType)?.icon}
                  </div>
                  <h3 className="font-bold text-lg">
                    {quickReadings.find((r) => r.type === recordingType)?.label}
                  </h3>
                </div>

                {recordingType === "systolic_bp" ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">الضغط الانقباضي (العلوي)</label>
                      <Input
                        type="number"
                        value={recordingValue}
                        onChange={(e) => setRecordingValue(e.target.value)}
                        placeholder="120"
                        className="text-center text-2xl h-14"
                        min={60}
                        max={250}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">الضغط الانبساطي (السفلي)</label>
                      <Input
                        type="number"
                        value={recordingValue2}
                        onChange={(e) => setRecordingValue2(e.target.value)}
                        placeholder="80"
                        className="text-center text-2xl h-14"
                        min={40}
                        max={150}
                      />
                    </div>
                    <p className="text-center text-sm text-gray-500">
                      {recordingValue && recordingValue2 ? `${recordingValue}/${recordingValue2} mmHg` : "أدخل القراءة"}
                    </p>
                  </div>
                ) : (
                  <div>
                    <Input
                      type="number"
                      value={recordingValue}
                      onChange={(e) => setRecordingValue(e.target.value)}
                      placeholder="أدخل القراءة"
                      className="text-center text-3xl h-16"
                      min={quickReadings.find((r) => r.type === recordingType)?.min}
                      max={quickReadings.find((r) => r.type === recordingType)?.max}
                      step={quickReadings.find((r) => r.type === recordingType)?.step}
                    />
                    <p className="text-center text-sm text-gray-400 mt-2">
                      {quickReadings.find((r) => r.type === recordingType)?.unit}
                    </p>
                    {recordingValue && (
                      <div className="text-center mt-2">
                        {isNormal(recordingType, parseFloat(recordingValue)) ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3 ml-1" />
                            ضمن النطاق الطبيعي
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">
                            <AlertTriangle className="h-3 w-3 ml-1" />
                            خارج النطاق الطبيعي
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={submitReading}
                    disabled={!recordingValue || submitting}
                  >
                    {submitting ? (
                      <Clock className="h-4 w-4 animate-spin ml-1" />
                    ) : (
                      <Send className="h-4 w-4 ml-1" />
                    )}
                    تسجيل
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRecordingType(null);
                      setRecordingValue("");
                      setRecordingValue2("");
                    }}
                  >
                    إلغاء
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Readings History */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">آخر القراءات</CardTitle>
            </CardHeader>
            <CardContent>
              {readings.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-4">لا توجد قراءات مسجلة بعد</p>
              ) : (
                <div className="space-y-2">
                  {readings.slice(0, 10).map((reading) => {
                    const config = quickReadings.find((r) => r.type === reading.readingType);
                    const normal = config ? isNormal(reading.readingType as ReadingType, reading.value) : true;
                    return (
                      <div
                        key={reading.id}
                        className={`flex items-center justify-between p-2 rounded-lg ${
                          !normal ? "bg-red-50 dark:bg-red-950/30" : "bg-gray-50 dark:bg-gray-800/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{config?.icon}</span>
                          <div>
                            <p className="text-xs font-medium">{config?.label || reading.readingType}</p>
                            <p className="text-[10px] text-gray-400">{formatTime(reading.measuredAt)}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className={`font-bold text-sm ${!normal ? "text-red-600" : ""}`}>
                            {reading.value} <span className="text-[10px] font-normal text-gray-400">{reading.unit}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Messages Section */}
      {activeSection === "messages" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Stethoscope className="h-12 w-12 mx-auto mb-3 text-blue-500" />
              <h3 className="font-bold">تواصل مع طبيبك</h3>
              <p className="text-sm text-gray-500 mt-2">
                أرسل رسالة أو استفسار لطبيبك المعالج وسيتم الرد عليك في أقرب وقت
              </p>
              <Button className="mt-4 w-full">
                <MessageSquare className="h-4 w-4 ml-1" />
                ابدأ محادثة جديدة
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Appointments Section */}
      {activeSection === "appointments" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <h3 className="font-bold">مواعيدك القادمة</h3>
              <p className="text-sm text-gray-500 mt-2">
                لا توجد مواعيد قادمة حالياً
              </p>
              <Button className="mt-4 w-full" variant="outline">
                <Plus className="h-4 w-4 ml-1" />
                حجز موعد جديد
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
