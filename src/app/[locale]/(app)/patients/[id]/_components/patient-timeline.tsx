"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, FlaskConical, Loader2, Pill, ScanLine, Stethoscope, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchPatientTimeline, type TimelineEvent } from "@/lib/medilab/client";
import { cn } from "@/lib/utils";

interface Props { patientId: number; }

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  lab: { icon: FlaskConical, color: "text-blue-600", bg: "bg-blue-100" },
  encounter: { icon: Stethoscope, color: "text-purple-600", bg: "bg-purple-100" },
  prescription: { icon: Pill, color: "text-green-600", bg: "bg-green-100" },
  scan: { icon: ScanLine, color: "text-indigo-600", bg: "bg-indigo-100" },
  vital: { icon: Activity, color: "text-teal-600", bg: "bg-teal-100" },
  milestone: { icon: Star, color: "text-amber-600", bg: "bg-amber-100" },
};

const TYPE_LABELS: Record<string, string> = {
  lab: "تحاليل", encounter: "زيارات", prescription: "أدوية", scan: "أشعة", vital: "قياسات",
};

function formatEventDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return "—"; }
}

function getMonthKey(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } catch { return ""; }
}

export function PatientTimeline({ patientId }: Props) {
  const [events, setEvents] = React.useState<TimelineEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(false);
  const [offset, setOffset] = React.useState(0);
  const [activeFilter, setActiveFilter] = React.useState<string | null>(null);

  async function loadEvents(reset = false) {
    const newOffset = reset ? 0 : offset;
    if (reset) setLoading(true); else setLoadingMore(true);

    const types = activeFilter ? [activeFilter] : undefined;
    const result = await fetchPatientTimeline(patientId, { limit: 30, offset: newOffset, types });

    if (result) {
      if (reset) {
        setEvents(result.events);
      } else {
        setEvents((prev) => [...prev, ...result.events]);
      }
      setHasMore(result.hasMore);
      setOffset(newOffset + result.events.length);
    }
    setLoading(false);
    setLoadingMore(false);
  }

  React.useEffect(() => { loadEvents(true); }, [patientId, activeFilter]);

  function toggleFilter(type: string) {
    setActiveFilter((prev) => (prev === type ? null : type));
  }

  // Group events by month
  const grouped = React.useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const e of events) {
      const key = getMonthKey(e.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [events]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {"📅"} السجل الزمني — Clinical Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter pills */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
            <button key={type} onClick={() => toggleFilter(type)}
              className={cn("rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                activeFilter === type ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50")}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-10 justify-center text-sm text-gray-500">
            <Loader2 className="size-4 animate-spin" /> جاري التحميل...
          </div>
        ) : events.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">لا توجد أحداث مسجلة</p>
        ) : (
          <div className="relative ps-8">
            {/* Vertical line */}
            <div className="absolute start-3 top-0 bottom-0 w-0.5 bg-gray-200" />

            {[...grouped.entries()].map(([month, monthEvents]) => (
              <div key={month}>
                {/* Month separator */}
                <div className="relative mb-3 mt-4 first:mt-0">
                  <span className="bg-white pe-2 text-xs font-semibold text-gray-500 relative z-10">{month}</span>
                </div>

                {monthEvents.map((event) => {
                  const config = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.vital;
                  const Icon = config.icon;
                  return (
                    <div key={event.id} className="relative mb-4 flex gap-3">
                      {/* Dot */}
                      <div className={cn("absolute -start-5 top-1 flex size-6 items-center justify-center rounded-full", config.bg)}>
                        <Icon className={cn("size-3.5", config.color)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:shadow transition-shadow">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{event.title}</div>
                            {event.subtitle && <div className="text-xs text-gray-500 mt-0.5">{event.subtitle}</div>}
                          </div>
                          <span className="text-[10px] text-gray-400 shrink-0">{formatEventDate(event.date)}</span>
                        </div>

                        {/* Metadata badges */}
                        {event.type === "lab" && event.metadata.abnormalCount != null && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px]">{String(event.metadata.totalTests)} tests</Badge>
                            {Number(event.metadata.abnormalCount) > 0 && (
                              <Badge variant="warning" className="text-[9px]">{String(event.metadata.abnormalCount)} abnormal</Badge>
                            )}
                          </div>
                        )}

                        {/* Link */}
                        {event.detailUrl && (
                          <Link href={event.detailUrl} className="mt-2 inline-block text-xs text-blue-600 hover:underline">
                            عرض التفاصيل →
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="pt-4 text-center">
                <Button variant="outline" size="sm" onClick={() => loadEvents(false)} disabled={loadingMore}>
                  {loadingMore ? <Loader2 className="size-4 animate-spin me-1" /> : null}
                  تحميل المزيد
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
