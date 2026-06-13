"use client";

/**
 * MediSport Live Session Component
 * 
 * Interactive workout session with:
 * - Exercise GIF/video display
 * - Auto rest timer with ±15s adjustment
 * - Set-by-set logging (weight, reps, RPE)
 * - Session progress bar
 * - Previous session comparison
 * - Audio/vibration alerts
 * - Personal record detection
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface SessionExercise {
  id?: string;
  name: string;
  nameAr?: string;
  gifUrl?: string;
  videoUrl?: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  order: number;
  isWarmup?: boolean;
  previousBest?: { weight: number; reps: number }[];
}

interface SetLog {
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean;
  isPersonalRecord?: boolean;
}

interface ExerciseLog {
  exerciseName: string;
  exerciseOrder: number;
  sets: SetLog[];
}

interface LiveSessionProps {
  workoutId?: string;
  workoutTitle: string;
  workoutTitleAr?: string;
  exercises: SessionExercise[];
  onSessionComplete: (summary: SessionSummary) => void;
  onSessionAbandon?: () => void;
  locale?: string;
}

export interface SessionSummary {
  durationSeconds: number;
  totalVolume: number;
  totalSets: number;
  completedExercises: number;
  totalExercises: number;
  personalRecords: { exerciseName: string; weight: number; reps: number }[];
  exerciseLogs: ExerciseLog[];
  moodRating?: number;
}

// ─────────────────────────────────────────────────────────────────
// Timer Hook
// ─────────────────────────────────────────────────────────────────

function useTimer(initialSeconds: number, onComplete: () => void) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [totalTime, setTotalTime] = useState(initialSeconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            onCompleteRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, timeLeft]);

  const start = useCallback((seconds?: number) => {
    const t = seconds || initialSeconds;
    setTotalTime(t);
    setTimeLeft(t);
    setIsRunning(true);
  }, [initialSeconds]);

  const pause = useCallback(() => setIsRunning(false), []);
  const resume = useCallback(() => setIsRunning(true), []);
  const add15 = useCallback(() => { setTimeLeft(prev => prev + 15); setTotalTime(prev => prev + 15); }, []);
  const sub15 = useCallback(() => { setTimeLeft(prev => Math.max(0, prev - 15)); }, []);
  const skip = useCallback(() => { setTimeLeft(0); setIsRunning(false); onCompleteRef.current(); }, []);

  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  return { timeLeft, isRunning, progress, start, pause, resume, add15, sub15, skip };
}

// ─────────────────────────────────────────────────────────────────
// Session Timer (total elapsed)
// ─────────────────────────────────────────────────────────────────

function useElapsedTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  const stop = useCallback(() => setIsRunning(false), []);
  return { elapsed, stop };
}

// ─────────────────────────────────────────────────────────────────
// Utility functions
// ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function playAlertSound() {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.value = 0.3;
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, 300);
  } catch {}
  // Vibration
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export default function LiveSession({
  workoutId,
  workoutTitle,
  workoutTitleAr,
  exercises,
  onSessionComplete,
  onSessionAbandon,
  locale = "ar",
}: LiveSessionProps) {
  const t = useTranslations("SportTraining");
  const isRTL = locale === "ar";

  // Session state
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [currentSetIdx, setCurrentSetIdx] = useState(0);
  const [phase, setPhase] = useState<"exercise" | "rest" | "complete">("exercise");
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [personalRecords, setPersonalRecords] = useState<{ exerciseName: string; weight: number; reps: number }[]>([]);
  const [showMoodRating, setShowMoodRating] = useState(false);
  const [moodRating, setMoodRating] = useState<number>(3);

  // Current set input
  const [weightInput, setWeightInput] = useState<string>("");
  const [repsInput, setRepsInput] = useState<string>("");
  const [rpeInput, setRpeInput] = useState<number>(7);

  // Timers
  const { elapsed, stop: stopElapsed } = useElapsedTimer();
  const currentExercise = exercises[currentExerciseIdx];
  const restTimer = useTimer(currentExercise?.restSeconds || 90, () => {
    playAlertSound();
    setPhase("exercise");
  });

  // Initialize exercise logs
  useEffect(() => {
    const logs: ExerciseLog[] = exercises.map(ex => ({
      exerciseName: ex.name,
      exerciseOrder: ex.order,
      sets: Array.from({ length: ex.sets }, (_, i) => ({
        setNumber: i + 1,
        weightKg: null,
        reps: null,
        rpe: null,
        completed: false,
      })),
    }));
    setExerciseLogs(logs);
  }, [exercises]);

  // Calculate progress
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const completedSets = exerciseLogs.reduce(
    (sum, log) => sum + log.sets.filter(s => s.completed).length, 0
  );
  const overallProgress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  // Log a set
  const logSet = useCallback(() => {
    const weight = parseFloat(weightInput) || 0;
    const reps = parseInt(repsInput) || 0;

    if (reps === 0) return; // Must log at least reps

    // Check for personal record
    const prevBest = currentExercise?.previousBest?.[currentSetIdx];
    const isNewPR = prevBest ? (weight > prevBest.weight || (weight === prevBest.weight && reps > prevBest.reps)) : false;

    if (isNewPR) {
      setPersonalRecords(prev => [...prev, { exerciseName: currentExercise.name, weight, reps }]);
    }

    // Update log
    setExerciseLogs(prev => {
      const updated = [...prev];
      if (updated[currentExerciseIdx]) {
        updated[currentExerciseIdx].sets[currentSetIdx] = {
          setNumber: currentSetIdx + 1,
          weightKg: weight,
          reps,
          rpe: rpeInput,
          completed: true,
          isPersonalRecord: isNewPR,
        };
      }
      return updated;
    });

    // Move to next set or exercise
    if (currentSetIdx < currentExercise.sets - 1) {
      // More sets → start rest timer
      setCurrentSetIdx(prev => prev + 1);
      setPhase("rest");
      restTimer.start(currentExercise.restSeconds);
    } else if (currentExerciseIdx < exercises.length - 1) {
      // More exercises → move to next
      setCurrentExerciseIdx(prev => prev + 1);
      setCurrentSetIdx(0);
      setPhase("rest");
      restTimer.start(currentExercise.restSeconds + 30); // Extra rest between exercises
    } else {
      // Session complete
      setPhase("complete");
      stopElapsed();
      setShowMoodRating(true);
    }

    // Reset inputs
    setRepsInput("");
    // Keep weight for next set (common pattern)
  }, [weightInput, repsInput, rpeInput, currentExerciseIdx, currentSetIdx, currentExercise, exercises, restTimer, stopElapsed]);

  // Complete session
  const completeSession = useCallback(() => {
    const totalVolume = exerciseLogs.reduce((sum, log) => {
      return sum + log.sets.reduce((setSum, s) => {
        return setSum + (s.completed ? (s.weightKg || 0) * (s.reps || 0) : 0);
      }, 0);
    }, 0);

    const summary: SessionSummary = {
      durationSeconds: elapsed,
      totalVolume,
      totalSets: completedSets,
      completedExercises: exerciseLogs.filter(l => l.sets.some(s => s.completed)).length,
      totalExercises: exercises.length,
      personalRecords,
      exerciseLogs,
      moodRating,
    };

    onSessionComplete(summary);
  }, [exerciseLogs, elapsed, completedSets, exercises, personalRecords, moodRating, onSessionComplete]);

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  if (showMoodRating) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white flex flex-col items-center justify-center p-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className="text-center space-y-6 max-w-md">
          <div className="text-5xl">🎉</div>
          <h2 className="text-2xl font-bold">{isRTL ? "أحسنت! أكملت الجلسة" : "Great Job! Session Complete"}</h2>
          <p className="text-gray-400">{isRTL ? "كيف تشعر الآن؟" : "How do you feel now?"}</p>
          <div className="flex gap-3 justify-center">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                onClick={() => setMoodRating(rating)}
                className={`w-14 h-14 rounded-full text-2xl transition-all ${
                  moodRating === rating
                    ? "bg-emerald-500 scale-110 shadow-lg shadow-emerald-500/30"
                    : "bg-gray-800 hover:bg-gray-700"
                }`}
              >
                {["😫", "😕", "😐", "😊", "🔥"][rating - 1]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mt-6">
            <div className="bg-gray-800/50 rounded-xl p-4">
              <div className="text-gray-400">{isRTL ? "المدة" : "Duration"}</div>
              <div className="text-xl font-bold text-emerald-400">{formatTime(elapsed)}</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4">
              <div className="text-gray-400">{isRTL ? "الحجم الكلي" : "Total Volume"}</div>
              <div className="text-xl font-bold text-emerald-400">
                {exerciseLogs.reduce((sum, log) => sum + log.sets.reduce((s, set) => s + (set.completed ? (set.weightKg || 0) * (set.reps || 0) : 0), 0), 0).toLocaleString()} kg
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4">
              <div className="text-gray-400">{isRTL ? "المجموعات" : "Sets"}</div>
              <div className="text-xl font-bold">{completedSets}/{totalSets}</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4">
              <div className="text-gray-400">{isRTL ? "أرقام قياسية" : "PRs"}</div>
              <div className="text-xl font-bold text-yellow-400">{personalRecords.length} 🏆</div>
            </div>
          </div>
          <button
            onClick={completeSession}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-lg transition-all"
          >
            {isRTL ? "حفظ الجلسة" : "Save Session"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white flex flex-col" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onSessionAbandon}
              className="text-gray-400 hover:text-white p-2"
            >
              ✕
            </button>
            <div>
              <h1 className="font-bold text-sm">{isRTL ? workoutTitleAr || workoutTitle : workoutTitle}</h1>
              <span className="text-xs text-gray-400">{formatTime(elapsed)}</span>
            </div>
          </div>
          <div className="text-xs text-emerald-400 font-mono">
            {currentExerciseIdx + 1}/{exercises.length}
          </div>
        </div>
        {/* Overall progress bar */}
        <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {phase === "rest" ? (
          /* ─── Rest Timer Screen ─── */
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-2">{isRTL ? "وقت الراحة" : "Rest Time"}</p>
              <div className="text-7xl font-bold font-mono text-white tabular-nums">
                {formatTime(restTimer.timeLeft)}
              </div>
            </div>

            {/* Circular progress */}
            <div className="relative w-48 h-48">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#1f2937" strokeWidth="6" />
                <circle
                  cx="50" cy="50" r="45" fill="none"
                  stroke="url(#timerGradient)" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - restTimer.progress / 100)}`}
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Timer controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={restTimer.sub15}
                className="w-14 h-14 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-lg font-bold transition-all"
              >
                -15
              </button>
              <button
                onClick={restTimer.skip}
                className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-sm font-bold transition-all shadow-lg shadow-emerald-500/20"
              >
                {isRTL ? "تخطي" : "Skip"}
              </button>
              <button
                onClick={restTimer.add15}
                className="w-14 h-14 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-lg font-bold transition-all"
              >
                +15
              </button>
            </div>

            {/* Next exercise preview */}
            <div className="text-center text-sm text-gray-400">
              <p>{isRTL ? "التالي:" : "Next:"}</p>
              <p className="text-white font-medium">
                {isRTL ? currentExercise?.nameAr || currentExercise?.name : currentExercise?.name}
                {" — "}{isRTL ? "المجموعة" : "Set"} {currentSetIdx + 1}/{currentExercise?.sets}
              </p>
            </div>
          </div>
        ) : (
          /* ─── Exercise Screen ─── */
          <div className="flex-1 flex flex-col">
            {/* Exercise media */}
            <div className="relative bg-gray-800/50 aspect-video max-h-[35vh] flex items-center justify-center overflow-hidden">
              {currentExercise?.gifUrl ? (
                <img
                  src={currentExercise.gifUrl}
                  alt={currentExercise.name}
                  className="h-full object-contain"
                />
              ) : currentExercise?.videoUrl ? (
                <video
                  src={currentExercise.videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full object-contain"
                />
              ) : (
                <div className="text-6xl opacity-30">🏋️</div>
              )}
              {/* Exercise name overlay */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-gray-900/90 to-transparent p-4">
                <h2 className="font-bold text-lg">
                  {isRTL ? currentExercise?.nameAr || currentExercise?.name : currentExercise?.name}
                </h2>
                <p className="text-sm text-gray-300">
                  {isRTL ? "المجموعة" : "Set"} {currentSetIdx + 1} / {currentExercise?.sets}
                  {" • "}{currentExercise?.repMin}-{currentExercise?.repMax} {isRTL ? "تكرار" : "reps"}
                </p>
              </div>
            </div>

            {/* Set logging form */}
            <div className="flex-1 p-4 space-y-4">
              {/* Previous best comparison */}
              {currentExercise?.previousBest?.[currentSetIdx] && (
                <div className="bg-gray-800/50 rounded-xl p-3 flex items-center gap-3">
                  <span className="text-xs text-gray-400">{isRTL ? "آخر مرة:" : "Last time:"}</span>
                  <span className="text-sm font-medium">
                    {currentExercise.previousBest[currentSetIdx].weight} kg × {currentExercise.previousBest[currentSetIdx].reps}
                  </span>
                </div>
              )}

              {/* Input row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">{isRTL ? "الوزن (كجم)" : "Weight (kg)"}</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={weightInput}
                    onChange={e => setWeightInput(e.target.value)}
                    placeholder="0"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-center text-xl font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">{isRTL ? "التكرارات" : "Reps"}</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={repsInput}
                    onChange={e => setRepsInput(e.target.value)}
                    placeholder={`${currentExercise?.repMin}-${currentExercise?.repMax}`}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-center text-xl font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* RPE slider */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{isRTL ? "مستوى الجهد (RPE)" : "Effort (RPE)"}</span>
                  <span className={`font-bold ${rpeInput >= 9 ? "text-red-400" : rpeInput >= 7 ? "text-yellow-400" : "text-emerald-400"}`}>
                    {rpeInput}/10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={rpeInput}
                  onChange={e => setRpeInput(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                  <span>{isRTL ? "سهل" : "Easy"}</span>
                  <span>{isRTL ? "أقصى جهد" : "Max effort"}</span>
                </div>
              </div>

              {/* Log set button */}
              <button
                onClick={logSet}
                disabled={!repsInput}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl font-bold text-lg transition-all shadow-lg shadow-emerald-500/20 disabled:shadow-none"
              >
                {isRTL ? `تسجيل المجموعة ${currentSetIdx + 1}` : `Log Set ${currentSetIdx + 1}`}
              </button>

              {/* Completed sets for current exercise */}
              {exerciseLogs[currentExerciseIdx]?.sets.filter(s => s.completed).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">{isRTL ? "المجموعات المكتملة:" : "Completed sets:"}</p>
                  <div className="flex flex-wrap gap-2">
                    {exerciseLogs[currentExerciseIdx].sets
                      .filter(s => s.completed)
                      .map((s, i) => (
                        <div
                          key={i}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                            s.isPersonalRecord
                              ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                              : "bg-gray-800 text-gray-300"
                          }`}
                        >
                          {s.weightKg}kg × {s.reps}
                          {s.isPersonalRecord && " 🏆"}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Skip exercise button */}
              <button
                onClick={() => {
                  if (currentExerciseIdx < exercises.length - 1) {
                    setCurrentExerciseIdx(prev => prev + 1);
                    setCurrentSetIdx(0);
                    setWeightInput("");
                    setRepsInput("");
                  } else {
                    setPhase("complete");
                    stopElapsed();
                    setShowMoodRating(true);
                  }
                }}
                className="w-full py-2 text-gray-400 hover:text-white text-sm transition-all"
              >
                {isRTL ? "تخطي هذا التمرين ←" : "Skip this exercise →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
