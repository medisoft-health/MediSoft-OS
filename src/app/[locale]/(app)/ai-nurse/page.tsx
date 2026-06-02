"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Heart,
  Activity,
  Pill,
  MessageCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  TrendingUp,
  Calendar,
  Phone,
  Bell,
  ThermometerSun,
  Stethoscope,
  ClipboardList,
  Send,
  Bot,
  RefreshCw,
  Loader2,
  Plus,
  Brain,
  AlertCircle,
} from "lucide-react";

export default function AINursePage() {
  const t = useTranslations("AIAgents");
  const [activeTab, setActiveTab] = useState<"dashboard" | "follow-ups" | "medications" | "triage">("dashboard");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [triageInput, setTriageInput] = useState("");
  const [triageResult, setTriageResult] = useState<any>(null);
  const [triageLoading, setTriageLoading] = useState(false);
  const [processingBatch, setProcessingBatch] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ai-nurse?action=dashboard");
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch (e) {
      console.error("Failed to fetch AI Nurse data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTriage = async () => {
    if (!triageInput.trim()) return;
    setTriageLoading(true);
    try {
      const res = await fetch("/api/ai-nurse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "triage", symptoms: triageInput, patientId: 1 }),
      });
      const result = await res.json();
      if (result.success) setTriageResult(result.data);
    } catch (e) {
      console.error("Triage failed:", e);
    } finally {
      setTriageLoading(false);
    }
  };

  const handleCreateFollowUp = async (patientId: number) => {
    try {
      await fetch("/api/ai-nurse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_followup",
          patientId,
          type: "post_visit",
          scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          notes: "Post-visit follow-up check",
        }),
      });
      fetchData();
    } catch (e) {
      console.error("Failed to create follow-up:", e);
    }
  };

  const handleBatchProcess = async () => {
    setProcessingBatch(true);
    try {
      await fetch("/api/ai-nurse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "batch_process" }),
      });
      fetchData();
    } catch (e) {
      console.error("Batch process failed:", e);
    } finally {
      setProcessingBatch(false);
    }
  };

  const tabs = [
    { id: "dashboard" as const, label: t("dashboard"), icon: Activity },
    { id: "follow-ups" as const, label: t("followUps"), icon: ClipboardList },
    { id: "medications" as const, label: t("medAlerts"), icon: Pill },
    { id: "triage" as const, label: t("smartTriage"), icon: Stethoscope },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Heart className="h-7 w-7 text-rose-600" />
            {t("aiNurse")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t("aiNurseDesc")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleBatchProcess} disabled={processingBatch}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50">
            {processingBatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {processingBatch ? t("processingBatch") : t("runBatchCheck")}
          </button>
          <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            {t("monitoringActive")}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab.id ? "bg-white text-rose-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          <span className="ml-3 text-gray-500">{t("loadingNurseDashboard")}</span>
        </div>
      ) : (
        <>
          {activeTab === "dashboard" && <NurseDashboard data={data} />}
          {activeTab === "follow-ups" && <FollowUpsSection data={data} onCreateFollowUp={handleCreateFollowUp} />}
          {activeTab === "medications" && <MedAlertsSection data={data} />}
          {activeTab === "triage" && (
            <TriageSection
              triageInput={triageInput}
              setTriageInput={setTriageInput}
              triageResult={triageResult}
              triageLoading={triageLoading}
              handleTriage={handleTriage}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────
function NurseDashboard({ data }: { data: any }) {
  const stats = data?.stats || {};
  const tasks = data?.upcomingTasks || [];
  const patients = data?.patients || [];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: "Active Follow-ups", value: stats.activeFollowUps || 0, icon: Users, color: "rose" },
          { label: "Completed Today", value: stats.completedToday || 0, icon: CheckCircle2, color: "green" },
          { label: "Pending", value: stats.pending || 0, icon: Clock, color: "blue" },
          { label: "Overdue", value: stats.overdue || 0, icon: AlertTriangle, color: "red" },
          { label: "Med Alerts", value: stats.medicationAlerts || 0, icon: Pill, color: "purple" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg bg-${color}-100 p-2`}>
                <Icon className={`h-5 w-5 text-${color}-600`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Patient Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {patients.map((patient: any) => (
          <div key={patient.id} className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                <span className="text-sm font-bold text-rose-600">{(patient.firstName || "P")[0]}</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{patient.firstName} {patient.lastName}</p>
                <p className="text-xs text-gray-500">MRN: {patient.mrn || `P-${patient.id}`}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-gray-50 p-2">
                <p className="text-gray-500">Gender</p>
                <p className="font-medium text-gray-900">{patient.gender || "N/A"}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-2">
                <p className="text-gray-500">DOB</p>
                <p className="font-medium text-gray-900">{patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : "N/A"}</p>
              </div>
            </div>
          </div>
        ))}
        {patients.length === 0 && (
          <div className="col-span-2 text-center py-10 text-gray-500">No patients found in the database.</div>
        )}
      </div>

      {/* Upcoming Tasks */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Follow-up Tasks (from Database)</h3>
        <div className="space-y-3">
          {tasks.slice(0, 5).map((task: any) => (
            <div key={task.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className={`rounded-full p-2 ${
                  task.priority === "urgent" ? "bg-red-100" :
                  task.priority === "high" ? "bg-orange-100" :
                  "bg-blue-100"
                }`}>
                  {task.type === "medication_reminder" ? <Pill className="h-4 w-4 text-amber-600" /> :
                   task.type === "post_visit" ? <Stethoscope className="h-4 w-4 text-blue-600" /> :
                   <Bell className="h-4 w-4 text-gray-600" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Patient #{task.patientId} — {(task.type || "").replace(/_/g, " ")}</p>
                  <p className="text-xs text-gray-500">{task.notes || "Scheduled follow-up"}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">{new Date(task.scheduledFor).toLocaleString()}</p>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  task.status === "completed" ? "bg-green-100 text-green-700" :
                  task.status === "overdue" ? "bg-red-100 text-red-700" :
                  "bg-blue-100 text-blue-700"
                }`}>{task.status}</span>
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <p className="text-center text-gray-500 py-8">No follow-up tasks yet. Create one from the Follow-ups tab.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Follow-ups Section ──────────────────────────────────────────
function FollowUpsSection({ data, onCreateFollowUp }: { data: any; onCreateFollowUp: (id: number) => void }) {
  const patients = data?.patients || [];
  const tasks = data?.upcomingTasks || [];

  return (
    <div className="space-y-6">
      {/* Patients with Follow-up Actions */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Patients — Add Follow-ups</h3>
        <div className="space-y-3">
          {patients.map((patient: any) => (
            <div key={patient.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-rose-600">{(patient.firstName || "P")[0]}</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{patient.firstName} {patient.lastName}</p>
                  <p className="text-xs text-gray-500">MRN: {patient.mrn || `P-${patient.id}`}</p>
                </div>
              </div>
              <button onClick={() => onCreateFollowUp(patient.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 font-medium">
                <Plus className="h-3 w-3" /> Add Follow-up
              </button>
            </div>
          ))}
          {patients.length === 0 && (
            <p className="text-center text-gray-500 py-8">No patients found.</p>
          )}
        </div>
      </div>

      {/* All Tasks */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Follow-up Tasks</h3>
        <div className="space-y-2">
          {tasks.map((task: any) => (
            <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className={`rounded-full p-1.5 ${
                  task.status === "completed" ? "bg-green-100" :
                  task.status === "overdue" ? "bg-red-100" :
                  "bg-blue-100"
                }`}>
                  {task.status === "completed" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                   task.status === "overdue" ? <AlertCircle className="h-4 w-4 text-red-600" /> :
                   <Clock className="h-4 w-4 text-blue-600" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Patient #{task.patientId} — {(task.type || "").replace(/_/g, " ")}</p>
                  <p className="text-xs text-gray-500">{task.notes || "No notes"}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">{new Date(task.scheduledFor).toLocaleString()}</p>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  task.status === "completed" ? "bg-green-100 text-green-700" :
                  task.status === "overdue" ? "bg-red-100 text-red-700" :
                  task.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                  "bg-blue-100 text-blue-700"
                }`}>{task.status}</span>
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <p className="text-center text-gray-500 py-8">No tasks yet. Add follow-ups from the list above.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Medication Alerts Section ───────────────────────────────────
function MedAlertsSection({ data }: { data: any }) {
  const tasks = (data?.upcomingTasks || []).filter((t: any) => t.type === "medication_reminder");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Pill className="h-5 w-5 text-amber-500" /> Medication Alerts
        </h3>
        {tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map((task: any) => (
              <div key={task.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-full p-2 bg-amber-100">
                    <Pill className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Patient #{task.patientId} — Medication Reminder</p>
                    <p className="text-xs text-gray-500">{task.notes || "Take medication as prescribed"}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  task.status === "completed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}>{task.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <Pill className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No medication alerts at this time.</p>
            <p className="text-xs text-gray-400 mt-1">Medication reminders will appear here when created via follow-ups.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI Triage Section ───────────────────────────────────────────
function TriageSection({
  triageInput, setTriageInput, triageResult, triageLoading, handleTriage
}: {
  triageInput: string;
  setTriageInput: (v: string) => void;
  triageResult: any;
  triageLoading: boolean;
  handleTriage: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" /> AI Triage Assessment
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Enter patient symptoms and the AI will assess urgency level and provide recommendations.
        </p>
        <textarea
          value={triageInput}
          onChange={(e) => setTriageInput(e.target.value)}
          placeholder="Describe symptoms... (e.g., 'Patient reports severe chest pain radiating to left arm, shortness of breath, sweating for 30 minutes')"
          className="w-full h-28 border rounded-lg p-3 text-sm focus:border-rose-500 focus:outline-none resize-none"
        />
        <button onClick={handleTriage} disabled={triageLoading || !triageInput.trim()}
          className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 text-sm font-medium">
          {triageLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stethoscope className="h-4 w-4" />}
          {triageLoading ? "Assessing..." : "Run AI Triage"}
        </button>
      </div>

      {triageResult && (
        <div className={`rounded-xl border p-6 shadow-sm ${
          triageResult.urgencyLevel === "emergency" ? "bg-red-50 border-red-200" :
          triageResult.urgencyLevel === "urgent" ? "bg-orange-50 border-orange-200" :
          triageResult.urgencyLevel === "semi_urgent" ? "bg-yellow-50 border-yellow-200" :
          "bg-green-50 border-green-200"
        }`}>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Triage Result</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-3 rounded-lg bg-white border">
              <p className="text-xs text-gray-500">Urgency Level</p>
              <p className={`text-lg font-bold ${
                triageResult.urgencyLevel === "emergency" ? "text-red-600" :
                triageResult.urgencyLevel === "urgent" ? "text-orange-600" :
                triageResult.urgencyLevel === "semi_urgent" ? "text-yellow-600" :
                "text-green-600"
              }`}>{(triageResult.urgencyLevel || "").replace(/_/g, " ").toUpperCase()}</p>
            </div>
            <div className="p-3 rounded-lg bg-white border">
              <p className="text-xs text-gray-500">Confidence</p>
              <p className="text-lg font-bold text-gray-900">{triageResult.confidence || "High"}</p>
            </div>
            <div className="p-3 rounded-lg bg-white border">
              <p className="text-xs text-gray-500">Action Required</p>
              <p className="text-lg font-bold text-gray-900">{triageResult.action || "See doctor"}</p>
            </div>
          </div>
          {triageResult.reasoning && (
            <div className="p-3 rounded-lg bg-white border">
              <p className="text-sm text-gray-700"><strong>Clinical Assessment:</strong> {triageResult.reasoning}</p>
            </div>
          )}
          {triageResult.recommendations && (
            <div className="mt-3 p-3 rounded-lg bg-white border">
              <p className="text-sm font-medium text-gray-900 mb-1">Recommendations:</p>
              <p className="text-sm text-gray-700">{triageResult.recommendations}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
