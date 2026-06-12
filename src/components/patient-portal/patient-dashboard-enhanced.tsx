"use client";

import * as React from "react";
import {
  Calendar,
  FlaskConical,
  Pill,
  MessageSquare,
  Shield,
  ChevronRight,
  Bell,
  FileText,
  Activity,
} from "lucide-react";
import {
  LabResultVisual,
  HealthSummaryCard,
} from "@/components/ui/patient-infographic";
import { FadeIn, StaggeredList } from "@/components/ui/micro-interactions";

/**
 * Enhanced Patient Portal Dashboard — Beautiful, patient-friendly interface
 * with glassmorphism design, infographics, and clear health communication.
 *
 * Features:
 * - Health overview with traffic-light status
 * - Lab results as visual infographics
 * - Appointment timeline
 * - Medication reminders with visual cues
 * - Privacy assurance messaging
 * - Responsive and accessible
 */

// Demo data for the patient portal
const demoPatient = {
  name: "Ahmed Al-Rashidi",
  overallStatus: "good" as const,
  metrics: [
    { label: "Blood Pressure", value: "125/82", status: "normal" as const },
    { label: "Heart Rate", value: "72 bpm", status: "normal" as const },
    { label: "Blood Sugar", value: "145 mg/dL", status: "borderline" as const },
    { label: "Cholesterol", value: "220 mg/dL", status: "high" as const },
    { label: "BMI", value: "26.4", status: "borderline" as const },
    { label: "HbA1c", value: "6.2%", status: "borderline" as const },
  ],
  lastVisit: "May 28, 2026",
  nextAppointment: "Jun 15, 2026",
};

const demoLabResults = [
  {
    name: "Total Cholesterol",
    nameAr: "الكوليسترول الكلي",
    value: 220,
    unit: "mg/dL",
    normalRange: [0, 200] as [number, number],
    borderlineRange: [200, 240] as [number, number],
    criticalRange: [0, 300] as [number, number],
    previousValue: 235,
    date: "May 28, 2026",
    description:
      "Your cholesterol is slightly above normal but improving from last visit. Continue with your current diet and exercise plan.",
    descriptionAr:
      "الكوليسترول أعلى قليلاً من الطبيعي لكنه يتحسن عن الزيارة السابقة. استمر في نظامك الغذائي والرياضي الحالي.",
  },
  {
    name: "Fasting Blood Sugar",
    nameAr: "سكر الدم صائم",
    value: 145,
    unit: "mg/dL",
    normalRange: [70, 100] as [number, number],
    borderlineRange: [100, 126] as [number, number],
    criticalRange: [0, 300] as [number, number],
    previousValue: 160,
    date: "May 28, 2026",
    description:
      "Your blood sugar is elevated but has improved significantly. Your medication and lifestyle changes are working.",
    descriptionAr:
      "مستوى السكر مرتفع لكنه تحسن بشكل ملحوظ. الأدوية وتغييرات نمط الحياة تعمل بشكل جيد.",
  },
  {
    name: "Hemoglobin",
    nameAr: "الهيموجلوبين",
    value: 14.2,
    unit: "g/dL",
    normalRange: [13.5, 17.5] as [number, number],
    criticalRange: [7, 20] as [number, number],
    previousValue: 13.8,
    date: "May 28, 2026",
    description:
      "Your hemoglobin is within the normal range. This means your blood is carrying oxygen well.",
    descriptionAr:
      "الهيموجلوبين في المعدل الطبيعي. هذا يعني أن دمك ينقل الأكسجين بشكل جيد.",
  },
];

const demoMedications = [
  {
    name: "Metformin",
    dose: "500mg",
    frequency: "Twice daily",
    nextDose: "8:00 PM today",
    purpose: "Blood sugar control",
  },
  {
    name: "Atorvastatin",
    dose: "20mg",
    frequency: "Once daily (evening)",
    nextDose: "10:00 PM today",
    purpose: "Cholesterol management",
  },
  {
    name: "Lisinopril",
    dose: "10mg",
    frequency: "Once daily (morning)",
    nextDose: "8:00 AM tomorrow",
    purpose: "Blood pressure control",
  },
];

