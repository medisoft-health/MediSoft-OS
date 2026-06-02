"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Radio,
  Mic,
  MicOff,
  FileText,
  Clock,
  CheckCircle2,
  Pause,
  Play,
  Square,
  Wand2,
  Stethoscope,
  MessageSquare,
  AlertCircle,
  Download,
  Share2,
  Volume2,
  VolumeX,
  Settings,
  Layers,
  Brain,
} from "lucide-react";

// ─── Component ───────────────────────────────────────────────────
export default function AmbientScribePage() {
  const t = useTranslations("AIAgents");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeTab, setActiveTab] = useState<"scribe" | "notes" | "settings">("scribe");
  const [generatedNote, setGeneratedNote] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Fetch previous sessions from API
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch("/api/ambient-scribe?action=sessions");
      const result = await res.json();
      if (result.success) setSessions(result.data.sessions || []);
    } catch (e) { console.error(e); }
    finally { setSessionsLoading(false); }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // When recording stops, send transcript to API for SOAP generation
  const handleStopRecording = async () => {
    setIsRecording(false);
    setIsPaused(false);
    setGenerating(true);
    try {
      const res = await fetch("/api/ambient-scribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-note",
          transcript: [
            { speaker: "doctor", text: "Good morning, Ahmed. How have you been feeling since our last visit? Any changes in your blood pressure readings?" },
            { speaker: "patient", text: "Good morning, doctor. I have been monitoring it daily. Most readings are around 130 over 85, but yesterday it went up to 145 over 92." },
            { speaker: "doctor", text: "I see. Were you under any particular stress yesterday? And how is your medication compliance? Are you taking the Amlodipine regularly?" },
            { speaker: "patient", text: "Yes, I take it every morning. Yesterday was stressful at work. I also noticed some ankle swelling in the evening." },
          ],
          duration: elapsedTime,
          patientId: null,
          settings: { noteFormat: "soap", language: "en", autoCoding: true },
        }),
      });
      const result = await res.json();
      if (result.success) {
        setGeneratedNote(result.data);
        setActiveTab("notes");
        fetchSessions();
      }
    } catch (e) { console.error(e); }
    finally { setGenerating(false); }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const tabs = [
    { id: "scribe" as const, label: t("ambientScribe"), icon: Radio },
    { id: "notes" as const, label: t("generatedNotes"), icon: FileText },
    { id: "settings" as const, label: t("settingsTab"), icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Radio className="h-7 w-7 text-violet-600" />
            {t("ambientScribe")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t("ambientScribeDesc")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isRecording && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              {t("recording")}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white text-violet-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "scribe" && (
        <div className="space-y-6">
          {/* Recording Interface */}
          <div className="rounded-xl border bg-white p-8 shadow-sm">
            <div className="text-center">
              {/* Timer */}
              <div className="mb-6">
                <p className="text-4xl font-mono font-bold text-gray-900">{formatTime(elapsedTime)}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {isRecording ? (isPaused ? t("paused") : t("recordingConsultation")) : t("readyToStart")}
                </p>
              </div>

              {/* Waveform Visualization */}
              {isRecording && !isPaused && (
                <div className="flex items-center justify-center gap-1 h-16 mb-6">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-violet-400 rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 100}%`,
                        animationDelay: `${i * 50}ms`,
                        animationDuration: `${500 + Math.random() * 500}ms`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                {!isRecording ? (
                  <button
                    onClick={() => { setIsRecording(true); setElapsedTime(0); }}
                    className="flex items-center gap-3 rounded-2xl bg-violet-600 px-8 py-4 text-white hover:bg-violet-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    <Mic className="h-6 w-6" />
                    <span className="text-lg font-medium">{t("startAmbientRecording")}</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setIsPaused(!isPaused)}
                      className="rounded-full border-2 border-gray-300 p-4 hover:bg-gray-50"
                    >
                      {isPaused ? <Play className="h-6 w-6 text-gray-700" /> : <Pause className="h-6 w-6 text-gray-700" />}
                    </button>
                    <button
                      onClick={handleStopRecording}
                      className="rounded-full bg-red-600 p-4 text-white hover:bg-red-700 shadow-lg"
                      disabled={generating}
                    >
                      <Square className="h-6 w-6" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Live Transcript */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-violet-600" />
                <h3 className="font-medium text-gray-900">Live Transcript</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Speaker detection: ON</span>
              </div>
            </div>
            <div className="p-5 min-h-[200px] max-h-[400px] overflow-y-auto">
              {isRecording ? (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 h-fit">Doctor</span>
                    <p className="text-sm text-gray-700">Good morning, Ahmed. How have you been feeling since our last visit? Any changes in your blood pressure readings?</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 h-fit">Patient</span>
                    <p className="text-sm text-gray-700">Good morning, doctor. I have been monitoring it daily. Most readings are around 130 over 85, but yesterday it went up to 145 over 92.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 h-fit">Doctor</span>
                    <p className="text-sm text-gray-700">I see. Were you under any particular stress yesterday? And how is your medication compliance? Are you taking the Amlodipine regularly?</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 h-fit">Patient</span>
                    <p className="text-sm text-gray-700">Yes, I take it every morning. Yesterday was stressful at work. I also noticed some ankle swelling in the evening.</p>
                  </div>
                  {!isPaused && (
                    <div className="flex items-center gap-2 text-violet-500">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-xs">Listening...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] text-gray-400">
                  <Radio className="h-10 w-10 mb-3" />
                  <p className="text-sm">Start recording to see the live transcript</p>
                  <p className="text-xs mt-1">The AI will automatically detect speakers and transcribe the conversation</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Analysis Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-5 w-5 text-violet-600" />
                <h3 className="font-medium text-gray-900">Clinical Insights</h3>
              </div>
              <div className="space-y-2">
                <div className="rounded-lg bg-violet-50 p-3">
                  <p className="text-xs font-medium text-violet-700">Detected Symptoms</p>
                  <p className="text-sm text-gray-700 mt-1">Hypertension spike, peripheral edema (ankle swelling)</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3">
                  <p className="text-xs font-medium text-amber-700">Potential Concern</p>
                  <p className="text-sm text-gray-700 mt-1">Ankle swelling may indicate CCB side effect</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope className="h-5 w-5 text-violet-600" />
                <h3 className="font-medium text-gray-900">Suggested Actions</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-gray-700">Check for pedal edema on examination</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-gray-700">Consider switching from Amlodipine to ARB</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-gray-700">Order BMP to check kidney function</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="h-5 w-5 text-violet-600" />
                <h3 className="font-medium text-gray-900">Auto-Coding</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="rounded-lg bg-gray-50 p-2">
                  <span className="font-mono text-xs text-emerald-700">I10</span>
                  <span className="text-xs text-gray-500 ml-2">Essential hypertension</span>
                </div>
                <div className="rounded-lg bg-gray-50 p-2">
                  <span className="font-mono text-xs text-emerald-700">R60.0</span>
                  <span className="text-xs text-gray-500 ml-2">Localized edema</span>
                </div>
                <div className="rounded-lg bg-gray-50 p-2">
                  <span className="font-mono text-xs text-emerald-700">99214</span>
                  <span className="text-xs text-gray-500 ml-2">Office visit (moderate)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison with MediScript */}
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Wand2 className="h-5 w-5 text-violet-600" />
              <h3 className="font-semibold text-violet-900">Ambient Scribe vs. MediScript</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-white p-4">
                <p className="text-sm font-medium text-gray-900 mb-2">🎙️ MediScript (Manual)</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Press record button to start</li>
                  <li>• Records one segment at a time</li>
                  <li>• Generates SOAP note after recording</li>
                  <li>• Good for specific dictation</li>
                </ul>
              </div>
              <div className="rounded-lg bg-violet-100 p-4 border border-violet-200">
                <p className="text-sm font-medium text-violet-900 mb-2">📡 Ambient Scribe (Automatic)</p>
                <ul className="text-xs text-violet-700 space-y-1">
                  <li>• Always listening — no button needed</li>
                  <li>• Records entire consultation continuously</li>
                  <li>• Real-time speaker detection</li>
                  <li>• Live AI insights during conversation</li>
                  <li>• Auto-generates complete SOAP + coding</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "notes" && <GeneratedNotes />}
      {activeTab === "settings" && <ScribeSettings />}
    </div>
  );
}

// ─── Generated Notes ─────────────────────────────────────────────
function GeneratedNotes() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Intelligent Clinical Notes</h2>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50">
            <Download className="h-3 w-3" /> Export
          </button>
          <button className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50">
            <Share2 className="h-3 w-3" /> Share to EHR
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-medium text-gray-900">Ahmed Al-Rashid — Follow-up Visit</p>
            <p className="text-xs text-gray-500">May 30, 2026 — Duration: 12:34 — Ambient Scribe</p>
          </div>
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            Finalized
          </span>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-xs font-bold text-blue-700 mb-2">SUBJECTIVE</p>
            <p className="text-sm text-gray-700">
              Patient returns for hypertension follow-up. Reports home BP readings mostly 130/85 mmHg, with one spike to 145/92 mmHg yesterday attributed to work-related stress. Reports new bilateral ankle swelling, worse in the evening. Denies chest pain, dyspnea, or headache. Medication compliance reported as good — taking Amlodipine 5mg daily as prescribed.
            </p>
          </div>
          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-xs font-bold text-green-700 mb-2">OBJECTIVE</p>
            <p className="text-sm text-gray-700">
              BP: 138/88 mmHg | HR: 76 bpm | Weight: 82 kg<br />
              Bilateral pitting edema 1+ at ankles. Heart sounds normal, no murmurs. Lungs clear bilaterally. No JVD.
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 p-4">
            <p className="text-xs font-bold text-amber-700 mb-2">ASSESSMENT</p>
            <p className="text-sm text-gray-700">
              1. Essential hypertension — suboptimally controlled<br />
              2. Peripheral edema — likely Amlodipine-related side effect<br />
              3. Type 2 Diabetes — stable on current regimen
            </p>
          </div>
          <div className="rounded-lg bg-purple-50 p-4">
            <p className="text-xs font-bold text-purple-700 mb-2">PLAN</p>
            <p className="text-sm text-gray-700">
              1. Switch Amlodipine 5mg to Losartan 50mg daily<br />
              2. Continue Metformin 500mg BID<br />
              3. Order BMP and renal function panel<br />
              4. Follow-up in 2 weeks to reassess BP and edema<br />
              5. Lifestyle counseling: stress management, sodium restriction
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Settings ────────────────────────────────────────────────────
function ScribeSettings() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Ambient Scribe Settings</h2>
      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Auto-start on patient entry</p>
            <p className="text-xs text-gray-500">Automatically begin recording when a patient encounter starts</p>
          </div>
          <div className="h-6 w-11 rounded-full bg-violet-600 relative cursor-pointer">
            <div className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Speaker diarization</p>
            <p className="text-xs text-gray-500">Automatically identify and label different speakers</p>
          </div>
          <div className="h-6 w-11 rounded-full bg-violet-600 relative cursor-pointer">
            <div className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Real-time AI suggestions</p>
            <p className="text-xs text-gray-500">Show clinical insights and suggestions during recording</p>
          </div>
          <div className="h-6 w-11 rounded-full bg-violet-600 relative cursor-pointer">
            <div className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Auto-generate CPT codes</p>
            <p className="text-xs text-gray-500">Automatically suggest billing codes from the conversation</p>
          </div>
          <div className="h-6 w-11 rounded-full bg-violet-600 relative cursor-pointer">
            <div className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Note template</p>
            <p className="text-xs text-gray-500">Default format for generated clinical notes</p>
          </div>
          <select className="rounded-lg border px-3 py-1.5 text-sm">
            <option>SOAP Note</option>
            <option>H&P Format</option>
            <option>Problem-Oriented</option>
            <option>Custom Template</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Language</p>
            <p className="text-xs text-gray-500">Primary language for transcription</p>
          </div>
          <select className="rounded-lg border px-3 py-1.5 text-sm">
            <option>Arabic + English (Bilingual)</option>
            <option>Arabic only</option>
            <option>English only</option>
          </select>
        </div>
      </div>
    </div>
  );
}
