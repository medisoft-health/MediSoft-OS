"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import {
  Brain,
  Heart,
  Users,
  Zap,
  Pill,
  Stethoscope,
  Activity,
  Sparkles,
} from "lucide-react";
import { ZeroClickInsights } from "@/components/clinical/zero-click-insights";
import { PatientHealthReportView } from "@/components/patient-context/patient-health-report";
import { CollectiveIntelligenceDashboard } from "@/components/analytics/collective-intelligence-dashboard";
import { AthletePredictionPanel } from "@/components/medisport/athlete-prediction-panel";
import { SmartPharmacyPanel } from "@/components/pharmacy/smart-pharmacy-panel";
import { AmbientClinicalPanel } from "@/components/clinical/ambient-clinical-panel";
import { PredictiveHealthPanel } from "@/components/clinical/predictive-health-panel";

const features = [
  {
    id: "zero-click",
    icon: Brain,
    color: "from-blue-500 to-indigo-500",
    titleAr: "الذكاء السريري الاستباقي",
    titleEn: "Zero-Click Intelligence",
    descAr: "تنبيهات ذكية تظهر تلقائياً عند فتح ملف المريض",
    descEn: "Smart alerts appear automatically when opening patient file",
  },
  {
    id: "patient-report",
    icon: Heart,
    color: "from-pink-500 to-rose-500",
    titleAr: "تقرير المريض البصري",
    titleEn: "Patient Health Report",
    descAr: "تقارير صحية بصرية بأسلوب Spotify Wrapped",
    descEn: "Visual health reports in Spotify Wrapped style",
  },
  {
    id: "collective",
    icon: Users,
    color: "from-purple-500 to-violet-500",
    titleAr: "الذكاء الطبي الجماعي",
    titleEn: "Collective Intelligence",
    descAr: "رؤى مجهولة الهوية من بيانات جميع المرضى",
    descEn: "Anonymized insights from all patient data",
  },
  {
    id: "athlete",
    icon: Zap,
    color: "from-orange-500 to-amber-500",
    titleAr: "التنبؤ بأداء الرياضي",
    titleEn: "Athlete Prediction",
    descAr: "ACWR + خطر الإصابة + التعافي + التغذية",
    descEn: "ACWR + Injury Risk + Recovery + Nutrition",
  },
  {
    id: "pharmacy",
    icon: Pill,
    color: "from-teal-500 to-emerald-500",
    titleAr: "شبكة الصيدليات الذكية",
    titleEn: "Smart Pharmacy",
    descAr: "ربط الوصفة الطبية بأقرب صيدلية بأفضل سعر",
    descEn: "Connect prescription to nearest pharmacy at best price",
  },
  {
    id: "ambient",
    icon: Stethoscope,
    color: "from-violet-500 to-purple-500",
    titleAr: "العيادة بلا جدران",
    titleEn: "Ambient Clinical",
    descAr: "توثيق سريري تلقائي من المحادثة",
    descEn: "Auto clinical documentation from conversation",
  },
  {
    id: "predictive",
    icon: Activity,
    color: "from-emerald-500 to-teal-500",
    titleAr: "الصحة التنبؤية",
    titleEn: "Predictive Health",
    descAr: "تنبؤ بالمخاطر + خطة وقائية + أهداف الأجهزة",
    descEn: "Risk prediction + Prevention plan + Wearable goals",
  },
];

export default function InnovationPage() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Hero */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 mb-4">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            {isAr ? "ميزات ثورية جديدة" : "Revolutionary New Features"}
          </span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {isAr ? "مركز الابتكار" : "Innovation Hub"}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-2xl mx-auto">
          {isAr
            ? "7 ميزات ثورية تحول MediSoft من نظام طبي إلى رفيق صحي ذكي — للطبيب والمريض والرياضي"
            : "7 revolutionary features transforming MediSoft from a medical system to an intelligent health companion"}
        </p>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          const isActive = activeFeature === feature.id;
          return (
            <button
              key={feature.id}
              onClick={() => setActiveFeature(isActive ? null : feature.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                isActive
                  ? "border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-800 shadow-lg"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md"
              }`}
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center mb-3`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                {isAr ? feature.titleAr : feature.titleEn}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {isAr ? feature.descAr : feature.descEn}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Feature Panel */}
      {activeFeature && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900 shadow-lg">
          {activeFeature === "zero-click" && <ZeroClickInsights patientId={1} />}
          {activeFeature === "patient-report" && <PatientHealthReportView patientId={1} />}
          {activeFeature === "collective" && <CollectiveIntelligenceDashboard />}
          {activeFeature === "athlete" && <AthletePredictionPanel />}
          {activeFeature === "pharmacy" && <SmartPharmacyPanel />}
          {activeFeature === "ambient" && <AmbientClinicalPanel />}
          {activeFeature === "predictive" && <PredictiveHealthPanel />}
        </div>
      )}
    </div>
  );
}