const demoAppointments = [
  {
    date: "Jun 15, 2026",
    time: "10:30 AM",
    doctor: "Dr. Sarah Ahmed",
    type: "Follow-up",
    department: "Internal Medicine",
  },
  {
    date: "Jun 22, 2026",
    time: "9:00 AM",
    doctor: "Lab",
    type: "Blood Work",
    department: "MediLab",
  },
];

export function PatientDashboardEnhanced() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome Header */}
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Welcome back, Ahmed
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Here&apos;s your health overview
              </p>
            </div>
            <button className="relative flex size-10 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <Bell className="size-5 text-slate-600 dark:text-slate-300" />
              <span className="absolute -top-1 -end-1 size-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                2
              </span>
            </button>
          </div>
        </FadeIn>

        {/* Health Summary Card (Glassmorphism) */}
        <FadeIn delay={100}>
          <HealthSummaryCard
            patientName={demoPatient.name}
            overallStatus={demoPatient.overallStatus}
            metrics={demoPatient.metrics}
            lastVisit={demoPatient.lastVisit}
            nextAppointment={demoPatient.nextAppointment}
          />
        </FadeIn>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lab Results — Infographics */}
          <div className="lg:col-span-2 space-y-4">
            <FadeIn delay={200}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FlaskConical className="size-5 text-blue-600" />
                  Lab Results
                </h2>
                <button className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1">
                  View All <ChevronRight className="size-3" />
                </button>
              </div>
            </FadeIn>

            <StaggeredList staggerDelay={100} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {demoLabResults.map((result, i) => (
                <LabResultVisual key={i} {...result} />
              ))}
            </StaggeredList>
          </div>

          {/* Right Column — Medications & Appointments */}
          <div className="space-y-4">
            {/* Medications */}
            <FadeIn delay={300}>
              <div className="rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <Pill className="size-4 text-purple-600" />
                  Medications
                </h3>
                <div className="space-y-3">
                  {demoMedications.map((med, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
                    >
                      <div className="size-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Pill className="size-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {med.name} {med.dose}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {med.frequency}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="text-[10px] text-slate-400">Next dose</p>
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          {med.nextDose}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            {/* Upcoming Appointments */}
            <FadeIn delay={400}>
              <div className="rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <Calendar className="size-4 text-emerald-600" />
                  Upcoming Appointments
                </h3>
                <div className="space-y-3">
                  {demoAppointments.map((apt, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
                    >
                      <div className="size-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Calendar className="size-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {apt.type}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {apt.doctor} • {apt.department}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                          {apt.date}
                        </p>
                        <p className="text-[10px] text-slate-400">{apt.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            {/* Quick Actions */}
            <FadeIn delay={500}>
              <div className="grid grid-cols-2 gap-2">
                <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all hover:-translate-y-0.5">
                  <MessageSquare className="size-5 text-blue-600" />
                  <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                    Message Doctor
                  </span>
                </button>
                <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all hover:-translate-y-0.5">
                  <FileText className="size-5 text-emerald-600" />
                  <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                    My Reports
                  </span>
                </button>
                <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all hover:-translate-y-0.5">
                  <Activity className="size-5 text-purple-600" />
                  <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                    Health Trends
                  </span>
                </button>
                <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all hover:-translate-y-0.5">
                  <Shield className="size-5 text-amber-600" />
                  <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                    Insurance
                  </span>
                </button>
              </div>
            </FadeIn>
          </div>
        </div>

        {/* Privacy Footer */}
        <FadeIn delay={600}>
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-400 dark:text-slate-500">
            <Shield className="size-3.5" />
            <span>
              Your health data is encrypted, HIPAA compliant, and never shared without your consent.
            </span>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
