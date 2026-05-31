"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Phone,
  MessageSquare,
  Calendar,
  Clock,
  Users,
  Bot,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings,
  BarChart3,
  Send,
  Mic,
  Globe,
  Zap,
  RefreshCw,
  Loader2,
} from "lucide-react";

export default function AIReceptionistPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "calls" | "chat" | "settings">("dashboard");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string; intent?: string }[]>([]);
  const [processing, setProcessing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-receptionist?period=week");
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (e) {
      console.error("Failed to fetch:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || processing) return;
    const msg = chatInput;
    setChatHistory((prev) => [...prev, { role: "patient", content: msg }]);
    setChatInput("");
    setProcessing(true);
    try {
      const res = await fetch("/api/ai-receptionist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "portal", message: msg, patientId: 1 }),
      });
      const data = await res.json();
      if (data.success) {
        setChatHistory((prev) => [...prev, { role: "receptionist", content: data.data.response, intent: data.data.intent }]);
        if (data.data.appointmentCreated) {
          setChatHistory((prev) => [...prev, { role: "system", content: `✅ Appointment booked: ${new Date(data.data.appointmentCreated.scheduledAt).toLocaleString()}` }]);
        }
      }
    } catch {
      setChatHistory((prev) => [...prev, { role: "system", content: "❌ Error processing request" }]);
    } finally {
      setProcessing(false);
      fetchStats();
    }
  };

  const tabs = [
    { id: "dashboard" as const, label: "Dashboard", icon: BarChart3 },
    { id: "calls" as const, label: "Call Log", icon: Phone },
    { id: "chat" as const, label: "Live Chat", icon: MessageSquare },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="h-7 w-7 text-indigo-600" />
            AI Receptionist
          </h1>
          <p className="text-sm text-gray-500 mt-1">24/7 intelligent call handling, appointment scheduling & patient communication</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Active — Handling Calls
          </span>
          <button onClick={fetchStats} className="p-2 rounded-lg border hover:bg-gray-50">
            <RefreshCw className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${activeTab === tab.id ? "bg-white text-indigo-600 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="ml-3 text-gray-500">Loading receptionist data...</span>
        </div>
      ) : (
        <>
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                  { label: "Total Interactions", value: stats?.totalInteractions || 0, icon: Users, color: "blue" },
                  { label: "AI Handled", value: stats?.callsHandled || 0, icon: CheckCircle2, color: "green" },
                  { label: "Appointments Booked", value: stats?.appointmentsBooked || 0, icon: Calendar, color: "purple" },
                  { label: "WhatsApp Messages", value: stats?.whatsappMessages || 0, icon: MessageSquare, color: "emerald" },
                  { label: "Escalated", value: stats?.escalated || 0, icon: AlertCircle, color: "red" },
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

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Performance</h3>
                  <div className="space-y-4">
                    {[
                      { label: "Resolution Rate", value: stats?.resolutionRate || 0, color: "green" },
                      { label: "Patient Satisfaction", value: stats?.satisfactionRate || 92, color: "blue" },
                      { label: "Avg Response Time", value: 95, color: "purple", display: "1.2s" },
                      { label: "Booking Accuracy", value: 98, color: "indigo" },
                    ].map(({ label, value, color, display }) => (
                      <div key={label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{label}</span>
                          <span className={`font-medium text-${color}-600`}>{display || `${value}%`}</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-200">
                          <div className={`h-2 rounded-full bg-${color}-500`} style={{ width: `${value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Channels */}
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Channels</h3>
                  <div className="space-y-3">
                    {[
                      { name: "Phone (Twilio)", icon: Phone, status: "active", calls: stats?.callsHandled || 0 },
                      { name: "WhatsApp Business", icon: MessageSquare, status: "active", calls: stats?.whatsappMessages || 0 },
                      { name: "Patient Portal Chat", icon: Bot, status: "active", calls: stats?.portalChats || 0 },
                      { name: "SMS", icon: Globe, status: "active", calls: stats?.smsMessages || 0 },
                    ].map(({ name, icon: Icon, status, calls }) => (
                      <div key={name} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">{name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{calls} interactions</span>
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Interactions from API */}
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Interactions (Live)</h3>
                <div className="space-y-2">
                  {(stats?.recentInteractions || []).slice(0, 8).map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-full p-1.5 ${item.channel === "whatsapp" ? "bg-green-100" : item.channel === "phone" ? "bg-blue-100" : "bg-purple-100"}`}>
                          {item.channel === "whatsapp" ? <MessageSquare className="h-3.5 w-3.5 text-green-600" /> :
                           item.channel === "phone" ? <Phone className="h-3.5 w-3.5 text-blue-600" /> :
                           <Bot className="h-3.5 w-3.5 text-purple-600" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.body?.slice(0, 50) || "Interaction"}</p>
                          <p className="text-xs text-gray-500">{item.channel} — {new Date(item.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs ${item.status === "resolved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                  {(!stats?.recentInteractions || stats.recentInteractions.length === 0) && (
                    <p className="text-center text-gray-500 py-6">No interactions yet. Try the Live Chat tab!</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Call Log Tab */}
          {activeTab === "calls" && (
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Communication Log (from Database)</h3>
              <div className="space-y-2">
                {(stats?.recentInteractions || []).map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-full p-2 ${item.channel === "whatsapp" ? "bg-green-100" : item.channel === "phone" ? "bg-blue-100" : "bg-purple-100"}`}>
                        {item.channel === "phone" ? <PhoneIncoming className="h-4 w-4 text-blue-600" /> :
                         item.channel === "whatsapp" ? <MessageSquare className="h-4 w-4 text-green-600" /> :
                         <Bot className="h-4 w-4 text-purple-600" />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">Patient #{item.patientId || "Unknown"}</p>
                        <p className="text-xs text-gray-500">{item.body?.slice(0, 60)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(item.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${item.status === "resolved" ? "bg-green-100 text-green-700" : item.status === "escalated" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {item.status}
                      </span>
                      <span className="text-xs text-gray-400">{item.channel}</span>
                    </div>
                  </div>
                ))}
                {(!stats?.recentInteractions || stats.recentInteractions.length === 0) && (
                  <p className="text-center text-gray-500 py-12">No call logs yet. Interactions will appear here when patients contact the AI Receptionist.</p>
                )}
              </div>
            </div>
          )}

          {/* Live Chat Tab */}
          {activeTab === "chat" && (
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="border-b p-4 bg-indigo-50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-indigo-900 flex items-center gap-2">
                    <Bot className="h-5 w-5" /> Live AI Chat — Test Mode
                  </h3>
                  <p className="text-xs text-indigo-600">Test how the AI Receptionist responds to patient messages</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-indigo-500">
                  <Zap className="w-3 h-3" /> Powered by Gemini AI
                </div>
              </div>
              <div className="h-[400px] overflow-y-auto p-4 space-y-3 bg-gray-50">
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl bg-white border px-4 py-2.5 shadow-sm">
                    <p className="text-xs font-medium text-indigo-600 mb-1">AI Receptionist</p>
                    <p className="text-sm text-gray-700">
                      مرحباً! أنا المساعد الذكي لعيادة MediSoft. كيف يمكنني مساعدتك اليوم؟
                      <br /><br />
                      Hello! I&apos;m the AI assistant for MediSoft Clinic. How can I help you today?
                    </p>
                  </div>
                </div>
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "patient" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      msg.role === "patient" ? "bg-indigo-600 text-white" :
                      msg.role === "system" ? "bg-green-50 border border-green-200 text-green-700" :
                      "bg-white border shadow-sm text-gray-700"
                    }`}>
                      {msg.role === "receptionist" && <p className="text-xs font-medium text-indigo-600 mb-1">AI Receptionist</p>}
                      <p className="text-sm">{msg.content}</p>
                      {msg.intent && <p className="text-xs mt-1 opacity-60">Detected intent: {msg.intent}</p>}
                    </div>
                  </div>
                ))}
                {processing && (
                  <div className="flex justify-start">
                    <div className="bg-white border rounded-2xl px-4 py-2.5 shadow-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t p-3 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type a patient message... (e.g., 'I want to book an appointment for Sunday')"
                  className="flex-1 rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  disabled={processing}
                />
                <button onClick={handleSendMessage} disabled={processing} className="rounded-lg bg-indigo-600 p-2 text-white hover:bg-indigo-700 disabled:opacity-50">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Integration Settings</h3>
                <div className="space-y-4">
                  {[
                    { name: "Twilio Phone", desc: "Inbound/outbound call handling", env: "TWILIO_ACCOUNT_SID" },
                    { name: "WhatsApp Business API", desc: "WhatsApp messaging via Twilio", env: "TWILIO_WHATSAPP_NUMBER" },
                    { name: "Gemini AI (NLU)", desc: "Natural language understanding for intent detection", env: "GEMINI_API_KEY", active: true },
                    { name: "Google Cloud SQL", desc: "Communication log storage", env: "DATABASE_URL", active: true },
                  ].map(({ name, desc, env, active }) => (
                    <div key={name} className="flex items-center justify-between p-4 rounded-lg border">
                      <div>
                        <p className="font-medium text-gray-900">{name}</p>
                        <p className="text-xs text-gray-500">{desc}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${active ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {active ? "Connected" : "Configure"}
                        </span>
                        <code className="text-xs text-gray-400">{env}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Clinic Information (Used by AI)</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-gray-50">
                    <p className="text-gray-500">Clinic Name</p>
                    <p className="font-medium text-gray-900">MediSoft Medical Center</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <p className="text-gray-500">Working Hours</p>
                    <p className="font-medium text-gray-900">Sun-Thu: 8AM-10PM</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <p className="text-gray-500">Location</p>
                    <p className="font-medium text-gray-900">King Fahd Road, Riyadh</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <p className="text-gray-500">Languages</p>
                    <p className="font-medium text-gray-900">Arabic, English</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
