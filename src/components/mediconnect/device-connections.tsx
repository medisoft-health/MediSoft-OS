"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Watch,
  Smartphone,
  Bluetooth,
  Wifi,
  WifiOff,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Heart,
  Droplets,
  Thermometer,
  Scale,
  Footprints,
  Moon,
  Zap,
} from "lucide-react";

interface DeviceConnection {
  id: string;
  patientId: number;
  deviceType: string;
  deviceName: string | null;
  deviceModel: string | null;
  connectionStatus: string;
  dataTypes: string[];
  lastSyncAt: string | null;
  createdAt: string;
}

interface AvailableDevice {
  type: string;
  name: string;
  nameAr: string;
  icon: string;
  description: string;
  descriptionAr: string;
  dataTypes: string[];
  requiresOAuth: boolean;
}

interface DeviceConnectionsProps {
  patientId: number;
}

export function DeviceConnections({ patientId }: DeviceConnectionsProps) {
  const [devices, setDevices] = useState<DeviceConnection[]>([]);
  const [available, setAvailable] = useState<AvailableDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    try {
      const [devRes, availRes] = await Promise.all([
        fetch(`/api/mediconnect/devices?patientId=${patientId}&action=list`),
        fetch(`/api/mediconnect/devices?patientId=${patientId}&action=available`),
      ]);
      const devData = await devRes.json();
      const availData = await availRes.json();
      if (devData.success) setDevices(devData.data);
      if (availData.success) setAvailable(availData.data);
    } catch (e) {
      console.error("Failed to fetch devices:", e);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const connectDevice = async (deviceType: string) => {
    setConnecting(deviceType);
    try {
      const device = available.find((d) => d.type === deviceType);
      const res = await fetch("/api/mediconnect/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect",
          patientId,
          deviceType,
          deviceName: device?.nameAr || device?.name,
          dataTypes: device?.dataTypes || [],
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchDevices();
        setShowAdd(false);
      }
    } catch (e) {
      console.error("Failed to connect device:", e);
    } finally {
      setConnecting(null);
    }
  };

  const disconnectDevice = async (deviceId: string) => {
    try {
      await fetch("/api/mediconnect/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", deviceId }),
      });
      fetchDevices();
    } catch (e) {
      console.error("Failed to disconnect:", e);
    }
  };

  const getDeviceIcon = (type: string) => {
    if (type.includes("apple") || type.includes("samsung") || type.includes("fitbit") || type.includes("garmin")) {
      return <Watch className="h-6 w-6" />;
    }
    if (type.includes("bluetooth")) return <Bluetooth className="h-6 w-6" />;
    if (type.includes("withings")) return <Scale className="h-6 w-6" />;
    return <Smartphone className="h-6 w-6" />;
  };

  const getDataTypeIcon = (type: string) => {
    switch (type) {
      case "heart_rate": return <Heart className="h-3 w-3 text-red-500" />;
      case "blood_pressure": return <Activity className="h-3 w-3 text-blue-500" />;
      case "glucose": return <Droplets className="h-3 w-3 text-purple-500" />;
      case "spo2": return <Zap className="h-3 w-3 text-cyan-500" />;
      case "weight": return <Scale className="h-3 w-3 text-green-500" />;
      case "steps": return <Footprints className="h-3 w-3 text-orange-500" />;
      case "sleep": return <Moon className="h-3 w-3 text-indigo-500" />;
      case "temperature": return <Thermometer className="h-3 w-3 text-amber-500" />;
      default: return <Activity className="h-3 w-3 text-gray-500" />;
    }
  };

  const getDataTypeName = (type: string) => {
    const names: Record<string, string> = {
      heart_rate: "النبض",
      blood_pressure: "الضغط",
      glucose: "السكر",
      spo2: "الأكسجين",
      weight: "الوزن",
      steps: "الخطوات",
      sleep: "النوم",
      temperature: "الحرارة",
      ecg: "ECG",
      stress: "التوتر",
    };
    return names[type] || type;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle className="h-3 w-3 ml-1" />متصل</Badge>;
      case "pending":
        return <Badge className="bg-amber-100 text-amber-700 text-xs"><Clock className="h-3 w-3 ml-1" />في الانتظار</Badge>;
      case "disconnected":
        return <Badge className="bg-gray-100 text-gray-700 text-xs"><XCircle className="h-3 w-3 ml-1" />غير متصل</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-700 text-xs"><XCircle className="h-3 w-3 ml-1" />خطأ</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return "لم تتم المزامنة بعد";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return "الآن";
    if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} دقيقة`;
    if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} ساعة`;
    return date.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
  };

  return (
    <Card dir="rtl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Watch className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">الأجهزة المتصلة</CardTitle>
            <Badge variant="outline" className="text-xs">{devices.filter((d) => d.connectionStatus === "connected").length} متصل</Badge>
          </div>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4 ml-1" />
            ربط جهاز
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add Device Panel */}
        {showAdd && (
          <div className="p-4 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 dark:bg-blue-950/50">
            <h4 className="font-semibold text-sm mb-3">اختر جهاز للربط</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {available
                .filter((a) => !devices.some((d) => d.deviceType === a.type && d.connectionStatus === "connected"))
                .map((device) => (
                  <div
                    key={device.type}
                    className="p-3 rounded-lg border bg-white dark:bg-gray-900 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => connectDevice(device.type)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center text-blue-600">
                        {getDeviceIcon(device.type)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{device.nameAr}</p>
                        <p className="text-[11px] text-gray-500">{device.descriptionAr}</p>
                      </div>
                      {connecting === device.type ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                      ) : (
                        <Plus className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {device.dataTypes.slice(0, 4).map((dt) => (
                        <Badge key={dt} variant="outline" className="text-[9px] px-1 py-0">
                          {getDataTypeIcon(dt)} {getDataTypeName(dt)}
                        </Badge>
                      ))}
                      {device.dataTypes.length > 4 && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0">+{device.dataTypes.length - 4}</Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Connected Devices */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
        ) : devices.length === 0 ? (
          <div className="text-center py-8">
            <WifiOff className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">لا توجد أجهزة متصلة</p>
            <p className="text-sm text-gray-400 mt-1">اربط ساعتك الذكية أو جهاز قياس لمتابعة صحتك تلقائياً</p>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div
                key={device.id}
                className={`p-4 rounded-xl border transition-all ${
                  device.connectionStatus === "connected"
                    ? "border-green-200 bg-green-50/30 dark:bg-green-950/30"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      device.connectionStatus === "connected"
                        ? "bg-green-100 text-green-600 dark:bg-green-900"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                    }`}>
                      {getDeviceIcon(device.deviceType)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{device.deviceName || device.deviceType}</p>
                        {getStatusBadge(device.connectionStatus)}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {device.deviceModel || device.deviceType} • آخر مزامنة: {formatLastSync(device.lastSyncAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" title="مزامنة الآن">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => disconnectDevice(device.id)}
                      title="قطع الاتصال"
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Data Types */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {device.dataTypes.map((dt) => (
                    <Badge key={dt} variant="outline" className="text-xs gap-1">
                      {getDataTypeIcon(dt)}
                      {getDataTypeName(dt)}
                    </Badge>
                  ))}
                </div>

                {/* Connection Status Indicator */}
                {device.connectionStatus === "connected" && (
                  <div className="flex items-center gap-1 mt-2">
                    <Wifi className="h-3 w-3 text-green-500" />
                    <span className="text-[11px] text-green-600">متصل ويتم المزامنة تلقائياً</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info Card */}
        <div className="p-3 rounded-lg bg-gradient-to-l from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border border-blue-100 dark:border-blue-800">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <strong>💡 كيف يعمل:</strong> بمجرد ربط جهازك، يتم مزامنة القراءات تلقائياً مع ملفك الطبي.
            لو أي قراءة خارج النطاق الطبيعي، يتم إرسال تنبيه فوري لك ولطبيبك.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
