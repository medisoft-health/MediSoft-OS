"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useMediBot } from "./medibot-provider";

/**
 * usePageContext — Makes MediBot aware of the current page/module
 * and automatically adjusts its suggestions and behavior.
 *
 * Context-Aware Features:
 * - In PharmaX → Suggests drug alternatives for interactions
 * - In MediLab → Offers to explain lab results
 * - In MediScan → Provides image analysis assistance
 * - In Patient page → Shows patient summary and quick actions
 * - In MediScript → Helps with documentation
 */

export type PageModule =
  | "dashboard"
  | "patients"
  | "patient-detail"
  | "mediscript"
  | "pharmax"
  | "medilab"
  | "mediscan"
  | "medisport"
  | "medident"
  | "billing"
  | "encounters"
  | "settings"
  | "other";

interface PageContextInfo {
  module: PageModule;
  title: string;
  quickActions: QuickAction[];
  contextHint: string;
  suggestedPrompts: string[];
}

interface QuickAction {
  label: string;
  labelAr: string;
  prompt: string;
  icon: string; // emoji for simplicity
}

const moduleConfig: Record<PageModule, Omit<PageContextInfo, "module">> = {
  dashboard: {
    title: "Dashboard",
    contextHint: "You are on the main dashboard. I can help with today's schedule, pending tasks, or patient overview.",
    quickActions: [
      { label: "Today's Schedule", labelAr: "جدول اليوم", prompt: "Show me today's appointment schedule and any urgent items", icon: "📅" },
      { label: "Pending Results", labelAr: "نتائج معلقة", prompt: "Are there any pending lab results or follow-ups I need to review?", icon: "🔔" },
    ],
    suggestedPrompts: [
      "What's my schedule today?",
      "Any critical patients to follow up?",
      "Show pending lab results",
    ],
  },
  patients: {
    title: "Patients",
    contextHint: "You are in the patients list. I can help find patients, review histories, or prepare for consultations.",
    quickActions: [
      { label: "Find Patient", labelAr: "بحث عن مريض", prompt: "Help me find a patient by name or ID", icon: "🔍" },
      { label: "New Registration", labelAr: "تسجيل جديد", prompt: "Guide me through registering a new patient", icon: "➕" },
    ],
    suggestedPrompts: [
      "Find patient with diabetes",
      "Show patients with upcoming appointments",
      "Who needs follow-up this week?",
    ],
  },
  "patient-detail": {
    title: "Patient Record",
    contextHint: "You are viewing a patient's detailed record. I have full context of this patient's history, medications, and conditions.",
    quickActions: [
      { label: "Summarize History", labelAr: "ملخص التاريخ", prompt: "Give me a concise summary of this patient's medical history and current conditions", icon: "📋" },
      { label: "Check Interactions", labelAr: "فحص التفاعلات", prompt: "Check for any drug-drug or drug-food interactions with this patient's current medications", icon: "⚠️" },
      { label: "Suggest Labs", labelAr: "اقتراح تحاليل", prompt: "Based on this patient's conditions, what lab tests should be ordered?", icon: "🧪" },
    ],
    suggestedPrompts: [
      "Summarize this patient's history",
      "Any medication concerns?",
      "What labs are overdue?",
      "Prepare pre-visit summary",
    ],
  },
  mediscript: {
    title: "MediScript",
    contextHint: "You are in MediScript (clinical documentation). I can help with SOAP notes, ICD-11 coding, and documentation.",
    quickActions: [
      { label: "Format SOAP", labelAr: "تنسيق SOAP", prompt: "Help me format the current notes into a proper SOAP structure", icon: "📝" },
      { label: "Suggest ICD-11", labelAr: "اقتراح ICD-11", prompt: "Suggest appropriate ICD-11 codes based on the current diagnosis", icon: "🏷️" },
    ],
    suggestedPrompts: [
      "Format this as SOAP note",
      "What ICD-11 code fits this diagnosis?",
      "Help me document the assessment",
    ],
  },
  pharmax: {
    title: "PharmaX",
    contextHint: "You are in PharmaX (drug safety). I can check interactions, suggest alternatives, calculate doses, and explain pharmacology.",
    quickActions: [
      { label: "Check Interactions", labelAr: "فحص التفاعلات", prompt: "Check all drug-drug and drug-food interactions for the current prescription", icon: "⚠️" },
      { label: "Find Alternative", labelAr: "بديل دوائي", prompt: "Suggest a safer alternative medication with fewer interactions", icon: "💊" },
      { label: "Calculate Dose", labelAr: "حساب الجرعة", prompt: "Help me calculate the correct dosage based on patient weight and renal function", icon: "🧮" },
    ],
    suggestedPrompts: [
      "Any interactions with current meds?",
      "Suggest alternative for this drug",
      "Calculate pediatric dose",
      "Is this safe during pregnancy?",
    ],
  },
  medilab: {
    title: "MediLab",
    contextHint: "You are in MediLab (laboratory results). I can interpret results, identify trends, and explain findings.",
    quickActions: [
      { label: "Interpret Results", labelAr: "تفسير النتائج", prompt: "Interpret these lab results and highlight any abnormalities", icon: "🔬" },
      { label: "Show Trends", labelAr: "عرض الاتجاهات", prompt: "Show me the trend analysis for this patient's key lab values over time", icon: "📈" },
      { label: "Patient Report", labelAr: "تقرير للمريض", prompt: "Generate a patient-friendly explanation of these lab results", icon: "👤" },
    ],
    suggestedPrompts: [
      "What do these results mean?",
      "Is this value concerning?",
      "Compare with last month's results",
      "Explain this to the patient",
    ],
  },
  mediscan: {
    title: "MediScan",
    contextHint: "You are in MediScan (radiology/imaging). I can assist with image interpretation, findings documentation, and comparison.",
    quickActions: [
      { label: "Analyze Image", labelAr: "تحليل الصورة", prompt: "Analyze this medical image and provide structured findings", icon: "🩻" },
      { label: "Compare Previous", labelAr: "مقارنة بالسابق", prompt: "Compare this scan with the patient's previous imaging studies", icon: "🔄" },
    ],
    suggestedPrompts: [
      "What do you see in this image?",
      "Compare with previous scan",
      "Document findings in structured format",
    ],
  },
  medisport: {
    title: "MediSport",
    contextHint: "You are in MediSport (sports medicine). I can help with body composition analysis, performance metrics, and athlete assessments.",
    quickActions: [
      { label: "Body Composition", labelAr: "تكوين الجسم", prompt: "Analyze this athlete's body composition changes over the last 3 months", icon: "💪" },
      { label: "Performance Report", labelAr: "تقرير الأداء", prompt: "Generate a comprehensive performance and fitness report for this athlete", icon: "🏃" },
    ],
    suggestedPrompts: [
      "Compare body composition over time",
      "Analyze fitness test results",
      "Suggest recovery protocol",
    ],
  },
  medident: {
    title: "MediDent",
    contextHint: "You are in MediDent (dental). I can help with dental charting, treatment planning, and procedure documentation.",
    quickActions: [
      { label: "Treatment Plan", labelAr: "خطة العلاج", prompt: "Help me create a comprehensive treatment plan for this patient", icon: "🦷" },
    ],
    suggestedPrompts: [
      "Suggest treatment plan",
      "Document procedure notes",
      "Check material compatibility",
    ],
  },
  billing: {
    title: "Billing",
    contextHint: "You are in Billing. I can help with coding, claims, and insurance verification.",
    quickActions: [
      { label: "Auto-Code", labelAr: "ترميز تلقائي", prompt: "Suggest appropriate CPT and ICD codes for this encounter", icon: "💰" },
    ],
    suggestedPrompts: [
      "What CPT code should I use?",
      "Check insurance eligibility",
      "Help with denial appeal",
    ],
  },
  encounters: {
    title: "Encounters",
    contextHint: "You are viewing encounters. I can help review past visits or prepare for upcoming ones.",
    quickActions: [],
    suggestedPrompts: [
      "Summarize last encounter",
      "What was discussed previously?",
    ],
  },
  settings: {
    title: "Settings",
    contextHint: "You are in settings. I can help with configuration questions.",
    quickActions: [],
    suggestedPrompts: [],
  },
  other: {
    title: "MediBot",
    contextHint: "I'm your Medical Intelligence assistant. Ask me anything about clinical practice, medications, or patient care.",
    quickActions: [],
    suggestedPrompts: [
      "Help me with a clinical question",
      "What's new in medical guidelines?",
    ],
  },
};

function detectModule(pathname: string): PageModule {
  if (pathname.includes("/pharmax")) return "pharmax";
  if (pathname.includes("/mediscript")) return "mediscript";
  if (pathname.includes("/medilab")) return "medilab";
  if (pathname.includes("/mediscan")) return "mediscan";
  if (pathname.includes("/medisport")) return "medisport";
  if (pathname.includes("/medident")) return "medident";
  if (pathname.includes("/billing")) return "billing";
  if (pathname.includes("/encounters")) return "encounters";
  if (pathname.includes("/settings")) return "settings";
  if (pathname.match(/\/patients\/\d+/)) return "patient-detail";
  if (pathname.includes("/patients")) return "patients";
  if (pathname.includes("/dashboard")) return "dashboard";
  return "other";
}

export function usePageContext(): PageContextInfo {
  const pathname = usePathname();
  const module = detectModule(pathname || "");
  const config = moduleConfig[module];

  return {
    module,
    ...config,
  };
}
