"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Mood = "energetic" | "normal" | "tired" | "injured";
type Readiness = "yes" | "no" | "half";

const MOODS: { value: Mood; emoji: string; labelAr: string; labelEn: string; color: string }[] = [
  { value: "energetic", emoji: "⚡", labelAr: "نشيط", labelEn: "Energetic", color: "bg-emerald-500" },
  { value: "normal", emoji: "😊", labelAr: "عادي", labelEn: "Normal", color: "bg-blue-500" },
  { value: "tired", emoji: "😴", labelAr: "تعبان", labelEn: "Tired", color: "bg-amber-500" },
  { value: "injured", emoji: "🤕", labelAr: "مصاب", labelEn: "Injured", color: "bg-red-500" },
];

const READINESS_OPTIONS: { value: Readiness; emoji: string; labelAr: string; labelEn: string }[] = [
  { value: "yes", emoji: "💪", labelAr: "جاهز!", labelEn: "Ready!" },
  { value: "half", emoji: "🤔", labelAr: "نص نص", labelEn: "50/50" },
  { value: "no", emoji: "🛋️", labelAr: "مش النهارده", labelEn: "Not today" },
];

export default function DailyCheckinPage() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0: mood, 1: sleep, 2: readiness, 3: result
  const [mood, setMood] = useState<Mood | null>(null);
  const [sleepQuality, setSleepQuality] = useState(7);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(false);
  const [adaptation, setAdaptation] = useState<any>(null);
  const [error, setError] = useState("");

  const submitCheckin = useCallback(async (selectedReadiness: Readiness) => {
    if (!mood) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sport/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "checkin",
          mood,
          sleepQuality,
          readiness: selectedReadiness,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAdaptation(data.adaptation);
        setStep(3);
      } else {
        setError(data.error || "حدث خطأ");
      }
    } catch {
      setError("خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }, [mood, sleepQuality]);

  const handleMoodSelect = (m: Mood) => {
    setMood(m);
    setStep(1);
  };

  const handleSleepConfirm = () => {
    setStep(2);
  };

  const handleReadinessSelect = (r: Readiness) => {
    setReadiness(r);
    submitCheckin(r);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
      {/* Progress dots */}
      <div className="flex gap-2 mb-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              i <= step ? "bg-emerald-400 scale-110" : "bg-gray-600"
            }`}
          />
        ))}
      </div>

      {/* Step 0: Mood */}
      {step === 0 && (
        <div className="text-center animate-fadeIn w-full max-w-md">
          <h1 className="text-2xl font-bold text-white mb-2">صباح الخير! ☀️</h1>
          <p className="text-gray-400 mb-8">حاسس بإيه النهارده؟</p>
          <div className="grid grid-cols-2 gap-4">
            {MOODS.map((m) => (
              <button
                key={m.value}
                onClick={() => handleMoodSelect(m.value)}
                className={`p-6 rounded-2xl border-2 border-gray-700 hover:border-emerald-400 transition-all duration-200 transform hover:scale-105 active:scale-95 bg-gray-800/50 backdrop-blur`}
              >
                <span className="text-4xl block mb-2">{m.emoji}</span>
                <span className="text-white font-medium">{m.labelAr}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Sleep Quality */}
      {step === 1 && (
        <div className="text-center animate-fadeIn w-full max-w-md">
          <h1 className="text-2xl font-bold text-white mb-2">نمت كويس؟ 🌙</h1>
          <p className="text-gray-400 mb-8">قيّم جودة نومك</p>
          
          <div className="mb-8">
            <div className="text-6xl font-bold text-emerald-400 mb-4">{sleepQuality}</div>
            <input
              type="range"
              min="1"
              max="10"
              value={sleepQuality}
              onChange={(e) => setSleepQuality(parseInt(e.target.value))}
              className="w-full h-3 bg-gray-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
              style={{ direction: "ltr" }}
            />
            <div className="flex justify-between text-sm text-gray-500 mt-2" style={{ direction: "ltr" }}>
              <span>😫 1</span>
              <span>😴 5</span>
              <span>😇 10</span>
            </div>
          </div>

          <button
            onClick={handleSleepConfirm}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-95"
          >
            التالي →
          </button>
        </div>
      )}

      {/* Step 2: Readiness */}
      {step === 2 && (
        <div className="text-center animate-fadeIn w-full max-w-md">
          <h1 className="text-2xl font-bold text-white mb-2">جاهز تتمرن؟ 🏋️</h1>
          <p className="text-gray-400 mb-8">قرّر يومك</p>
          <div className="flex flex-col gap-4">
            {READINESS_OPTIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => handleReadinessSelect(r.value)}
                disabled={loading}
                className="p-5 rounded-2xl border-2 border-gray-700 hover:border-emerald-400 transition-all duration-200 transform hover:scale-[1.02] active:scale-95 bg-gray-800/50 backdrop-blur flex items-center gap-4 disabled:opacity-50"
              >
                <span className="text-3xl">{r.emoji}</span>
                <span className="text-white font-medium text-lg">{r.labelAr}</span>
              </button>
            ))}
          </div>
          {loading && (
            <div className="mt-6 text-emerald-400 animate-pulse">جاري التحليل...</div>
          )}
        </div>
      )}

      {/* Step 3: Result / Adaptation */}
      {step === 3 && adaptation && (
        <div className="text-center animate-fadeIn w-full max-w-md">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <span className="text-4xl">✅</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">تم التسجيل!</h1>
          </div>

          {/* Adaptation Card */}
          <div className="bg-gray-800/80 backdrop-blur rounded-2xl p-6 border border-gray-700 mb-6 text-start">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-xl">🎯</span>
              </div>
              <div>
                <p className="text-emerald-400 font-bold">{adaptation.suggestedActivityAr}</p>
                <p className="text-gray-500 text-sm">
                  الشدة: {Math.round(adaptation.intensityMultiplier * 100)}%
                </p>
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed">{adaptation.messageAr}</p>
          </div>

          {/* Intensity Bar */}
          <div className="bg-gray-800/80 rounded-xl p-4 mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">شدة التمرين المقترحة</span>
              <span className="text-emerald-400 font-bold">{Math.round(adaptation.intensityMultiplier * 100)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-1000 ${
                  adaptation.intensityMultiplier >= 1 ? "bg-emerald-500" :
                  adaptation.intensityMultiplier >= 0.5 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.round(adaptation.intensityMultiplier * 100)}%` }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/ar/trainee/journey")}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-all"
            >
              رحلتي
            </button>
            <button
              onClick={() => router.push("/ar/trainee/training")}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all"
            >
              ابدأ التمرين 💪
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 text-red-400 text-sm">{error}</div>
      )}

      {/* Back button */}
      {step > 0 && step < 3 && (
        <button
          onClick={() => setStep(step - 1)}
          className="mt-6 text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← رجوع
        </button>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}
