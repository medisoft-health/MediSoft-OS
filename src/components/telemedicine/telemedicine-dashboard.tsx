"use client";

import * as React from "react";
import {
  Video,
  Phone,
  Calendar,
  Clock,
  User,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────
interface VideoSession {
  id: string;
  patientId: number;
  physicianId: string;
  roomId: string | null;
  status: string;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  notes: string | null;
  conversationId: string | null;
  recordingUrl: string | null;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────
//  Telemedicine Dashboard
// ─────────────────────────────────────────────────────────────────
export function TelemedicineDashboard() {
  const [sessions, setSessions] = React.useState<VideoSession[]>([]);
  const [upcomingSessions, setUpcomingSessions] = React.useState<VideoSession[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"upcoming" | "history" | "schedule">("upcoming");
  const [showScheduleForm, setShowScheduleForm] = React.useState(false);

  // Schedule form state
  const [scheduleForm, setScheduleForm] = React.useState({
    patientId: "",
    scheduledAt: "",
    duration: 30,
    reason: "",
    callType: "video" as "video" | "audio" | "screen_share",
  });

  React.useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    setLoading(true);
    try {
      const [upRes, histRes] = await Promise.all([
        fetch("/api/telemedicine?action=upcoming"),
        fetch("/api/telemedicine?action=history"),
      ]);
      const upData = await upRes.json();
      const histData = await histRes.json();
      setUpcomingSessions(upData.sessions || []);
      setSessions(histData.sessions || []);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setLoading(false);
    }
  }

  async function scheduleCall() {
    if (!scheduleForm.patientId || !scheduleForm.scheduledAt) return;

    try {
      const res = await fetch("/api/telemedicine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule",
          patientId: parseInt(scheduleForm.patientId),
          scheduledAt: scheduleForm.scheduledAt,
          duration: scheduleForm.duration,
          reason: scheduleForm.reason,
          callType: scheduleForm.callType,
        }),
      });
      const data = await res.json();
      if (data.session) {
        setShowScheduleForm(false);
        setScheduleForm({ patientId: "", scheduledAt: "", duration: 30, reason: "", callType: "video" });
        fetchSessions();
      }
    } catch (error) {
      console.error("Failed to schedule call:", error);
    }
  }

  async function cancelSession(sessionId: string) {
    await fetch("/api/telemedicine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", sessionId }),
    });
    fetchSessions();
  }

  function joinCall(session: VideoSession) {
    window.open(`/telemedicine/${session.id}`, "_blank");
  }

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    scheduled: { label: "مجدولة", color: "bg-blue-500/10 text-blue-400 border-blue-500/30", icon: <Calendar className="w-3.5 h-3.5" /> },
    waiting: { label: "في الانتظار", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", icon: <Clock className="w-3.5 h-3.5" /> },
    active: { label: "نشطة", color: "bg-green-500/10 text-green-400 border-green-500/30", icon: <Video className="w-3.5 h-3.5" /> },
    completed: { label: "مكتملة", color: "bg-gray-500/10 text-gray-400 border-gray-500/30", icon: <CheckCircle className="w-3.5 h-3.5" /> },
    cancelled: { label: "ملغاة", color: "bg-red-500/10 text-red-400 border-red-500/30", icon: <XCircle className="w-3.5 h-3.5" /> },
    missed: { label: "فائتة", color: "bg-orange-500/10 text-orange-400 border-orange-500/30", icon: <AlertCircle className="w-3.5 h-3.5" /> },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">الطب عن بُعد</h2>
          <p className="text-gray-400 text-sm mt-1">إدارة الاستشارات المرئية والصوتية</p>
        </div>
        <button
          onClick={() => setShowScheduleForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          جدولة مكالمة جديدة
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{upcomingSessions.length}</p>
              <p className="text-xs text-gray-400">مكالمات قادمة</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Video className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {sessions.filter(s => s.status === "active").length}
              </p>
              <p className="text-xs text-gray-400">مكالمات نشطة</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {sessions.filter(s => s.status === "completed").length}
              </p>
              <p className="text-xs text-gray-400">مكتملة هذا الشهر</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {Math.round(sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0) / 60)} دقيقة
              </p>
              <p className="text-xs text-gray-400">إجمالي وقت المكالمات</p>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Form Modal */}
      {showScheduleForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">جدولة مكالمة جديدة</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">رقم المريض (ID)</label>
                <input
                  type="number"
                  value={scheduleForm.patientId}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, patientId: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  placeholder="أدخل رقم المريض"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">التاريخ والوقت</label>
                <input
                  type="datetime-local"
                  value={scheduleForm.scheduledAt}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">المدة (دقائق)</label>
                <select
                  value={scheduleForm.duration}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value={15}>15 دقيقة</option>
                  <option value={30}>30 دقيقة</option>
                  <option value={45}>45 دقيقة</option>
                  <option value={60}>60 دقيقة</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">نوع المكالمة</label>
                <select
                  value={scheduleForm.callType}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, callType: e.target.value as any }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="video">مكالمة فيديو</option>
                  <option value="audio">مكالمة صوتية</option>
                  <option value="screen_share">مشاركة شاشة</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">سبب المكالمة</label>
                <textarea
                  value={scheduleForm.reason}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white h-20 resize-none"
                  placeholder="استشارة متابعة / مراجعة نتائج..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={scheduleCall}
                  className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg hover:bg-teal-700 font-medium"
                >
                  جدولة
                </button>
                <button
                  onClick={() => setShowScheduleForm(false)}
                  className="flex-1 bg-gray-700 text-white py-2.5 rounded-lg hover:bg-gray-600"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700/50 pb-2">
        {[
          { key: "upcoming", label: "القادمة", count: upcomingSessions.length },
          { key: "history", label: "السجل", count: sessions.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
              activeTab === tab.key ? "bg-teal-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
            )}
          >
            {tab.label}
            <span className="bg-white/10 px-1.5 py-0.5 rounded text-xs">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {(activeTab === "upcoming" ? upcomingSessions : sessions).map(session => {
            const statusInfo = statusConfig[session.status] || statusConfig.scheduled;
            return (
              <div key={session.id} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:border-gray-600/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">مريض #{session.patientId}</p>
                      <p className="text-gray-400 text-sm">{session.notes || "استشارة طبية"}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {session.scheduledAt ? new Date(session.scheduledAt).toLocaleDateString("ar-SA") : "-"}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {session.scheduledAt ? new Date(session.scheduledAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : "-"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {session.durationSeconds ? Math.round(session.durationSeconds / 60) : 30} دقيقة
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("px-2.5 py-1 rounded-full text-xs border flex items-center gap-1.5", statusInfo.color)}>
                      {statusInfo.icon}
                      {statusInfo.label}
                    </span>
                    {(session.status === "scheduled" || session.status === "waiting") && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => joinCall(session)}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1"
                        >
                          <Video className="w-3.5 h-3.5" />
                          انضمام
                        </button>
                        <button
                          onClick={() => cancelSession(session.id)}
                          className="px-3 py-1.5 bg-red-600/20 text-red-400 text-sm rounded-lg hover:bg-red-600/30 flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          إلغاء
                        </button>
                      </div>
                    )}
                    {session.status === "active" && (
                      <button
                        onClick={() => joinCall(session)}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 animate-pulse flex items-center gap-1"
                      >
                        <Video className="w-3.5 h-3.5" />
                        العودة للمكالمة
                      </button>
                    )}
                    {session.notes && (
                      <span className="text-gray-500" title={session.notes}>
                        <FileText className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {(activeTab === "upcoming" ? upcomingSessions : sessions).length === 0 && (
            <div className="text-center py-12">
              <Video className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">
                {activeTab === "upcoming" ? "لا توجد مكالمات قادمة" : "لا يوجد سجل مكالمات"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
