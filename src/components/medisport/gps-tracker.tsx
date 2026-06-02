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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Activity,
  Bike,
  Calendar,
  ChevronRight,
  Clock,
  Flame,
  Footprints,
  Heart,
  MapPin,
  Pause,
  Play,
  Route,
  Square,
  Timer,
  TrendingUp,
  Trophy,
  Waves,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

type ActivityType = "run" | "walk" | "cycle" | "swim" | "gym" | "hiit" | "yoga" | "other";

interface ActivityRecord {
  id: string;
  type: ActivityType;
  startTime: string;
  endTime: string;
  duration: number; // seconds
  distance: number; // km
  calories: number;
  avgPace: string; // min/km
  avgHeartRate?: number;
  notes: string;
}

interface WorkoutStats {
  totalWorkouts: number;
  totalDuration: number; // seconds
  totalDistance: number; // km
  totalCalories: number;
  thisWeekWorkouts: number;
  thisWeekDuration: number;
  bestPace: string;
  longestRun: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const ACTIVITY_TYPES: { id: ActivityType; label: string; icon: string; calPerMin: number; color: string }[] = [
  { id: "run", label: "جري", icon: "🏃", calPerMin: 11, color: "from-orange-500 to-red-500" },
  { id: "walk", label: "مشي", icon: "🚶", calPerMin: 5, color: "from-green-500 to-emerald-500" },
  { id: "cycle", label: "دراجة", icon: "🚴", calPerMin: 9, color: "from-blue-500 to-cyan-500" },
  { id: "swim", label: "سباحة", icon: "🏊", calPerMin: 10, color: "from-cyan-500 to-blue-500" },
  { id: "gym", label: "جيم", icon: "🏋️", calPerMin: 7, color: "from-purple-500 to-indigo-500" },
  { id: "hiit", label: "HIIT", icon: "⚡", calPerMin: 14, color: "from-red-500 to-pink-500" },
  { id: "yoga", label: "يوجا", icon: "🧘", calPerMin: 4, color: "from-teal-500 to-green-500" },
  { id: "other", label: "أخرى", icon: "🎯", calPerMin: 6, color: "from-gray-500 to-slate-500" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function calculatePace(distanceKm: number, durationSeconds: number): string {
  if (distanceKm <= 0) return "--:--";
  const paceSeconds = durationSeconds / distanceKm;
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.floor(paceSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getActivities(): ActivityRecord[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("medisport_activities");
  return stored ? JSON.parse(stored) : [];
}

function saveActivities(activities: ActivityRecord[]) {
  localStorage.setItem("medisport_activities", JSON.stringify(activities));
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff)).toISOString().split("T")[0];
}

function calculateStats(activities: ActivityRecord[]): WorkoutStats {
  const weekStart = getWeekStart();
  const thisWeek = activities.filter((a) => a.startTime >= weekStart);

  return {
    totalWorkouts: activities.length,
    totalDuration: activities.reduce((sum, a) => sum + a.duration, 0),
    totalDistance: Math.round(activities.reduce((sum, a) => sum + a.distance, 0) * 10) / 10,
    totalCalories: activities.reduce((sum, a) => sum + a.calories, 0),
    thisWeekWorkouts: thisWeek.length,
    thisWeekDuration: thisWeek.reduce((sum, a) => sum + a.duration, 0),
    bestPace: activities.length > 0
      ? activities
          .filter((a) => a.distance > 0)
          .reduce((best, a) => {
            const pace = a.duration / a.distance;
            return pace < best ? pace : best;
          }, Infinity) === Infinity
        ? "--:--"
        : calculatePace(1, activities.filter((a) => a.distance > 0).reduce((best, a) => {
            const pace = a.duration / a.distance;
            return pace < best ? pace : best;
          }, Infinity))
      : "--:--",
    longestRun: Math.round(Math.max(...activities.map((a) => a.distance), 0) * 10) / 10,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GPS Tracker Button (Entry Point)
// ═══════════════════════════════════════════════════════════════════════════════

export function GpsTrackerButton() {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Card className="cursor-pointer border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 hover:shadow-lg transition-all hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <Route className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base">تتبع التمرين</h3>
                <p className="text-xs text-muted-foreground">سجل نشاطك مع المؤقت</p>
              </div>
              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                <Activity className="w-3 h-3 mr-1" />
                GPS
              </Badge>
            </div>
          </CardContent>
        </Card>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-right flex items-center gap-2">
            <Route className="w-5 h-5 text-orange-600" />
            تتبع النشاط
          </SheetTitle>
          <SheetDescription className="text-right">
            سجل تمارينك مع المؤقت والمسافة والسعرات المحروقة
          </SheetDescription>
        </SheetHeader>
        <GpsTrackerContent />
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GPS Tracker Content
// ═══════════════════════════════════════════════════════════════════════════════

function GpsTrackerContent() {
  const [view, setView] = React.useState<"home" | "active" | "summary" | "history">("home");
  const [selectedType, setSelectedType] = React.useState<ActivityType>("run");
  const [isRunning, setIsRunning] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [distance, setDistance] = React.useState(0);
  const [activities, setActivities] = React.useState<ActivityRecord[]>(getActivities());
  const [lastActivity, setLastActivity] = React.useState<ActivityRecord | null>(null);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = React.useRef<string>("");

  const stats = React.useMemo(() => calculateStats(activities), [activities]);
  const activityConfig = ACTIVITY_TYPES.find((t) => t.id === selectedType)!;

  // Timer logic
  React.useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
        // Simulate distance for run/walk/cycle
        if (["run", "walk", "cycle"].includes(selectedType)) {
          const speedKmPerSec = selectedType === "run" ? 0.003 : selectedType === "cycle" ? 0.005 : 0.0015;
          setDistance((prev) => Math.round((prev + speedKmPerSec) * 1000) / 1000);
        }
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, isPaused, selectedType]);

  const startWorkout = () => {
    setIsRunning(true);
    setIsPaused(false);
    setElapsed(0);
    setDistance(0);
    startTimeRef.current = new Date().toISOString();
    setView("active");
    toast.success(`🏁 بدأ تمرين ${activityConfig.label}!`);
  };

  const pauseWorkout = () => {
    setIsPaused(!isPaused);
  };

  const stopWorkout = () => {
    setIsRunning(false);
    setIsPaused(false);

    const calories = Math.round((elapsed / 60) * activityConfig.calPerMin);
    const record: ActivityRecord = {
      id: Date.now().toString(),
      type: selectedType,
      startTime: startTimeRef.current,
      endTime: new Date().toISOString(),
      duration: elapsed,
      distance: Math.round(distance * 100) / 100,
      calories,
      avgPace: calculatePace(distance, elapsed),
      notes: "",
    };

    const newActivities = [record, ...activities];
    setActivities(newActivities);
    saveActivities(newActivities);
    setLastActivity(record);
    setView("summary");
    toast.success("🎉 تمرين مكتمل!");
  };

  const currentCalories = Math.round((elapsed / 60) * activityConfig.calPerMin);

  return (
    <div className="mt-4 space-y-4" dir="rtl">
      {/* ═══ Home View ═══ */}
      {view === "home" && (
        <>
          {/* Weekly Stats */}
          <Card className="bg-gradient-to-br from-orange-50 to-amber-50">
            <CardContent className="p-4">
              <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-500" />
                هذا الأسبوع
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.thisWeekWorkouts}</div>
                  <div className="text-xs text-muted-foreground">تمرين</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(stats.thisWeekDuration / 60)}
                  </div>
                  <div className="text-xs text-muted-foreground">دقيقة</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {activities
                      .filter((a) => a.startTime >= getWeekStart())
                      .reduce((sum, a) => sum + a.calories, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">سعرة</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Type Selection */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">اختر نوع النشاط</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-4 gap-2">
                {ACTIVITY_TYPES.map((type) => (
                  <div
                    key={type.id}
                    className={`p-3 rounded-xl text-center cursor-pointer transition-all border-2 ${
                      selectedType === type.id
                        ? "border-orange-400 bg-orange-50 ring-2 ring-orange-200"
                        : "border-gray-200 hover:border-orange-300"
                    }`}
                    onClick={() => setSelectedType(type.id)}
                  >
                    <span className="text-2xl block mb-1">{type.icon}</span>
                    <span className="text-[10px] font-medium">{type.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Start Button */}
          <Button
            className={`w-full h-14 text-lg font-bold bg-gradient-to-r ${activityConfig.color} text-white`}
            onClick={startWorkout}
          >
            <Play className="w-6 h-6 mr-2" />
            ابدأ {activityConfig.label}
          </Button>

          {/* All-time Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                إحصائياتك الكلية
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                  <div className="text-lg font-bold">{stats.totalWorkouts}</div>
                  <div className="text-[10px] text-muted-foreground">تمرين كلي</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                  <div className="text-lg font-bold">{stats.totalDistance} km</div>
                  <div className="text-[10px] text-muted-foreground">مسافة كلية</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                  <div className="text-lg font-bold">{Math.round(stats.totalDuration / 3600)}h</div>
                  <div className="text-[10px] text-muted-foreground">ساعات تمرين</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                  <div className="text-lg font-bold">{stats.totalCalories.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">سعرة محروقة</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* History Button */}
          {activities.length > 0 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setView("history")}
            >
              <Clock className="w-4 h-4 mr-2" />
              سجل التمارين ({activities.length})
            </Button>
          )}
        </>
      )}

      {/* ═══ Active Workout View ═══ */}
      {view === "active" && (
        <div className="space-y-4">
          {/* Activity Type Badge */}
          <div className="text-center">
            <Badge className={`bg-gradient-to-r ${activityConfig.color} text-white text-sm px-4 py-1`}>
              {activityConfig.icon} {activityConfig.label}
            </Badge>
          </div>

          {/* Timer Display */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
            <CardContent className="p-8 text-center">
              <div className="text-6xl font-mono font-bold mb-4 tracking-wider">
                {formatDuration(elapsed)}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-2xl font-bold text-orange-400">
                    {distance.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">كم</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {calculatePace(distance, elapsed)}
                  </div>
                  <div className="text-xs text-gray-400">دقيقة/كم</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-400">
                    {currentCalories}
                  </div>
                  <div className="text-xs text-gray-400">سعرة</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Stats */}
          <div className="grid grid-cols-2 gap-2">
            <Card>
              <CardContent className="p-3 text-center">
                <Timer className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                <div className="text-sm font-bold">{Math.round(elapsed / 60)} دقيقة</div>
                <div className="text-[10px] text-muted-foreground">المدة</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <Flame className="w-5 h-5 mx-auto text-red-500 mb-1" />
                <div className="text-sm font-bold">{activityConfig.calPerMin} سعرة/دقيقة</div>
                <div className="text-[10px] text-muted-foreground">معدل الحرق</div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="flex gap-3 justify-center">
            <Button
              size="lg"
              variant="outline"
              className="w-16 h-16 rounded-full"
              onClick={pauseWorkout}
            >
              {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
            </Button>
            <Button
              size="lg"
              className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white"
              onClick={stopWorkout}
            >
              <Square className="w-8 h-8" />
            </Button>
          </div>

          {isPaused && (
            <div className="text-center">
              <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                ⏸️ متوقف مؤقتاً
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* ═══ Summary View ═══ */}
      {view === "summary" && lastActivity && (
        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="text-xl font-bold text-green-800 mb-1">تمرين مكتمل!</h3>
              <p className="text-sm text-green-600">
                {ACTIVITY_TYPES.find((t) => t.id === lastActivity.type)?.icon}{" "}
                {ACTIVITY_TYPES.find((t) => t.id === lastActivity.type)?.label}
              </p>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="w-6 h-6 mx-auto text-blue-500 mb-2" />
                <div className="text-xl font-bold">{formatDuration(lastActivity.duration)}</div>
                <div className="text-xs text-muted-foreground">المدة</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Route className="w-6 h-6 mx-auto text-green-500 mb-2" />
                <div className="text-xl font-bold">{lastActivity.distance} km</div>
                <div className="text-xs text-muted-foreground">المسافة</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Flame className="w-6 h-6 mx-auto text-red-500 mb-2" />
                <div className="text-xl font-bold">{lastActivity.calories}</div>
                <div className="text-xs text-muted-foreground">سعرة محروقة</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Zap className="w-6 h-6 mx-auto text-amber-500 mb-2" />
                <div className="text-xl font-bold">{lastActivity.avgPace}</div>
                <div className="text-xs text-muted-foreground">دقيقة/كم</div>
              </CardContent>
            </Card>
          </div>

          {/* Motivational Message */}
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-3 text-center">
              <p className="text-sm">
                {lastActivity.calories > 300
                  ? "💪 تمرين قوي! حرقت سعرات كتير — استمر!"
                  : lastActivity.duration > 1800
                  ? "⏱️ مدة ممتازة! الاستمرارية هي المفتاح!"
                  : "🌟 كل تمرين بيفرق — أحسنت!"}
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setView("history")}
            >
              <Clock className="w-4 h-4 mr-1" />
              السجل
            </Button>
            <Button
              className="flex-1"
              onClick={() => setView("home")}
            >
              <Play className="w-4 h-4 mr-1" />
              تمرين جديد
            </Button>
          </div>
        </div>
      )}

      {/* ═══ History View ═══ */}
      {view === "history" && (
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("home")}
            className="flex items-center gap-1"
          >
            <ChevronRight className="w-4 h-4" />
            رجوع
          </Button>

          <h4 className="font-bold text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" />
            سجل التمارين
          </h4>

          {activities.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Route className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-muted-foreground">لسه مسجلتش أي تمرين</p>
                <Button className="mt-3" onClick={() => setView("home")}>
                  ابدأ أول تمرين
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {activities.slice(0, 20).map((activity) => {
                const typeConfig = ACTIVITY_TYPES.find((t) => t.id === activity.type)!;
                const date = new Date(activity.startTime);
                const dateStr = date.toLocaleDateString("ar-EG", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });

                return (
                  <Card key={activity.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${typeConfig.color} flex items-center justify-center text-lg`}>
                          {typeConfig.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{typeConfig.label}</span>
                            <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {formatDuration(activity.duration)}
                            </span>
                            {activity.distance > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Route className="w-3 h-3" />
                                {activity.distance} km
                              </span>
                            )}
                            <span className="flex items-center gap-0.5">
                              <Flame className="w-3 h-3" />
                              {activity.calories} سعرة
                            </span>
                          </div>
                        </div>
                        {activity.distance > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            {activity.avgPace}/km
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
