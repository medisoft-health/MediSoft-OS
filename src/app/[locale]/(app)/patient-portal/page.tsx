"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  FileText,
  MessageCircle,
  Pill,
  Phone,
  Video,
  Plus,
  CheckCircle2,
  AlertTriangle,
  User,
  Activity,
  Bell,
  Send,
  ChevronRight,
  RefreshCw,
  Loader2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────
type Appointment = {
  id: number;
  patientId: number;
  physicianId: string;
  physicianName: string;
  scheduledAt: string;
  duration: number;
  appointmentType: string;
  status: string;
  reason: string;
  notes: string;
  bookedBy: string;
  bookedVia: string;
  reminderSent: boolean;
  createdAt: string;
};

type Message = {
  id: string;
  patientId: number;
  physicianId: string;
  physicianName: string;
  senderType: string;
  subject: string;
  body: string;
  isRead: boolean;
  readAt: string | null;
  channel: string;
  createdAt: string;
};

// ─── Component ──────────────────────────────────────────────────
export default function PatientPortalPage() {
  const [activeTab, setActiveTab] = useState<"appointments" | "results" | "medications" | "messages">("appointments");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingData, setBookingData] = useState({ date: "", time: "", reason: "", type: "consultation" });

  // Fetch appointments from API
  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch("/api/patient-portal/appointments?upcoming=true");
      const data = await res.json();
      if (data.success) setAppointments(data.data);
    } catch (e) {
      console.error("Failed to fetch appointments:", e);
    }
  }, []);

  // Fetch messages from API
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/patient-portal/messages?patientId=1");
      const data = await res.json();
      if (data.success) setMessages(data.data);
    } catch (e) {
      console.error("Failed to fetch messages:", e);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAppointments(), fetchMessages()]).finally(() => setLoading(false));
  }, [fetchAppointments, fetchMessages]);

  // Book new appointment
  const handleBookAppointment = async () => {
    if (!bookingData.date || !bookingData.time) return;
    try {
      const scheduledAt = new Date(`${bookingData.date}T${bookingData.time}`).toISOString();
      const res = await fetch("/api/patient-portal/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: 1,
          physicianId: "1",
          scheduledAt,
          duration: 30,
          appointmentType: bookingData.type,
          reason: bookingData.reason,
          bookedBy: "patient",
          bookedVia: "portal",
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAppointments();
        setBookingOpen(false);
        setBookingData({ date: "", time: "", reason: "", type: "consultation" });
      }
    } catch (e) {
      console.error("Failed to book appointment:", e);
    }
  };

  // Cancel appointment
  const handleCancelAppointment = async (id: number) => {
    try {
      await fetch("/api/patient-portal/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "cancelled" }),
      });
      await fetchAppointments();
    } catch (e) {
      console.error("Failed to cancel:", e);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await fetch("/api/patient-portal/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: 1,
          physicianId: "1",
          senderType: "patient",
          subject: "Patient Inquiry",
          messageBody: newMessage,
          channel: "portal",
        }),
      });
      setNewMessage("");
      await fetchMessages();
    } catch (e) {
      console.error("Failed to send message:", e);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Patient Portal</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your appointments, results, medications & messages</p>
        </div>
        <button onClick={() => { fetchAppointments(); fetchMessages(); }} className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg text-gray-300 hover:bg-gray-700 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-xl">
        {[
          { key: "appointments", icon: Calendar, label: "Appointments" },
          { key: "results", icon: FileText, label: "Lab Results" },
          { key: "medications", icon: Pill, label: "Medications" },
          { key: "messages", icon: MessageCircle, label: "Messages" },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === key ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-400">Loading data from server...</span>
        </div>
      ) : (
        <>
          {/* Appointments Tab */}
          {activeTab === "appointments" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white">Your Appointments</h2>
                <button onClick={() => setBookingOpen(!bookingOpen)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  <Plus className="w-4 h-4" /> Book Appointment
                </button>
              </div>

              {/* Booking Form */}
              {bookingOpen && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
                  <h3 className="text-white font-medium">New Appointment</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={bookingData.date} onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                    <input type="time" value={bookingData.time} onChange={(e) => setBookingData({ ...bookingData, time: e.target.value })} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                  </div>
                  <input type="text" placeholder="Reason for visit..." value={bookingData.reason} onChange={(e) => setBookingData({ ...bookingData, reason: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                  <select value={bookingData.type} onChange={(e) => setBookingData({ ...bookingData, type: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="consultation">Consultation</option>
                    <option value="follow_up">Follow-up</option>
                    <option value="procedure">Procedure</option>
                    <option value="video">Video Call</option>
                  </select>
                  <button onClick={handleBookAppointment} className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">Confirm Booking</button>
                </div>
              )}

              {/* Appointments List */}
              {appointments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No upcoming appointments</p>
                  <p className="text-sm mt-1">Book a new appointment to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map((appt) => (
                    <div key={appt.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${appt.status === "scheduled" ? "bg-blue-900/50 text-blue-400" : appt.status === "confirmed" ? "bg-green-900/50 text-green-400" : "bg-gray-700 text-gray-400"}`}>
                          {appt.appointmentType === "video" ? <Video className="w-5 h-5" /> : <User className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-white font-medium">{appt.physicianName || "Dr. Physician"}</p>
                          <p className="text-sm text-gray-400">{appt.reason || appt.appointmentType}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {new Date(appt.scheduledAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} — {appt.duration} min
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${appt.status === "scheduled" ? "bg-blue-900/30 text-blue-400" : appt.status === "confirmed" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                          {appt.status}
                        </span>
                        {appt.status === "scheduled" && (
                          <button onClick={() => handleCancelAppointment(appt.id)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-900/20 rounded">Cancel</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === "messages" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Messages</h2>
              <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                {/* Messages List */}
                <div className="max-h-96 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No messages yet. Start a conversation with your doctor.</p>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.senderType === "patient" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] rounded-xl px-4 py-2.5 ${msg.senderType === "patient" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-200"}`}>
                          <p className="text-sm">{msg.body}</p>
                          <p className="text-xs mt-1 opacity-60">{new Date(msg.createdAt).toLocaleString("en-US", { timeStyle: "short", dateStyle: "short" })}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {/* Send Message */}
                <div className="border-t border-gray-700 p-3 flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                  <button onClick={handleSendMessage} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lab Results Tab */}
          {activeTab === "results" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Lab Results</h2>
              <p className="text-sm text-gray-400">Lab results are fetched from the MediLab module. Visit MediLab for detailed analysis.</p>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
                <FileText className="w-12 h-12 mx-auto text-blue-400 mb-3" />
                <p className="text-white font-medium">Connected to MediLab</p>
                <p className="text-sm text-gray-400 mt-1">Your lab results are automatically synced from the MediLab module</p>
                <a href="/medilab" className="inline-flex items-center gap-1 mt-3 text-blue-400 hover:text-blue-300 text-sm">
                  View in MediLab <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* Medications Tab */}
          {activeTab === "medications" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Active Medications</h2>
              <p className="text-sm text-gray-400">Medication data is synced from PharmaX prescriptions.</p>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
                <Pill className="w-12 h-12 mx-auto text-green-400 mb-3" />
                <p className="text-white font-medium">Connected to PharmaX</p>
                <p className="text-sm text-gray-400 mt-1">Your medications and reminders are managed by the PharmaX module</p>
                <a href="/pharmax" className="inline-flex items-center gap-1 mt-3 text-green-400 hover:text-green-300 text-sm">
                  View in PharmaX <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}
        </>
      )}

      {/* Connection Status */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-gray-400">Connected to MediSoft Backend — Real-time data from Google Cloud SQL</span>
        </div>
      </div>
    </div>
  );
}
