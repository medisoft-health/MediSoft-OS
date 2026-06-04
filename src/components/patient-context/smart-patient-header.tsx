"use client";

import * as React from "react";
import Image from "next/image";
import {
  Heart,
  Thermometer,
  Activity,
  Droplets,
  AlertTriangle,
  Phone,
  Calendar,
  Shield,
  Pill,
  User,
  Clock,
  TrendingUp,
  Bell,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────
export interface PatientHeaderData {
  id: number;
  mrn: string;
  firstName: string;
  lastName: string;
  firstNameAr?: string | null;
  lastNameAr?: string | null;
  photoUrl?: string | null;
  dateOfBirth: string;
  sex: string;
  bloodType?: string | null;
  phone?: string | null;
  insuranceProvider?: string | null;
  insuranceId?: string | null;
  allergies?: Array<{ substance: string; reaction?: string; severity?: string }> | null;
  chronicConditions?: Array<{ description: string; icdCode?: string }> | null;
  currentMedications?: Array<{ name: string; dose?: string }> | null;
  healthScore?: number | null;
  profileCompleteness?: number | null;
  // Latest vitals
  latestVitals?: {
    bloodPressure?: { systolic: number; diastolic: number; date: string };
    heartRate?: { value: number; date: string };
    temperature?: { value: number; date: string };
    spo2?: { value: number; date: string };
    weight?: { value: number; date: string };
    bloodSugar?: { value: number; context?: string; date: string };
  } | null;
  // Alerts
  activeAlerts?: number;
  lastVisit?: string | null;
}

interface SmartPatientHeaderProps {
  patient: PatientHeaderData;
  onClose?: () => void;
  compact?: boolean;
}

// ─────────────────────────────────────────────────────────────────
//  Helper Functions
// ─────────────────────────────────────────────────────────────────
function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function getHealthScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
  if (score >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
  if (score >= 40) return "text-orange-600 bg-orange-50 border-orange-200";
  return "text-red-600 bg-red-50 border-red-200";
}

function getCompletenessColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

function isVitalAbnormal(type: string, value: number, secondary?: number): boolean {
  switch (type) {
    case "bp":
      return value > 140 || value < 90 || (secondary !== undefined && (secondary > 90 || secondary < 60));
    case "hr":
      return value > 100 || value < 60;
    case "temp":
      return value > 37.5 || value < 36.0;
    case "spo2":
      return value < 95;
    case "sugar":
      return value > 180 || value < 70;
    default:
      return false;
  }
}

// ─────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────
export function SmartPatientHeader({ patient, onClose, compact = false }: SmartPatientHeaderProps) {
  const age = calculateAge(patient.dateOfBirth);
  const sexLabel = patient.sex === "male" ? "ذكر" : patient.sex === "female" ? "أنثى" : patient.sex;
  const hasAllergies = patient.allergies && patient.allergies.length > 0;
  const hasChronicConditions = patient.chronicConditions && patient.chronicConditions.length > 0;

  if (compact) {
    return (
      <div className="w-full bg-gradient-to-l from-blue-50 via-white to-pink-50 border-b border-gray-200 px-4 py-2 flex items-center gap-3 text-sm" dir="rtl">
        {/* Photo */}
        <div className="relative h-8 w-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
          {patient.photoUrl ? (
            <Image src={patient.photoUrl} alt="" fill className="object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold">
              {patient.firstNameAr?.[0] || patient.firstName[0]}
            </div>
          )}
        </div>
        {/* Name + MRN */}
        <span className="font-semibold text-gray-900">
          {patient.firstNameAr || patient.firstName} {patient.lastNameAr || patient.lastName}
        </span>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {patient.mrn}
        </Badge>
        <span className="text-gray-500">{age} سنة • {sexLabel}</span>
        {patient.bloodType && patient.bloodType !== "unknown" && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-red-50 text-red-700">
            <Droplets className="h-2.5 w-2.5 ml-0.5" />
            {patient.bloodType}
          </Badge>
        )}
        {/* Allergies warning */}
        {hasAllergies && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 animate-pulse">
            <AlertTriangle className="h-2.5 w-2.5 ml-0.5" />
            حساسية
          </Badge>
        )}
        {/* Spacer */}
        <div className="flex-1" />
        {/* Health Score */}
        {patient.healthScore != null && (
          <div className={cn("px-2 py-0.5 rounded-full border text-[10px] font-bold", getHealthScoreColor(patient.healthScore))}>
            {patient.healthScore}%
          </div>
        )}
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-l from-blue-50 via-white to-pink-50 border-b-2 border-gray-200 shadow-sm" dir="rtl">
      {/* Row 1: Patient Identity */}
      <div className="px-4 py-3 flex items-center gap-4">
        {/* Photo */}
        <div className="relative h-14 w-14 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 ring-2 ring-white shadow-md">
          {patient.photoUrl ? (
            <Image src={patient.photoUrl} alt="" fill className="object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg font-bold">
              {patient.firstNameAr?.[0] || patient.firstName[0]}
              {patient.lastNameAr?.[1] || patient.lastName[0]}
            </div>
          )}
        </div>

        {/* Name + Demographics */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-gray-900 truncate">
              {patient.firstNameAr || patient.firstName} {patient.lastNameAr || patient.lastName}
            </h2>
            <Badge variant="outline" className="text-xs px-2 py-0.5 font-mono">
              {patient.mrn}
            </Badge>
            {patient.bloodType && patient.bloodType !== "unknown" && (
              <Badge className="text-xs px-2 py-0.5 bg-red-50 text-red-700 border border-red-200">
                <Droplets className="h-3 w-3 ml-1" />
                {patient.bloodType}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 flex-wrap">
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {age} سنة • {sexLabel}
            </span>
            {patient.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                <span dir="ltr">{patient.phone}</span>
              </span>
            )}
            {patient.insuranceProvider && (
              <span className="flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" />
                {patient.insuranceProvider}
                {patient.insuranceId && <span className="text-xs text-gray-400">({patient.insuranceId})</span>}
              </span>
            )}
            {patient.lastVisit && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                آخر زيارة: {new Date(patient.lastVisit).toLocaleDateString("ar-SA")}
              </span>
            )}
          </div>
        </div>

        {/* Health Score + Completeness */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {patient.healthScore != null && (
            <div className={cn("flex flex-col items-center px-3 py-1.5 rounded-lg border", getHealthScoreColor(patient.healthScore))}>
              <span className="text-[10px] font-medium">Health Score</span>
              <span className="text-xl font-bold">{patient.healthScore}</span>
            </div>
          )}
          {patient.profileCompleteness != null && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-gray-500">اكتمال الملف</span>
              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", getCompletenessColor(patient.profileCompleteness))}
                  style={{ width: `${patient.profileCompleteness}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-500">{patient.profileCompleteness}%</span>
            </div>
          )}
          {patient.activeAlerts != null && patient.activeAlerts > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded-lg">
              <Bell className="h-4 w-4 text-red-600 animate-pulse" />
              <span className="text-sm font-bold text-red-700">{patient.activeAlerts}</span>
            </div>
          )}
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Critical Info (Allergies + Chronic + Vitals) */}
      <div className="px-4 pb-3 flex items-center gap-3 overflow-x-auto scrollbar-hide flex-wrap">
        {/* Allergies */}
        {hasAllergies && (
          <div className="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded-md">
            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
            <span className="text-xs font-medium text-red-800">حساسية:</span>
            {patient.allergies!.slice(0, 3).map((a, i) => (
              <Badge key={i} variant="destructive" className="text-[10px] px-1.5 py-0">
                {a.substance}
              </Badge>
            ))}
            {patient.allergies!.length > 3 && (
              <span className="text-[10px] text-red-600">+{patient.allergies!.length - 3}</span>
            )}
          </div>
        )}

        {/* Chronic Conditions */}
        {hasChronicConditions && (
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded-md">
            <Activity className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs font-medium text-amber-800">مزمن:</span>
            {patient.chronicConditions!.slice(0, 3).map((c, i) => (
              <Badge key={i} className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-300">
                {c.description}
              </Badge>
            ))}
            {patient.chronicConditions!.length > 3 && (
              <span className="text-[10px] text-amber-600">+{patient.chronicConditions!.length - 3}</span>
            )}
          </div>
        )}

        {/* Current Medications */}
        {patient.currentMedications && patient.currentMedications.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 border border-purple-200 rounded-md">
            <Pill className="h-3.5 w-3.5 text-purple-600" />
            <span className="text-xs font-medium text-purple-800">أدوية:</span>
            {patient.currentMedications.slice(0, 2).map((m, i) => (
              <Badge key={i} className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-800 border-purple-300">
                {m.name} {m.dose && `(${m.dose})`}
              </Badge>
            ))}
            {patient.currentMedications.length > 2 && (
              <span className="text-[10px] text-purple-600">+{patient.currentMedications.length - 2}</span>
            )}
          </div>
        )}

        {/* Latest Vitals */}
        {patient.latestVitals && (
          <>
            {patient.latestVitals.bloodPressure && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md border text-xs",
                isVitalAbnormal("bp", patient.latestVitals.bloodPressure.systolic, patient.latestVitals.bloodPressure.diastolic)
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-gray-50 border-gray-200 text-gray-700"
              )}>
                <TrendingUp className="h-3 w-3" />
                <span className="font-medium">BP:</span>
                <span dir="ltr">{patient.latestVitals.bloodPressure.systolic}/{patient.latestVitals.bloodPressure.diastolic}</span>
              </div>
            )}
            {patient.latestVitals.heartRate && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md border text-xs",
                isVitalAbnormal("hr", patient.latestVitals.heartRate.value)
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-gray-50 border-gray-200 text-gray-700"
              )}>
                <Heart className="h-3 w-3" />
                <span className="font-medium">HR:</span>
                <span>{patient.latestVitals.heartRate.value} bpm</span>
              </div>
            )}
            {patient.latestVitals.temperature && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md border text-xs",
                isVitalAbnormal("temp", patient.latestVitals.temperature.value)
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-gray-50 border-gray-200 text-gray-700"
              )}>
                <Thermometer className="h-3 w-3" />
                <span className="font-medium">Temp:</span>
                <span>{patient.latestVitals.temperature.value}°C</span>
              </div>
            )}
            {patient.latestVitals.spo2 && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md border text-xs",
                isVitalAbnormal("spo2", patient.latestVitals.spo2.value)
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-gray-50 border-gray-200 text-gray-700"
              )}>
                <Droplets className="h-3 w-3" />
                <span className="font-medium">SpO₂:</span>
                <span>{patient.latestVitals.spo2.value}%</span>
              </div>
            )}
            {patient.latestVitals.bloodSugar && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md border text-xs",
                isVitalAbnormal("sugar", patient.latestVitals.bloodSugar.value)
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-gray-50 border-gray-200 text-gray-700"
              )}>
                <Activity className="h-3 w-3" />
                <span className="font-medium">Sugar:</span>
                <span>{patient.latestVitals.bloodSugar.value} mg/dL</span>
                {patient.latestVitals.bloodSugar.context && (
                  <span className="text-[10px] text-gray-500">({patient.latestVitals.bloodSugar.context === "fasting" ? "صائم" : "بعد الأكل"})</span>
                )}
              </div>
            )}
          </>
        )}

        {/* Last updated */}
        <div className="flex items-center gap-1 text-[10px] text-gray-400 mr-auto">
          <Clock className="h-3 w-3" />
          <span>آخر تحديث: {new Date().toLocaleDateString("ar-SA")}</span>
        </div>
      </div>
    </div>
  );
}
