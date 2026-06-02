"use client";

import * as React from "react";
import { AlertTriangle, Database, User, UserCheck } from "lucide-react";
import { usePatientContext } from "./patient-context-provider";

/**
 * Patient Status Bar — Shows the current data recording mode at the top of any module.
 * Provides visual feedback about where data will be saved.
 */
export function PatientStatusBar() {
  const { mode, patient, getDisplayName } = usePatientContext();

  if (mode === "patient" && patient) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 flex items-center gap-2 mb-4" dir="rtl">
        <UserCheck className="w-4 h-4 text-green-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-green-800 truncate">
            تسجيل لـ: {getDisplayName()}
          </p>
          <p className="text-[10px] text-green-600">
            {patient.mrn && `ملف #${patient.mrn} • `}
            {patient.age} سنة • كل البيانات تُحفظ على ملف المريض
          </p>
        </div>
        <Database className="w-3.5 h-3.5 text-green-500 shrink-0" />
      </div>
    );
  }

  if (mode === "self") {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 flex items-center gap-2 mb-4" dir="rtl">
        <User className="w-4 h-4 text-blue-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-blue-800">
            تتبع شخصي
          </p>
          <p className="text-[10px] text-blue-600">
            البيانات محفوظة على حسابك الشخصي
          </p>
        </div>
        <Database className="w-3.5 h-3.5 text-blue-500 shrink-0" />
      </div>
    );
  }

  // Guest mode
  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 flex items-center gap-2 mb-4" dir="rtl">
      <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-orange-800">
          وضع تجريبي — البيانات لن تُحفظ
        </p>
        <p className="text-[10px] text-orange-600">
          اختر مريض أو فعّل التتبع الشخصي لحفظ البيانات
        </p>
      </div>
    </div>
  );
}
