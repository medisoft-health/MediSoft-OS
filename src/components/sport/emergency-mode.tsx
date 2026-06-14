"use client";
import { useState, useEffect } from "react";

interface EmergencyAlert {
  id: string;
  severity: "critical" | "warning";
  marker: string;
  markerAr: string;
  value: number;
  unit: string;
  threshold: string;
  message: string;
  messageAr: string;
  action: string;
  actionAr: string;
}

interface EmergencyModeProps {
  onDismiss?: () => void;
}

// Critical thresholds that trigger emergency mode
const CRITICAL_THRESHOLDS = [
  { marker: "blood_pressure_systolic", name: "ضغط الدم الانقباضي", threshold: 180, direction: "above", unit: "mmHg", message: "ضغط الدم مرتفع بشكل خطير", action: "توقف عن أي نشاط بدني فوراً وتوجه لأقرب طوارئ" },
  { marker: "blood_pressure_diastolic", name: "ضغط الدم الانبساطي", threshold: 120, direction: "above", unit: "mmHg", message: "ضغط الدم الانبساطي في مستوى خطير", action: "لا تتمرن — استشر طبيبك فوراً" },
  { marker: "heart_rate_resting", name: "معدل ضربات القلب", threshold: 120, direction: "above", unit: "bpm", message: "معدل ضربات القلب مرتفع جداً أثناء الراحة", action: "توقف عن أي مجهود واجلس في مكان هادئ" },
  { marker: "blood_glucose", name: "سكر الدم", threshold: 300, direction: "above", unit: "mg/dL", message: "سكر الدم مرتفع بشكل خطير", action: "لا تتمرن — تواصل مع طبيبك فوراً" },
  { marker: "blood_glucose", name: "سكر الدم", threshold: 54, direction: "below", unit: "mg/dL", message: "سكر الدم منخفض بشكل خطير", action: "تناول سكريات سريعة فوراً (عصير، حلوى) ولا تتمرن" },
  { marker: "hemoglobin", name: "الهيموجلوبين", threshold: 7, direction: "below", unit: "g/dL", message: "فقر دم حاد — خطر على القلب", action: "ممنوع التمرين نهائياً حتى العلاج — توجه للمستشفى" },
  { marker: "potassium", name: "البوتاسيوم", threshold: 6, direction: "above", unit: "mEq/L", message: "ارتفاع خطير في البوتاسيوم — خطر على القلب", action: "توقف عن التمرين فوراً — توجه للطوارئ" },
  { marker: "potassium", name: "البوتاسيوم", threshold: 2.5, direction: "below", unit: "mEq/L", message: "انخفاض خطير في البوتاسيوم — خطر تشنجات", action: "لا تتمرن — استشر طبيبك فوراً" },
  { marker: "chest_pain", name: "ألم في الصدر", threshold: 1, direction: "above", unit: "", message: "ألم في الصدر أثناء أو بعد التمرين", action: "توقف فوراً — اتصل بالإسعاف إذا استمر الألم" },
  { marker: "creatinine", name: "الكرياتينين", threshold: 4, direction: "above", unit: "mg/dL", message: "قصور كلوي حاد — خطر على الجسم", action: "ممنوع التمرين — توجه للمستشفى فوراً" },
];

export default function EmergencyMode({ onDismiss }: EmergencyModeProps) {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [visible, setVisible] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    checkEmergency();
  }, []);

  const checkEmergency = async () => {
    try {
      const res = await fetch("/api/sport/journey?action=emergency-check");
      const data = await res.json();
      if (data.alerts && data.alerts.length > 0) {
        setAlerts(data.alerts);
        setVisible(true);
      }
    } catch {}
  };

  const acknowledge = async () => {
    setAcknowledged(true);
    try {
      await fetch("/api/sport/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "acknowledge-emergency", alertIds: alerts.map(a => a.id) }),
      });
    } catch {}
    setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 500);
  };

  if (!visible || alerts.length === 0) return null;

  const hasCritical = alerts.some(a => a.severity === "critical");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Red pulsing backdrop */}
      <div className={`absolute inset-0 ${hasCritical ? "bg-red-900/95 animate-pulse-slow" : "bg-amber-900/90"}`} />
      
      {/* Content */}
      <div className="relative z-10 max-w-md w-full space-y-4">
        {/* Emergency Icon */}
        <div className="text-center">
          <div className={`inline-flex w-24 h-24 rounded-full items-center justify-center ${
            hasCritical ? "bg-red-600 animate-bounce" : "bg-amber-600"
          }`}>
            <span className="text-5xl">🚨</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-3xl font-black text-white mb-2">
            {hasCritical ? "وضع الطوارئ" : "تنبيه صحي"}
          </h1>
          <p className="text-red-200 text-lg">
            {hasCritical 
              ? "تم إيقاف جميع التمارين — بياناتك تحتاج مراجعة طبية فورية"
              : "بياناتك تحتاج انتباه — يرجى مراجعة التنبيهات"
            }
          </p>
        </div>

        {/* Alert Cards */}
        <div className="space-y-3 max-h-[40vh] overflow-y-auto">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`rounded-xl p-4 border-2 ${
                alert.severity === "critical"
                  ? "bg-red-950/80 border-red-500"
                  : "bg-amber-950/80 border-amber-500"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <p className="font-bold text-white text-lg">{alert.markerAr}</p>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  alert.severity === "critical" ? "bg-red-600 text-white" : "bg-amber-600 text-white"
                }`}>
                  {alert.severity === "critical" ? "حرج" : "تحذير"}
                </span>
              </div>
              <p className="text-red-200 text-sm mb-2">{alert.messageAr}</p>
              <div className="bg-black/30 rounded-lg p-2">
                <p className="text-white text-sm font-medium">⚡ {alert.actionAr}</p>
              </div>
              {alert.value && (
                <p className="text-red-300/70 text-xs mt-2">
                  القراءة: {alert.value} {alert.unit} (الحد: {alert.threshold})
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Emergency Contacts */}
        <div className="bg-white/10 rounded-xl p-4 backdrop-blur">
          <p className="text-white font-bold mb-2">📞 أرقام الطوارئ:</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <a href="tel:911" className="bg-red-600 text-white rounded-lg p-2 text-center font-bold">
              🚑 911
            </a>
            <a href="tel:997" className="bg-red-600 text-white rounded-lg p-2 text-center font-bold">
              🏥 997 (السعودية)
            </a>
          </div>
        </div>

        {/* Acknowledge Button */}
        <button
          onClick={acknowledge}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            acknowledged
              ? "bg-gray-600 text-gray-300"
              : "bg-white text-red-900 hover:bg-gray-100"
          }`}
          disabled={acknowledged}
        >
          {acknowledged ? "✓ تم الاطلاع" : "فهمت — سأراجع طبيبي"}
        </button>

        {/* Disclaimer */}
        <p className="text-red-200/50 text-xs text-center">
          ⚕️ MediSport Medical Intelligence — هذا التنبيه مبني على بياناتك المسجلة.
          لا يغني عن الاستشارة الطبية المباشرة.
        </p>
      </div>

      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 0.85; }
        }
        .animate-pulse-slow { animation: pulse-slow 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
