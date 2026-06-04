"use client";

import * as React from "react";
import { PatientVoiceIntake } from "@/components/patient-context";
import { CheckCircle2 } from "lucide-react";

interface Props {
  patientId: number;
  patientName: string;
}

export function PatientVoiceIntakeTab({ patientId, patientName }: Props) {
  const [savedData, setSavedData] = React.useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = React.useState(false);

  const handleDataExtracted = async (data: any) => {
    setSaving(true);
    try {
      // Save extracted data to patient profile
      const res = await fetch("/api/patient-360", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          action: "save_voice_intake",
          data,
        }),
      });
      if (res.ok) {
        setSavedData(data);
      }
    } catch (err) {
      console.error("Failed to save voice intake data:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="bg-gradient-to-l from-red-50 to-pink-50 border border-red-100 rounded-xl p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-1">التسجيل الصوتي — استقبال المريض</h2>
        <p className="text-sm text-gray-600">
          سجل المحادثة مع المريض أو اتركه يحكي قصته المرضية. الذكاء الطبي سيستخرج تلقائياً:
          الحساسية، الأمراض المزمنة، الأدوية، العمليات، التاريخ العائلي، والعلامات الحيوية.
        </p>
      </div>

      <PatientVoiceIntake
        patientId={patientId}
        patientName={patientName}
        onDataExtracted={handleDataExtracted}
      />

      {savedData && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="text-sm text-green-800 font-medium">
            تم حفظ البيانات المستخرجة في ملف المريض بنجاح
          </span>
        </div>
      )}
    </div>
  );
}
