export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  User,
  Phone,
  Video,
  MapPin,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  Filter,
  Search,
  MoreHorizontal,
  Bell,
  FileText,
  Stethoscope,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────
type Appointment = {
  id: string;
  patientId: number;
  patientName?: string;
  physicianId: string;
  physicianName?: string;
  scheduledAt: string;
  duration: number;
  appointmentType: string;
  status: string;
  reason: string | null;
  notes: string | null;
  bookedBy: string;
  bookedVia: string;
  reminderSent: boolean;
  createdAt: string;
};

type ViewMode = "day" | "week" | "list";

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  scheduled: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  confirmed: { bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-700 dark:text-green-300", dot: "bg-green-500" },
  checked_in: { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
  in_progress: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  completed: { bg: "bg-gray-50 dark:bg-gray-800/30", text: "text-gray-600 dark:text-gray-400", dot: "bg-gray-400" },
  cancelled: { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-300", dot: "bg-red-500" },
  no_show: { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
};

const TYPE_ICONS: Record<string, typeof Stethoscope> = {
  consultation: Stethoscope,
  follow_up: RefreshCw,
  urgent: Bell,
  telehealth: Video,
  phone: Phone,
  procedure: FileText,
};

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7 AM to 6 PM

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

// ─── Demo Data ───────────────────────────────────────────────────
function generateDemoAppointments(): Appointment[] {
  const today = new Date();
  const baseDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const demos: Appointment[] = [
    {
      id: "appt-001",
      patientId: 1,
      patientName: "Ahmed Al-Thani",
      physicianId: "dr-001",
      physicianName: "Dr. Hamada Ghaith",
      scheduledAt: new Date(baseDate.getTime() + 8 * 3600000).toISOString(),
      duration: 30,
      appointmentType: "consultation",
      status: "confirmed",
      reason: "Annual checkup — Diabetes follow-up",
      notes: "HbA1c due, review medications",
      bookedBy: "ai-receptionist",
      bookedVia: "whatsapp",
      reminderSent: true,
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
      id: "appt-002",
      patientId: 2,
      patientName: "Fatima Al-Mohannadi",
      physicianId: "dr-001",
      physicianName: "Dr. Hamada Ghaith",
      scheduledAt: new Date(baseDate.getTime() + 9 * 3600000).toISOString(),
      duration: 45,
      appointmentType: "follow_up",
      status: "scheduled",
      reason: "Post-surgery follow-up — Cholecystectomy",
      notes: "Check wound healing, review labs",
      bookedBy: "manual",
      bookedVia: "web",
      reminderSent: true,
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: "appt-003",
      patientId: 3,
      patientName: "Mohammed Al-Kuwari",
      physicianId: "dr-001",
      physicianName: "Dr. Hamada Ghaith",
      scheduledAt: new Date(baseDate.getTime() + 10.5 * 3600000).toISOString(),
      duration: 20,
      appointmentType: "telehealth",
      status: "confirmed",
      reason: "Blood pressure medication review",
      notes: null,
      bookedBy: "ai-receptionist",
      bookedVia: "phone",
      reminderSent: false,
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: "appt-004",
      patientId: 4,
      patientName: "Sara Al-Marri",
      physicianId: "dr-001",
      physicianName: "Dr. Hamada Ghaith",
      scheduledAt: new Date(baseDate.getTime() + 13 * 3600000).toISOString(),
      duration: 30,
      appointmentType: "consultation",
      status: "scheduled",
      reason: "New patient — Chronic fatigue",
      notes: "First visit, full workup needed",
      bookedBy: "patient",
      bookedVia: "patient-portal",
      reminderSent: false,
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: "appt-005",
      patientId: 5,
      patientName: "Khalid Al-Naimi",
      physicianId: "dr-001",
      physicianName: "Dr. Hamada Ghaith",
      scheduledAt: new Date(baseDate.getTime() + 14.5 * 3600000).toISOString(),
      duration: 15,
      appointmentType: "phone",
      status: "scheduled",
      reason: "Lab results discussion",
      notes: "CBC + Lipid panel results ready",
      bookedBy: "ai-receptionist",
      bookedVia: "sms",
      reminderSent: true,
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      id: "appt-006",
      patientId: 6,
      patientName: "Noura Al-Sulaiti",
      physicianId: "dr-001",
      physicianName: "Dr. Hamada Ghaith",
      scheduledAt: new Date(baseDate.getTime() + 86400000 + 9 * 3600000).toISOString(),
      duration: 30,
      appointmentType: "consultation",
      status: "scheduled",
      reason: "Thyroid function review",
      notes: null,
      bookedBy: "manual",
      bookedVia: "web",
      reminderSent: false,
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
    {
      id: "appt-007",
      patientId: 7,
      patientName: "Ali Al-Hajri",
      physicianId: "dr-001",
      physicianName: "Dr. Hamada Ghaith",
      scheduledAt: new Date(baseDate.getTime() + 86400000 + 11 * 3600000).toISOString(),
      duration: 60,
      appointmentType: "procedure",
      status: "confirmed",
      reason: "Minor procedure — Skin biopsy",
      notes: "Consent form signed",
      bookedBy: "manual",
      bookedVia: "web",
      reminderSent: true,
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
  ];

  return demos;
}

// ─── Main Component ──────────────────────────────────────────────
export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      // Try real API first
      const res = await fetch("/api/patient-portal/appointments?upcoming=true");
      if (res.ok) {
        const data = await res.json();
        if (data.appointments?.length > 0) {
          setAppointments(data.appointments);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Fall through to demo data
    }
    // Use demo data
    setAppointments(generateDemoAppointments());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Filter appointments
  const filteredAppointments = appointments.filter((appt) => {
    if (filterStatus !== "all" && appt.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        appt.patientName?.toLowerCase().includes(q) ||
        appt.reason?.toLowerCase().includes(q) ||
        appt.appointmentType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Appointments for selected date (day view)
  const dayAppointments = filteredAppointments
    .filter((appt) => isSameDay(new Date(appt.scheduledAt), selectedDate))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  // Stats
  const todayCount = appointments.filter((a) => isSameDay(new Date(a.scheduledAt), new Date())).length;
  const confirmedCount = appointments.filter((a) => a.status === "confirmed").length;
  const pendingCount = appointments.filter((a) => a.status === "scheduled").length;
  const telehealthCount = appointments.filter((a) => ["telehealth", "phone"].includes(a.appointmentType)).length;

  const navigateDate = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate);
  };

  return (
    <div className="min-h-screen bg-[color:var(--color-background)]">
      {/* Header */}
      <div className="border-b border-[color:var(--color-border)] bg-[color:var(--color-card)]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[color:var(--color-foreground)]">
                Appointments
              </h1>
              <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
                Manage your clinical schedule and patient appointments
              </p>
            </div>
            <button
              onClick={() => setShowNewForm(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[color:var(--color-brand-pink)] to-[color:var(--color-brand-magenta)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
            >
              <Plus className="size-4" />
              New Appointment
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Today", value: todayCount, icon: Calendar, color: "text-blue-600" },
            { label: "Confirmed", value: confirmedCount, icon: CheckCircle2, color: "text-green-600" },
            { label: "Pending", value: pendingCount, icon: Clock, color: "text-amber-600" },
            { label: "Telehealth", value: telehealthCount, icon: Video, color: "text-purple-600" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg bg-[color:var(--color-muted)]/50 p-2 ${stat.color}`}>
                  <stat.icon className="size-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[color:var(--color-foreground)]">{stat.value}</div>
                  <div className="text-xs text-[color:var(--color-muted-foreground)]">{stat.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Controls Bar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button onClick={() => navigateDate(-1)} className="rounded-lg border border-[color:var(--color-border)] p-2 hover:bg-[color:var(--color-muted)]/50">
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="rounded-lg border border-[color:var(--color-border)] px-3 py-2 text-sm font-medium hover:bg-[color:var(--color-muted)]/50"
            >
              Today
            </button>
            <button onClick={() => navigateDate(1)} className="rounded-lg border border-[color:var(--color-border)] p-2 hover:bg-[color:var(--color-muted)]/50">
              <ChevronRight className="size-4" />
            </button>
            <span className="ml-2 text-lg font-semibold text-[color:var(--color-foreground)]">
              {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </span>
          </div>

          {/* View Mode + Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
              <input
                type="text"
                placeholder="Search appointments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 rounded-lg border border-[color:var(--color-input)] bg-[color:var(--color-card)] pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-9 rounded-lg border border-[color:var(--color-input)] bg-[color:var(--color-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked_in">Checked In</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <div className="flex rounded-lg border border-[color:var(--color-border)]">
              {(["day", "week", "list"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    viewMode === mode
                      ? "bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]"
                      : "text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]/50"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <button onClick={loadAppointments} className="rounded-lg border border-[color:var(--color-border)] p-2 hover:bg-[color:var(--color-muted)]/50">
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-[color:var(--color-brand-pink)]" />
          </div>
        ) : viewMode === "list" ? (
          /* ─── List View ─── */
          <div className="space-y-3">
            {filteredAppointments.length === 0 ? (
              <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-[color:var(--color-border)]">
                <div className="text-center">
                  <Calendar className="mx-auto size-10 text-[color:var(--color-muted-foreground)]" />
                  <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">No appointments found</p>
                </div>
              </div>
            ) : (
              filteredAppointments.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appointment={appt}
                  onClick={() => setSelectedAppointment(appt)}
                />
              ))
            )}
          </div>
        ) : (
          /* ─── Day View (Timeline) ─── */
          <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] overflow-hidden">
            <div className="grid grid-cols-[80px_1fr]">
              {HOURS.map((hour) => {
                const hourAppts = dayAppointments.filter((a) => {
                  const h = new Date(a.scheduledAt).getHours();
                  return h === hour;
                });
                return (
                  <React.Fragment key={hour}>
                    <div className="border-b border-r border-[color:var(--color-border)] px-3 py-4 text-right text-xs font-medium text-[color:var(--color-muted-foreground)]">
                      {hour > 12 ? `${hour - 12} PM` : hour === 12 ? "12 PM" : `${hour} AM`}
                    </div>
                    <div className="relative min-h-[72px] border-b border-[color:var(--color-border)] p-2">
                      {hourAppts.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {hourAppts.map((appt) => {
                            const colors = STATUS_COLORS[appt.status] || STATUS_COLORS.scheduled;
                            const TypeIcon = TYPE_ICONS[appt.appointmentType] || Stethoscope;
                            return (
                              <button
                                key={appt.id}
                                onClick={() => setSelectedAppointment(appt)}
                                className={`flex items-center gap-3 rounded-lg ${colors.bg} px-3 py-2 text-left transition-all hover:shadow-md`}
                              >
                                <div className={`size-2 rounded-full ${colors.dot}`} />
                                <TypeIcon className={`size-4 ${colors.text}`} />
                                <div className="min-w-0 flex-1">
                                  <div className={`text-sm font-medium ${colors.text}`}>
                                    {appt.patientName || `Patient #${appt.patientId}`}
                                  </div>
                                  <div className="text-xs text-[color:var(--color-muted-foreground)]">
                                    {formatTime(new Date(appt.scheduledAt))} · {appt.duration}min · {appt.reason?.slice(0, 40)}
                                  </div>
                                </div>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${colors.bg} ${colors.text}`}>
                                  {appt.status.replace("_", " ")}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
        />
      )}

      {/* New Appointment Modal */}
      {showNewForm && (
        <NewAppointmentModal onClose={() => setShowNewForm(false)} />
      )}
    </div>
  );
}

// ─── Appointment Card (List View) ────────────────────────────────
function AppointmentCard({ appointment, onClick }: { appointment: Appointment; onClick: () => void }) {
  const colors = STATUS_COLORS[appointment.status] || STATUS_COLORS.scheduled;
  const TypeIcon = TYPE_ICONS[appointment.appointmentType] || Stethoscope;
  const date = new Date(appointment.scheduledAt);

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-4 text-left transition-all hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div className={`rounded-xl p-3 ${colors.bg}`}>
          <TypeIcon className={`size-5 ${colors.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
              {appointment.patientName || `Patient #${appointment.patientId}`}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${colors.bg} ${colors.text}`}>
              {appointment.status.replace("_", " ")}
            </span>
            {appointment.reminderSent && (
              <Bell className="size-3.5 text-green-500" />
            )}
          </div>
          <div className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
            {formatDate(date)} · {formatTime(date)} · {appointment.duration} min · {appointment.appointmentType.replace("_", " ")}
          </div>
          {appointment.reason && (
            <div className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
              {appointment.reason}
            </div>
          )}
        </div>
        <div className="text-xs text-[color:var(--color-muted-foreground)]">
          via {appointment.bookedVia}
        </div>
      </div>
    </button>
  );
}

// ─── Appointment Detail Modal ────────────────────────────────────
function AppointmentDetailModal({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  const colors = STATUS_COLORS[appointment.status] || STATUS_COLORS.scheduled;
  const date = new Date(appointment.scheduledAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[color:var(--color-foreground)]">Appointment Details</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-[color:var(--color-muted)]/50">
            <XCircle className="size-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <User className="size-5 text-[color:var(--color-muted-foreground)]" />
            <div>
              <div className="text-sm font-semibold">{appointment.patientName || `Patient #${appointment.patientId}`}</div>
              <div className="text-xs text-[color:var(--color-muted-foreground)]">Patient ID: {appointment.patientId}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="size-5 text-[color:var(--color-muted-foreground)]" />
            <div>
              <div className="text-sm font-semibold">{date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
              <div className="text-xs text-[color:var(--color-muted-foreground)]">{formatTime(date)} — {appointment.duration} minutes</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Stethoscope className="size-5 text-[color:var(--color-muted-foreground)]" />
            <div>
              <div className="text-sm font-semibold capitalize">{appointment.appointmentType.replace("_", " ")}</div>
              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${colors.bg} ${colors.text}`}>
                {appointment.status.replace("_", " ")}
              </span>
            </div>
          </div>

          {appointment.reason && (
            <div className="rounded-lg bg-[color:var(--color-muted)]/30 p-3">
              <div className="text-xs font-semibold text-[color:var(--color-muted-foreground)]">Reason</div>
              <div className="mt-1 text-sm">{appointment.reason}</div>
            </div>
          )}

          {appointment.notes && (
            <div className="rounded-lg bg-[color:var(--color-muted)]/30 p-3">
              <div className="text-xs font-semibold text-[color:var(--color-muted-foreground)]">Notes</div>
              <div className="mt-1 text-sm">{appointment.notes}</div>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-[color:var(--color-muted-foreground)]">
            <span>Booked by: {appointment.bookedBy}</span>
            <span>Via: {appointment.bookedVia}</span>
            {appointment.reminderSent && <span className="text-green-600">Reminder sent</span>}
          </div>

          <div className="flex gap-2 pt-2">
            <button className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700">
              <CheckCircle2 className="mr-1 inline size-4" /> Check In
            </button>
            <button className="flex-1 rounded-xl border border-[color:var(--color-border)] py-2.5 text-sm font-semibold hover:bg-[color:var(--color-muted)]/50">
              Reschedule
            </button>
            <button className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── New Appointment Modal ───────────────────────────────────────
function NewAppointmentModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[color:var(--color-foreground)]">New Appointment</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-[color:var(--color-muted)]/50">
            <XCircle className="size-5" />
          </button>
        </div>

        <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); onClose(); }}>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[color:var(--color-muted-foreground)]">Patient</label>
            <input type="text" placeholder="Search patient name or MRN..." className="w-full rounded-lg border border-[color:var(--color-input)] bg-[color:var(--color-card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--color-muted-foreground)]">Date</label>
              <input type="date" className="w-full rounded-lg border border-[color:var(--color-input)] bg-[color:var(--color-card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--color-muted-foreground)]">Time</label>
              <input type="time" className="w-full rounded-lg border border-[color:var(--color-input)] bg-[color:var(--color-card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--color-muted-foreground)]">Type</label>
              <select className="w-full rounded-lg border border-[color:var(--color-input)] bg-[color:var(--color-card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]">
                <option value="consultation">Consultation</option>
                <option value="follow_up">Follow-up</option>
                <option value="telehealth">Telehealth</option>
                <option value="phone">Phone Call</option>
                <option value="procedure">Procedure</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--color-muted-foreground)]">Duration</label>
              <select className="w-full rounded-lg border border-[color:var(--color-input)] bg-[color:var(--color-card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]">
                <option value="15">15 minutes</option>
                <option value="30" selected>30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[color:var(--color-muted-foreground)]">Reason</label>
            <textarea rows={2} placeholder="Reason for visit..." className="w-full rounded-lg border border-[color:var(--color-input)] bg-[color:var(--color-card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]" />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 rounded-xl bg-gradient-to-r from-[color:var(--color-brand-pink)] to-[color:var(--color-brand-magenta)] py-2.5 text-sm font-semibold text-white hover:shadow-md">
              Book Appointment
            </button>
            <button type="button" onClick={onClose} className="rounded-xl border border-[color:var(--color-border)] px-4 py-2.5 text-sm font-semibold hover:bg-[color:var(--color-muted)]/50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
