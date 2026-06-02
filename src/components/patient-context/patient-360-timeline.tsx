"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Apple,
  BookOpen,
  Brain,
  Calendar,
  ChevronDown,
  Dumbbell,
  FileText,
  Filter,
  Heart,
  HeartPulse,
  Loader2,
  Pill,
  ScanLine,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
} from "lucide-react";
import { usePatientContext } from "./patient-context-provider";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface PatientEvent {
  id: number;
  patientId: number;
  category: string;
  eventType: string;
  source: string;
  title: string;
  titleEn?: string;
  description?: string;
  data?: Record<string, unknown>;
  numericValue?: string;
  numericUnit?: string;
  eventDate: string;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Category Config
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORY_CONFIG: Record<string, { icon: typeof Activity; color: string; label: string }> = {
  clinical: { icon: Stethoscope, color: "text-purple-700 bg-purple-100", label: "سريري" },
  medication: { icon: Pill, color: "text-pink-700 bg-pink-100", label: "أدوية" },
  lab: { icon: FileText, color: "text-blue-700 bg-blue-100", label: "تحاليل" },
  imaging: { icon: ScanLine, color: "text-cyan-700 bg-cyan-100", label: "أشعة" },
  vitals: { icon: HeartPulse, color: "text-rose-700 bg-rose-100", label: "علامات حيوية" },
  nutrition: { icon: Apple, color: "text-green-700 bg-green-100", label: "تغذية" },
  exercise: { icon: Dumbbell, color: "text-orange-700 bg-orange-100", label: "تمارين" },
  wellness: { icon: Heart, color: "text-red-700 bg-red-100", label: "صحة عامة" },
  social: { icon: Users, color: "text-indigo-700 bg-indigo-100", label: "اجتماعي" },
  education: { icon: BookOpen, color: "text-amber-700 bg-amber-100", label: "تعليم" },
  system: { icon: Sparkles, color: "text-slate-700 bg-slate-100", label: "نظام" },
};

const SOURCE_LABELS: Record<string, string> = {
  medisport: "MediSport",
  mediscript: "MediScript",
  pharmax: "PharmaX",
  medilab: "MediLab",
  mediscan: "MediScan",
  system: "النظام",
};

// ═══════════════════════════════════════════════════════════════════════════════
// Patient 360 Timeline Component
// ═══════════════════════════════════════════════════════════════════════════════

export function Patient360Timeline() {
  const { patient, mode } = usePatientContext();
  const [events, setEvents] = React.useState<PatientEvent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(false);
  const [offset, setOffset] = React.useState(0);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

  const fetchEvents = React.useCallback(
    async (reset = false) => {
      if (!patient) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          patientId: patient.id.toString(),
          limit: "30",
          offset: reset ? "0" : offset.toString(),
        });
        if (selectedCategory) params.set("category", selectedCategory);

        const res = await fetch(`/api/patient-events?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (reset) {
            setEvents(data.events);
            setOffset(data.events.length);
          } else {
            setEvents((prev) => [...prev, ...data.events]);
            setOffset((prev) => prev + data.events.length);
          }
          setHasMore(data.hasMore);
        }
      } catch (err) {
        console.error("Failed to fetch events:", err);
      } finally {
        setLoading(false);
      }
    },
    [patient, offset, selectedCategory]
  );

  // Fetch on mount and when patient/category changes
  React.useEffect(() => {
    if (patient) {
      setOffset(0);
      fetchEvents(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id, selectedCategory]);

  if (mode !== "patient" || !patient) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-muted">
            <Brain className="size-5 text-muted-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold">اختر مريض لعرض السجل الشامل</div>
            <div className="mt-1 text-xs text-muted-foreground">
              استخدم زر اختيار المريض في الشريط العلوي لعرض التاريخ الطبي الكامل
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group events by date
  const groupedEvents = React.useMemo(() => {
    const groups: Record<string, PatientEvent[]> = {};
    for (const event of events) {
      const date = new Date(event.eventDate).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(event);
    }
    return groups;
  }, [events]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              السجل الشامل — Patient 360°
            </CardTitle>
            <CardDescription>
              كل الأحداث الطبية والرياضية والغذائية مرتبة زمنياً
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {events.length} حدث
          </Badge>
        </div>

        {/* Category Filters */}
        <div className="flex gap-1.5 flex-wrap mt-3">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelectedCategory(null)}
          >
            <Filter className="w-3 h-3 mr-1" />
            الكل
          </Button>
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
            <Button
              key={key}
              variant={selectedCategory === key ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedCategory(key)}
            >
              <config.icon className="w-3 h-3 mr-1" />
              {config.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {events.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            لا توجد أحداث مسجلة بعد. ابدأ باستخدام أي Module لتسجيل البيانات.
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([date, dateEvents]) => (
            <div key={date}>
              {/* Date Header */}
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{date}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Events for this date */}
              <ol className="relative space-y-3 border-r-2 border-border pr-6 mr-2">
                {dateEvents.map((event) => {
                  const config = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.system;
                  const Icon = config.icon;
                  return (
                    <li key={event.id} className="relative">
                      <span
                        className={`absolute -right-[29px] grid size-7 place-items-center rounded-full ring-4 ring-background ${config.color}`}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <div className="rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight">{event.title}</p>
                            {event.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {new Date(event.eventDate).toLocaleTimeString("ar-EG", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {event.numericValue && (
                              <Badge variant="secondary" className="text-[10px] h-4">
                                {event.numericValue} {event.numericUnit}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px] h-4">
                            {SOURCE_LABELS[event.source] || event.source}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] h-4">
                            {config.label}
                          </Badge>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchEvents(false)}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 mr-1" />
              )}
              تحميل المزيد
            </Button>
          </div>
        )}

        {loading && events.length === 0 && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
