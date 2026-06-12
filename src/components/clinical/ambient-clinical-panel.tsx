"use client";

import { useState, useCallback } from "react";
import { useLocale } from "next-intl";
import {
  Mic,
  FileText,
  CheckCircle2,
  Stethoscope,
  Pill,
  FlaskConical,
  Calendar,
  Brain,
  Sparkles,
  Play,
  Square,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TranscriptSegment {
  speaker: "doctor" | "patient" | "unknown";
  text: string;
  timestamp: number;
  language: string;
  confidence: number;
}

interface ClinicalNote {
  soap: {
    subjective: string;
    subjectiveEn: string;
    objective: string;
    objectiveEn: string;
    assessment: string;
    assessmentEn: string;
    plan: string;
    planEn: string;
  };
  icdCodes: Array<{ code: string; description: string; descriptionEn: string; confidence: number }>;
  medications: Array<{ name: string; dosage: string; frequency: string; duration: string; route: string; reason: string }>;
  labOrders: Array<{ test: string; testEn: string; reason: string; reasonEn: string; urgency: string }>;
  followUp: { interval: string; intervalEn: string; reason: string; reasonEn: string };
  patientInstructions: string;
  patientInstructionsEn: string;
  summary: string;
  summaryEn: string;
}

interface SuggestedAction {
  type: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  priority: string;
  autoExecutable: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AmbientClinicalPanel({ patientId }: { patientId?: number }) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [clinicalNote, setClinicalNote] = useState<ClinicalNote | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [processing, setProcessing] = useState(false);
  const [liveInsights, setLiveInsights] = useState<string[]>([]);
  const [sessionDuration, setSessionDuration] = useState(0);

  // Simulate recording (in production, this would use Web Speech API or a streaming audio service)
  const startRecording = useCallback(() => {
    setIsRecording(true);
    setTranscript([]);
    setClinicalNote(null);
    setSuggestedActions([]);
    setLiveInsights([]);
    setSessionDuration(0);

    // Simulate transcript segments arriving
    const demoSegments: TranscriptSegment[] = [
      { speaker: "doctor", text: "أهلاً، كيف حالك اليوم؟ ما هي الأعراض اللي تشكو منها؟", timestamp: 0, language: "ar", confidence: 0.95 },
      { speaker: "patient", text: "عندي صداع شديد من 3 أيام، ومش قادر أنام كويس", timestamp: 8, language: "ar", confidence: 0.92 },
      { speaker: "doctor", text: "هل الصداع مستمر ولا يجي ويروح؟ وهل في أي أعراض تانية زي غثيان أو دوخة؟", timestamp: 15, language: "ar", confidence: 0.94 },
      { speaker: "patient", text: "مستمر تقريباً، وفي دوخة خفيفة لما أقوم بسرعة", timestamp: 25, language: "ar", confidence: 0.91 },
      { speaker: "doctor", text: "تمام، خليني أقيس الضغط... الضغط 150/95 — مرتفع شوية. هل بتاخد أي أدوية حالياً؟", timestamp: 35, language: "ar", confidence: 0.96 },
      { speaker: "patient", text: "لا مش بآخد حاجة", timestamp: 45, language: "ar", confidence: 0.93 },
      { speaker: "doctor", text: "حسناً، سأكتب لك دواء للضغط — أملوديبين 5 ملجم مرة يومياً. وأريد تحليل وظائف كلى وأملاح. تعال بعد أسبوعين للمتابعة.", timestamp: 50, language: "ar", confidence: 0.97 },
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index < demoSegments.length) {
        setTranscript((prev) => [...prev, demoSegments[index]]);
        setSessionDuration(demoSegments[index].timestamp);

        // Generate live insights
        if (demoSegments[index].text.includes("صداع شديد")) {
          setLiveInsights((prev) => [...prev, "⚡ صداع شديد — استبعد ارتفاع الضغط"]);
        }
        if (demoSegments[index].text.includes("150/95")) {
          setLiveInsights((prev) => [...prev, "🔴 ضغط مرتفع — Stage 1 Hypertension"]);
        }

        index++;
      } else {
        clearInterval(interval);
      }
    }, 2000);

    // Auto-stop after demo
    setTimeout(() => {
      setIsRecording(false);
      clearInterval(interval);
    }, 16000);
  }, []);

  const stopAndProcess = useCallback(async () => {
    setIsRecording(false);
    setProcessing(true);

    try {
      const res = await fetch("/api/ambient-clinical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "process_session",
          transcript: transcript.length > 0 ? transcript : [
            { speaker: "doctor", text: "أهلاً، كيف حالك؟ ما هي الأعراض؟", timestamp: 0, language: "ar", confidence: 0.95 },
            { speaker: "patient", text: "عندي صداع شديد من 3 أيام ودوخة", timestamp: 8, language: "ar", confidence: 0.92 },
            { speaker: "doctor", text: "الضغط 150/95. سأكتب أملوديبين 5 ملجم. وتحليل وظائف كلى.", timestamp: 35, language: "ar", confidence: 0.96 },
          ],
          patientContext: patientId ? { name: "المريض", age: 45, sex: "male", chronicConditions: [], currentMedications: [], allergies: [] } : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setClinicalNote(data.clinicalNote);
        setSuggestedActions(data.suggestedActions);
      }
    } catch {
      // Silent fail
    } finally {
      setProcessing(false);
    }
  }, [transcript, patientId]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {isAr ? "العيادة بلا جدران" : "Ambient Clinical Experience"}
              </h3>
              <p className="text-sm opacity-70">
                {isAr
                  ? "تكلم مع المريض — النظام يوثق كل شيء"
                  : "Talk to your patient — the system documents everything"}
              </p>
            </div>
          </div>
          {isRecording && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400 animate-pulse" />
              <span className="text-sm">{Math.floor(sessionDuration / 60)}:{String(sessionDuration % 60).padStart(2, "0")}</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-4 flex gap-3">
          {!isRecording && !clinicalNote && (
            <button
              onClick={startRecording}
              className="flex-1 py-3 rounded-xl bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Play className="h-4 w-4" />
              {isAr ? "ابدأ الجلسة" : "Start Session"}
            </button>
          )}
          {isRecording && (
            <button
              onClick={stopAndProcess}
              className="flex-1 py-3 rounded-xl bg-red-500/80 hover:bg-red-500 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Square className="h-4 w-4" />
              {isAr ? "أنهِ الجلسة وأنشئ التقرير" : "End Session & Generate Report"}
            </button>
          )}
        </div>
      </div>

      {/* Live Insights */}
      {liveInsights.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2">
            {isAr ? "تنبيهات مباشرة:" : "Live Insights:"}
          </p>
          {liveInsights.map((insight, i) => (
            <p key={i} className="text-sm text-amber-800 dark:text-amber-200">{insight}</p>
          ))}
        </div>
      )}

      {/* Live Transcript */}
      {transcript.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 max-h-60 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <Mic className="h-4 w-4 text-violet-600" />
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {isAr ? "النص المباشر" : "Live Transcript"}
            </h4>
          </div>
          <div className="space-y-2">
            {transcript.map((seg, i) => (
              <div key={i} className={`flex gap-2 ${seg.speaker === "doctor" ? "" : "flex-row-reverse"}`}>
                <div
                  className={`px-3 py-2 rounded-lg max-w-[80%] text-sm ${
                    seg.speaker === "doctor"
                      ? "bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <p className="text-[10px] font-medium opacity-60 mb-0.5">
                    {seg.speaker === "doctor" ? (isAr ? "طبيب" : "Doctor") : (isAr ? "مريض" : "Patient")}
                  </p>
                  {seg.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing State */}
      {processing && (
        <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/20 p-4 text-center">
          <Brain className="h-8 w-8 text-violet-500 mx-auto animate-pulse" />
          <p className="text-sm text-violet-700 dark:text-violet-300 mt-2">
            {isAr ? "جارٍ تحليل الجلسة وإنشاء التقرير السريري..." : "Analyzing session and generating clinical report..."}
          </p>
        </div>
      )}

      {/* Generated Clinical Note */}
      {clinicalNote && (
        <div className="space-y-3">
          {/* SOAP Note */}
          <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-green-600" />
              <h4 className="text-sm font-bold text-green-800 dark:text-green-200">
                {isAr ? "ملاحظات SOAP (تم إنشاؤها تلقائياً)" : "SOAP Notes (Auto-generated)"}
              </h4>
              <Sparkles className="h-4 w-4 text-green-500" />
            </div>
            <div className="space-y-3">
              <SOAPSection label="S" title={isAr ? "شكوى المريض" : "Subjective"} content={isAr ? clinicalNote.soap.subjective : clinicalNote.soap.subjectiveEn} />
              <SOAPSection label="O" title={isAr ? "الفحص" : "Objective"} content={isAr ? clinicalNote.soap.objective : clinicalNote.soap.objectiveEn} />
              <SOAPSection label="A" title={isAr ? "التقييم" : "Assessment"} content={isAr ? clinicalNote.soap.assessment : clinicalNote.soap.assessmentEn} />
              <SOAPSection label="P" title={isAr ? "الخطة" : "Plan"} content={isAr ? clinicalNote.soap.plan : clinicalNote.soap.planEn} />
            </div>
          </div>

          {/* Suggested Actions */}
          {suggestedActions.length > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {isAr ? "إجراءات مقترحة (اضغط للتنفيذ)" : "Suggested Actions (Click to execute)"}
              </h4>
              <div className="space-y-2">
                {suggestedActions.map((action, i) => (
                  <button
                    key={i}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors text-start"
                  >
                    {action.type === "prescription" && <Pill className="h-4 w-4 text-blue-500 shrink-0" />}
                    {action.type === "lab_order" && <FlaskConical className="h-4 w-4 text-purple-500 shrink-0" />}
                    {action.type === "follow_up" && <Calendar className="h-4 w-4 text-green-500 shrink-0" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {isAr ? action.title : action.titleEn}
                      </p>
                      <p className="text-xs text-gray-500">
                        {isAr ? action.description : action.descriptionEn}
                      </p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-gray-300 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {clinicalNote.summary && (
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 p-4">
              <p className="text-sm text-indigo-800 dark:text-indigo-200 font-medium">
                {isAr ? clinicalNote.summary : clinicalNote.summaryEn}
              </p>
              {clinicalNote.patientInstructions && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2">
                  📋 {isAr ? clinicalNote.patientInstructions : clinicalNote.patientInstructionsEn}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function SOAPSection({ label, title, content }: { label: string; title: string; content: string }) {
  return (
    <div className="flex gap-2">
      <div className="w-7 h-7 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-green-800 dark:text-green-200">{label}</span>
      </div>
      <div>
        <p className="text-xs font-medium text-green-700 dark:text-green-300">{title}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300">{content}</p>
      </div>
    </div>
  );
}
