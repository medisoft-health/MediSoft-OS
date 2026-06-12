"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
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
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ActivityType = "running" | "walking" | "cycling" | "swimming";
type TrackingState = "idle" | "active" | "paused";

interface ActivitySession {
  id: string;
  type: ActivityType;
  date: string;
  duration: number; // seconds
  distance: number; // km
  calories: number;
  avgPace: string; // min/km
  avgHeartRate: number;
  route: { lat: number; lng: number }[];
}

/**
 * MediSport — GPS Activity Tracker
 *
 * Features:
 * - Real-time GPS tracking with route visualization
 * - Multiple activity types (running, walking, cycling, swimming)
 * - Live stats (pace, distance, duration, heart rate, calories)
 * - Activity history with performance trends
 * - Weekly/monthly summaries
 */
export default function ActivityTrackerPage() {
  const t = useTranslations("SportStandalone");
  const tActivity = useTranslations("SportActivity");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const [trackingState, setTrackingState] = React.useState<TrackingState>("idle");
  const [activityType, setActivityType] = React.useState<ActivityType>("running");
  const [elapsedTime, setElapsedTime] = React.useState(0);
  const [distance, setDistance] = React.useState(0);
  const [currentPace, setCurrentPace] = React.useState("0:00");
  const [calories, setCalories] = React.useState(0);
  const [heartRate, setHeartRate] = React.useState(0);
  const [steps, setSteps] = React.useState(0);

  // Simulated activity history
  const [history] = React.useState<ActivitySession[]>([
    {
      id: "1",
      type: "running",
      date: new Date(Date.now() - 86400000).toISOString(),
      duration: 1800,
      distance: 5.2,
      calories: 420,
      avgPace: "5:46",
      avgHeartRate: 155,
      route: [],
    },
    {
      id: "2",
      type: "cycling",
      date: new Date(Date.now() - 172800000).toISOString(),
      duration: 3600,
      distance: 25.8,
      calories: 680,
      avgPace: "2:20",
      avgHeartRate: 140,
      route: [],
    },
    {
      id: "3",
      type: "walking",
      date: new Date(Date.now() - 259200000).toISOString(),
      duration: 2700,
      distance: 3.5,
      calories: 210,
      avgPace: "12:51",
      avgHeartRate: 105,
      route: [],
    },
    {
      id: "4",
      type: "running",
      date: new Date(Date.now() - 432000000).toISOString(),
      duration: 2400,
      distance: 7.1,
      calories: 560,
      avgPace: "5:38",
      avgHeartRate: 162,
      route: [],
    },
  ]);

  // Timer effect
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (trackingState === "active") {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
        // Simulate distance increase
        setDistance((prev) => prev + 0.002 + Math.random() * 0.001);
        // Simulate calorie burn
        setCalories((prev) => prev + 0.12 + Math.random() * 0.03);
        // Simulate heart rate
        setHeartRate(145 + Math.floor(Math.random() * 20));
        // Simulate steps
        setSteps((prev) => prev + 2 + Math.floor(Math.random() * 2));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [trackingState]);

  // Update pace
  React.useEffect(() => {
    if (distance > 0 && elapsedTime > 0) {
      const paceSeconds = elapsedTime / distance;
      const mins = Math.floor(paceSeconds / 60);
      const secs = Math.floor(paceSeconds % 60);
      setCurrentPace(`${mins}:${secs.toString().padStart(2, "0")}`);
    }
  }, [distance, elapsedTime]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = () => {
    setTrackingState("active");
    if (elapsedTime === 0) {
      setDistance(0);
      setCalories(0);
      setSteps(0);
    }
  };

  const handlePause = () => setTrackingState("paused");

  const handleStop = () => {
    setTrackingState("idle");
    setElapsedTime(0);
    setDistance(0);
    setCalories(0);
    setSteps(0);
    setHeartRate(0);
    setCurrentPace("0:00");
  };

  // Weekly stats
  const weeklyStats = {
    totalDistance: history.reduce((sum, s) => sum + s.distance, 0),
    totalDuration: history.reduce((sum, s) => sum + s.duration, 0),
    totalCalories: history.reduce((sum, s) => sum + s.calories, 0),
    totalSessions: history.length,
  };

  const activityTypes: { type: ActivityType; icon: React.ReactNode; label: string }[] = [
    { type: "running", icon: <Footprints className="h-4 w-4" />, label: tActivity("running") },
    { type: "walking", icon: <Route className="h-4 w-4" />, label: tActivity("walking") },
    { type: "cycling", icon: <Zap className="h-4 w-4" />, label: tActivity("cycling") },
    { type: "swimming", icon: <Flame className="h-4 w-4" />, label: tActivity("swimming") },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${locale}/trainee`}>
          <Button variant="ghost" size="icon" className="rounded-lg">
            <ArrowLeft className={`h-5 w-5 ${isRtl ? "rotate-180" : ""}`} />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{tActivity("title")}</h1>
          <p className="text-sm text-slate-500">{tActivity("subtitle")}</p>
        </div>
      </div>

      <Tabs defaultValue="track" className="space-y-4">
        <TabsList className="bg-slate-100 rounded-lg p-1 w-full">
          <TabsTrigger value="track" className="flex-1 rounded-md text-sm">
            <MapPin className="h-3.5 w-3.5 me-1.5" />
            {tActivity("track")}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 rounded-md text-sm">
            <Clock className="h-3.5 w-3.5 me-1.5" />
            {tActivity("history")}
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex-1 rounded-md text-sm">
            <TrendingUp className="h-3.5 w-3.5 me-1.5" />
            {tActivity("stats")}
          </TabsTrigger>
        </TabsList>

        {/* Track Tab */}
        <TabsContent value="track" className="space-y-4">
          {/* Activity Type Selector */}
          {trackingState === "idle" && (
            <div className="grid grid-cols-4 gap-2">
              {activityTypes.map(({ type, icon, label }) => (
                <button
                  key={type}
                  onClick={() => setActivityType(type)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                    activityType === type
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm"
                      : "border-slate-200 text-slate-600 hover:border-emerald-200"
                  }`}
                >
                  {icon}
                  <span className="text-[10px] font-medium">{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Map Placeholder */}
          <Card className="border-slate-100 overflow-hidden">
            <div className="relative h-48 bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
              {trackingState === "idle" ? (
                <div className="text-center">
                  <MapPin className="h-10 w-10 text-emerald-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">{tActivity("mapReady")}</p>
                  <p className="text-xs text-slate-400 mt-1">{tActivity("mapHint")}</p>
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/50 to-teal-100/50">
                  {/* Simulated route line */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200">
                    <path
                      d="M 50 150 Q 100 50 150 100 T 250 80 T 350 120"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeLinecap="round"
                      className="animate-pulse"
                    />
                    <circle cx="350" cy="120" r="6" fill="#10b981" className="animate-ping" />
                    <circle cx="350" cy="120" r="4" fill="#059669" />
                    <circle cx="50" cy="150" r="5" fill="#6366f1" />
                  </svg>
                  {/* Live indicator */}
                  <div className="absolute top-3 start-3">
                    <Badge className="bg-red-500 text-white border-0 text-[10px] animate-pulse">
                      {tActivity("live")}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Live Stats */}
          {trackingState !== "idle" && (
            <div className="grid grid-cols-3 gap-2">
              <StatCard icon={<Timer className="h-4 w-4 text-blue-500" />} label={tActivity("duration")} value={formatTime(elapsedTime)} />
              <StatCard icon={<Route className="h-4 w-4 text-emerald-500" />} label={tActivity("distance")} value={`${distance.toFixed(2)} km`} />
              <StatCard icon={<Flame className="h-4 w-4 text-orange-500" />} label={tActivity("calories")} value={`${Math.round(calories)}`} />
              <StatCard icon={<Footprints className="h-4 w-4 text-purple-500" />} label={tActivity("pace")} value={`${currentPace} /km`} />
              <StatCard icon={<Heart className="h-4 w-4 text-red-500" />} label={tActivity("heartRate")} value={heartRate > 0 ? `${heartRate} bpm` : "--"} />
              <StatCard icon={<Footprints className="h-4 w-4 text-indigo-500" />} label={tActivity("steps")} value={`${steps}`} />
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 pt-2">
            {trackingState === "idle" && (
              <Button
                onClick={handleStart}
                size="lg"
                className="h-16 w-16 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-200"
              >
                <Play className="h-6 w-6" />
              </Button>
            )}
            {trackingState === "active" && (
              <>
                <Button
                  onClick={handlePause}
                  size="lg"
                  className="h-14 w-14 rounded-full bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg"
                >
                  <Pause className="h-5 w-5" />
                </Button>
                <Button
                  onClick={handleStop}
                  size="lg"
                  className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
                >
                  <Square className="h-5 w-5" />
                </Button>
              </>
            )}
            {trackingState === "paused" && (
              <>
                <Button
                  onClick={handleStart}
                  size="lg"
                  className="h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg"
                >
                  <Play className="h-5 w-5" />
                </Button>
                <Button
                  onClick={handleStop}
                  size="lg"
                  className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
                >
                  <Square className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-3">
          {history.map((session) => (
            <Card key={session.id} className="border-slate-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      {session.type === "running" && <Footprints className="h-4 w-4 text-emerald-600" />}
                      {session.type === "cycling" && <Zap className="h-4 w-4 text-emerald-600" />}
                      {session.type === "walking" && <Route className="h-4 w-4 text-emerald-600" />}
                      {session.type === "swimming" && <Flame className="h-4 w-4 text-emerald-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{tActivity(session.type)}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(session.date).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {session.distance.toFixed(1)} km
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3">
                  <div className="text-center">
                    <p className="text-xs text-slate-500">{tActivity("duration")}</p>
                    <p className="text-sm font-medium">{formatTime(session.duration)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500">{tActivity("pace")}</p>
                    <p className="text-sm font-medium">{session.avgPace}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500">{tActivity("calories")}</p>
                    <p className="text-sm font-medium">{session.calories}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500">{tActivity("heartRate")}</p>
                    <p className="text-sm font-medium">{session.avgHeartRate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-4">
          {/* Weekly Summary */}
          <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-teal-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-emerald-500" />
                {tActivity("weeklySummary")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">{tActivity("totalDistance")}</p>
                  <p className="text-xl font-bold text-emerald-700">{weeklyStats.totalDistance.toFixed(1)} km</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{tActivity("totalDuration")}</p>
                  <p className="text-xl font-bold text-emerald-700">{formatTime(weeklyStats.totalDuration)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{tActivity("totalCalories")}</p>
                  <p className="text-xl font-bold text-orange-600">{weeklyStats.totalCalories}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{tActivity("sessions")}</p>
                  <p className="text-xl font-bold text-blue-600">{weeklyStats.totalSessions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Goal Progress */}
          <Card className="border-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{tActivity("weeklyGoal")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">{tActivity("distance")}</span>
                  <span className="text-emerald-600 font-medium">{weeklyStats.totalDistance.toFixed(1)}/30 km</span>
                </div>
                <Progress value={(weeklyStats.totalDistance / 30) * 100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">{tActivity("sessions")}</span>
                  <span className="text-emerald-600 font-medium">{weeklyStats.totalSessions}/5</span>
                </div>
                <Progress value={(weeklyStats.totalSessions / 5) * 100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">{tActivity("calories")}</span>
                  <span className="text-emerald-600 font-medium">{weeklyStats.totalCalories}/2500 kcal</span>
                </div>
                <Progress value={(weeklyStats.totalCalories / 2500) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Daily Activity Bar Chart (simplified) */}
          <Card className="border-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{tActivity("dailyActivity")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-1 h-24">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
                  const heights = [60, 80, 0, 45, 90, 30, 0];
                  return (
                    <div key={day} className="flex flex-col items-center gap-1 flex-1">
                      <div
                        className={`w-full rounded-t-sm transition-all ${
                          heights[i] > 0 ? "bg-emerald-400" : "bg-slate-100"
                        }`}
                        style={{ height: `${Math.max(4, heights[i])}%` }}
                      />
                      <span className="text-[9px] text-slate-500">{day}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="border-slate-100">
      <CardContent className="p-3 text-center">
        <div className="flex items-center justify-center mb-1">{icon}</div>
        <div className="text-sm font-bold text-slate-900">{value}</div>
        <div className="text-[9px] text-slate-500">{label}</div>
      </CardContent>
    </Card>
  );
}
