"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Users,
  Calendar,
  Activity,
  Clock,
  ChevronRight,
  Mic,
  Pill,
  FlaskConical,
  ScanLine,
  AlertTriangle,
  Heart,
  Thermometer,
  Droplets,
  Wind,
} from "lucide-react";
import { useAdaptiveContext } from "@/components/ui/adaptive-context";
import { SmartClinicalCard } from "@/components/ui/smart-clinical-card";
import { FadeIn, StaggeredList, ProcessingIndicator } from "@/components/ui/micro-interactions";

/**
 * Enhanced Dashboard — Adaptive, context-aware clinical dashboard.
 *
 * Features:
 * - Context-aware layout (Emergency/Routine/Sport/Radiology)
 * - Smart Clinical Cards with micro-interactions
 * - Staggered animations for smooth loading
 * - Dark mode support
 * - Quick module access with branded logos
 */

// Demo stats
const todayStats = [
  { label: "Patients Today", value: "12", change: "+3", icon: Users, color: "blue" },
  { label: "Appointments", value: "8", change: "2 left", icon: Calendar, color: "emerald" },
  { label: "Pending Labs", value: "5", change: "urgent: 1", icon: FlaskConical, color: "purple" },
  { label: "Avg Wait Time", value: "14m", change: "-2m", icon: Clock, color: "amber" },
];

// Demo vitals for emergency context
const emergencyVitals = [
  { label: "Heart Rate", value: "112", unit: "bpm", status: "high" as const, icon: Heart },
  { label: "Blood Pressure", value: "165/95", unit: "mmHg", status: "critical" as const, icon: Activity },
  { label: "Temperature", value: "38.7", unit: "°C", status: "high" as const, icon: Thermometer },
  { label: "SpO2", value: "94", unit: "%", status: "borderline" as const, icon: Droplets },
  { label: "Resp Rate", value: "24", unit: "/min", status: "high" as const, icon: Wind },
];

// Demo upcoming patients
const upcomingPatients = [
  { name: "Ahmed Al-Rashidi", time: "10:30 AM", reason: "Follow-up DM2", status: "waiting" },
  { name: "Fatima Hassan", time: "11:00 AM", reason: "Chest pain evaluation", status: "scheduled" },
  { name: "Omar Khalil", time: "11:30 AM", reason: "Post-op check", status: "scheduled" },
  { name: "Sara Mohammed", time: "12:00 PM", reason: "Lab review", status: "scheduled" },
];

// Clinical modules quick access
const clinicalModules = [
  { key: "mediscript", label: "MediScript", description: "Voice → SOAP Notes", icon: Mic, href: "/mediscript", color: "from-pink-500 to-rose-600" },
  { key: "pharmax", label: "PharmaX", description: "Drug Safety Check", icon: Pill, href: "/pharmax", color: "from-purple-500 to-indigo-600" },
  { key: "medilab", label: "MediLab", description: "Lab Interpretation", icon: FlaskConical, href: "/medilab", color: "from-blue-500 to-cyan-600" },
  { key: "mediscan", label: "MediScan", description: "Imaging Analysis", icon: ScanLine, href: "/mediscan", color: "from-emerald-500 to-teal-600" },
];

const statusColors = {
  normal: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400",
  borderline: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400",
  high: "text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400",
  critical: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 animate-pulse-subtle",
};

export function EnhancedDashboard() {
  const { context } = useAdaptiveContext();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Emergency Banner — Only in emergency context */}
      {context === "emergency" && (
        <FadeIn>
          <div className="rounded-xl border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 p-4 flex items-center gap-3">
            <div className="size-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
              <AlertTriangle className="size-5 text-red-600 dark:text-red-400 animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-800 dark:text-red-200">
                Emergency Mode Active
              </h3>
              <p className="text-xs text-red-600 dark:text-red-400">
                Critical vitals and allergies are prominently displayed. Quick actions prioritized.
              </p>
            </div>
          </div>
        </FadeIn>
      )}

      {/* Emergency Vitals — Large display in emergency context */}
      {context === "emergency" && (
        <FadeIn delay={100}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {emergencyVitals.map((vital, i) => {
              const Icon = vital.icon;
              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl p-4 border-2 transition-all",
                    vital.status === "critical"
                      ? "border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-950/30 shadow-lg shadow-red-200 dark:shadow-red-900/20"
                      : vital.status === "high"
                        ? "border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30"
                        : "border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30"
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon className={cn("size-4", vital.status === "critical" ? "text-red-600" : vital.status === "high" ? "text-orange-600" : "text-amber-600")} />
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {vital.label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={cn(
                      "text-2xl font-black tabular-nums",
                      vital.status === "critical" ? "text-red-700 dark:text-red-300" : vital.status === "high" ? "text-orange-700 dark:text-orange-300" : "text-amber-700 dark:text-amber-300"
                    )}>
                      {vital.value}
                    </span>
                    <span className="text-xs text-slate-400">{vital.unit}</span>
                  </div>
                  <span className={cn("mt-1 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase", statusColors[vital.status])}>
                    {vital.status}
                  </span>
                </div>
              );
            })}
          </div>
        </FadeIn>
      )}

      {/* Today's Stats — Standard and Routine contexts */}
      {(context === "default" || context === "routine") && (
        <FadeIn>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {todayStats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <SmartClinicalCard
                  key={i}
                  title={stat.label}
                  value={stat.value}
                  subtitle={stat.change}
                  icon={<Icon className="size-4" />}
                  priority={stat.color === "amber" ? "warning" : "info"}
                  className="hover-lift"
                />
              );
            })}
          </div>
        </FadeIn>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Upcoming Patients */}
        <div className="lg:col-span-2 space-y-4">
          <FadeIn delay={200}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {context === "emergency" ? "Current Patients" : "Upcoming Patients"}
              </h2>
              <Link
                href="/patients"
                className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1"
              >
                View All <ChevronRight className="size-3" />
              </Link>
            </div>
          </FadeIn>

          <StaggeredList staggerDelay={80} className="space-y-2">
            {upcomingPatients.map((patient, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer",
                  "border-slate-200 dark:border-slate-700",
                  "bg-white dark:bg-slate-800/50",
                  "hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700",
                  "hover:-translate-y-0.5"
                )}
              >
                {/* Avatar */}
                <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {patient.name.split(" ").map(n => n[0]).join("")}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {patient.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {patient.reason}
                  </p>
                </div>

                {/* Time & Status */}
                <div className="text-end shrink-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {patient.time}
                  </p>
                  <span
                    className={cn(
                      "inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium",
                      patient.status === "waiting"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    )}
                  >
                    {patient.status}
                  </span>
                </div>
              </div>
            ))}
          </StaggeredList>
        </div>

        {/* Right Column — Quick Access Modules */}
        <div className="space-y-4">
          <FadeIn delay={300}>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Clinical Modules
            </h2>
          </FadeIn>

          <StaggeredList staggerDelay={100} className="space-y-3">
            {clinicalModules.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.key}
                  href={mod.href}
                  className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className={cn("size-10 rounded-lg bg-gradient-to-br flex items-center justify-center", mod.color)}>
                    <Icon className="size-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {mod.label}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {mod.description}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-slate-300 dark:text-slate-600" />
                </Link>
              );
            })}
          </StaggeredList>

          {/* Medical Intelligence Status */}
          <FadeIn delay={500}>
            <ProcessingIndicator label="Medical Intelligence Active" />
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
