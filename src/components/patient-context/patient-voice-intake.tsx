"use client";

import * as React from "react";
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Brain,
  RefreshCw,
  Save,
  FileText,
  Clock,
  AudioWaveform,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────
interface ExtractedData {
  allergies?: Array<{ substance: string; reaction?: string; severity?: string }>;
  chronicConditions?: Array<{ description: string; icdCode?: string; onsetDate?: string }>;
  currentMedications?: Array<{ name: string; dose?: string; frequency?: string }>;
  surgicalHistory?: Array<{ procedure: string; date?: string; hospital?: string }>;
  familyHistory?: string;
  socialHistory?: string;
  medicalHistory?: string;
  symptoms?: Array<{ description: string; duration?: string; severity?: string }>;
  vitals?: {
    bloodPressure?: { systolic: number; diastolic: number };
    heartRate?: number;
    temperature?: number;
    weight?: number;
    height?: number;
    bloodSugar?: number;
  };
}

interface PatientVoiceIntakeProps {
  patientId: number;
  patientName: string;
  onDataExtracted: (data: ExtractedData) => void;
  onTranscriptReady?: (transcript: string) => void;
}

type RecordingState = "idle" | "recording" | "paused" | "processing" | "done" | "error";

// ─────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────
export function PatientVoiceIntake({
  patientId,
  patientName,
  onDataExtracted,
  onTranscriptReady,
}: PatientVoiceIntakeProps) {
  const [state, setState] = React.useState<RecordingState>("idle");
  const [duration, setDuration] = React.useState(0);
  const [transcript, setTranscript] = React.useState<string>("");
  const [extractedData, setExtractedData] = React.useState<ExtractedData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [audioLevel, setAudioLevel] = React.useState(0);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const animationRef = React.useRef<number | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Audio level visualization
  const updateAudioLevel = React.useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    setAudioLevel(avg / 255);
    animationRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  // Start recording
  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup audio analyser for visualization
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // Process the recording
        processRecording();
      };

      recorder.start(1000); // Collect data every second
      setState("recording");
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      // Start audio visualization
      updateAudioLevel();
    } catch (err) {
      setError("لا يمكن الوصول إلى الميكروفون. تأكد من منح الإذن.");
      setState("error");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setState("processing");
  };

  // Pause/Resume
  const togglePause = () => {
    if (!mediaRecorderRef.current) return;
    if (state === "recording") {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setState("paused");
    } else if (state === "paused") {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      setState("recording");
    }
  };

  // Process recording: transcribe + extract
  const processRecording = async () => {
    setState("processing");
    try {
      const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", audioBlob, "patient-intake.webm");
      formData.append("patientId", patientId.toString());
      formData.append("mode", "patient_intake");

      // Step 1: Transcribe
      const transcribeRes = await fetch("/api/mediscript/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!transcribeRes.ok) throw new Error("فشل في تحويل الصوت إلى نص");

      const transcribeData = await transcribeRes.json();
      const transcriptText = transcribeData.transcript || transcribeData.text || "";
      setTranscript(transcriptText);
      onTranscriptReady?.(transcriptText);

      // Step 2: Extract structured data from transcript
      const extractRes = await fetch("/api/patient-360?action=extract_from_voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          transcript: transcriptText,
        }),
      });

      if (!extractRes.ok) throw new Error("فشل في استخراج البيانات من النص");

      const extracted: ExtractedData = await extractRes.json();
      setExtractedData(extracted);
      onDataExtracted(extracted);
      setState("done");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "حدث خطأ أثناء المعالجة";
      setError(message);
      setState("error");
    }
  };

  // Reset
  const reset = () => {
    setState("idle");
    setDuration(0);
    setTranscript("");
    setExtractedData(null);
    setError(null);
    chunksRef.current = [];
  };

  // Format duration
  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-red-50 to-pink-50 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-red-600" />
          <h3 className="font-bold text-gray-900 text-sm">التسجيل الصوتي — استقبال المريض</h3>
          <Badge variant="outline" className="text-[10px] mr-auto">Medical Intelligence</Badge>
        </div>
        <p className="text-xs text-gray-600 mt-1">
          سجل المحادثة مع المريض وسيتم استخراج البيانات الطبية تلقائياً (حساسية، أمراض مزمنة، أدوية، تاريخ مرضي)
        </p>
      </div>

      {/* Recording Area */}
      <div className="p-6">
        {/* Idle State */}
        {state === "idle" && (
          <div className="text-center space-y-4">
            <div className="mx-auto w-24 h-24 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center">
              <Mic className="h-10 w-10 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-gray-700 font-medium">اضغط لبدء التسجيل</p>
              <p className="text-xs text-gray-500 mt-1">يمكن للممرضة أن تسأل والمريض يجيب، أو المريض يحكي قصته بنفسه</p>
            </div>
            <Button onClick={startRecording} size="lg" className="gap-2 bg-red-600 hover:bg-red-700 px-8">
              <Mic className="h-5 w-5" />
              ابدأ التسجيل
            </Button>
            <div className="text-[10px] text-gray-400 space-y-1">
              <p>يدعم: العربية، الإنجليزية، الأردو</p>
              <p>سيتم استخراج: الحساسية • الأمراض المزمنة • الأدوية • العمليات • التاريخ العائلي • العلامات الحيوية</p>
            </div>
          </div>
        )}

        {/* Recording State */}
        {(state === "recording" || state === "paused") && (
          <div className="text-center space-y-4">
            {/* Waveform visualization */}
            <div className="relative mx-auto w-24 h-24">
              <div
                className={cn(
                  "absolute inset-0 rounded-full border-4 transition-all",
                  state === "recording"
                    ? "border-red-500 animate-pulse"
                    : "border-yellow-500"
                )}
                style={{
                  transform: state === "recording" ? `scale(${1 + audioLevel * 0.3})` : "scale(1)",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                {state === "recording" ? (
                  <Mic className="h-10 w-10 text-red-600" />
                ) : (
                  <Pause className="h-10 w-10 text-yellow-600" />
                )}
              </div>
            </div>

            {/* Timer */}
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-2xl font-mono font-bold text-gray-900" dir="ltr">
                {formatDuration(duration)}
              </span>
              {state === "recording" && (
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>

            <p className="text-sm text-gray-600">
              {state === "recording" ? "جاري التسجيل... تحدث بوضوح" : "التسجيل متوقف مؤقتاً"}
            </p>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" onClick={togglePause} className="gap-1.5">
                {state === "recording" ? (
                  <>
                    <Pause className="h-4 w-4" />
                    إيقاف مؤقت
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    استئناف
                  </>
                )}
              </Button>
              <Button onClick={stopRecording} size="sm" className="gap-1.5 bg-gray-800 hover:bg-gray-900">
                <Square className="h-4 w-4" />
                إنهاء وتحليل
              </Button>
            </div>

            {/* Audio level bars */}
            <div className="flex items-end justify-center gap-0.5 h-8">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1 rounded-full transition-all duration-75",
                    state === "recording" ? "bg-red-400" : "bg-gray-300"
                  )}
                  style={{
                    height: state === "recording"
                      ? `${Math.max(4, Math.random() * audioLevel * 32)}px`
                      : "4px",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Processing State */}
        {state === "processing" && (
          <div className="text-center space-y-4">
            <div className="mx-auto w-24 h-24 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center">
              <Brain className="h-10 w-10 text-blue-600 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">جاري التحليل بالذكاء الطبي...</p>
              <p className="text-xs text-gray-500 mt-1">تحويل الصوت إلى نص → استخراج البيانات الطبية</p>
            </div>
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
          </div>
        )}

        {/* Done State */}
        {state === "done" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">تم استخراج البيانات بنجاح من التسجيل ({formatDuration(duration)})</span>
            </div>

            {/* Transcript */}
            {transcript && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-xs font-semibold text-gray-700">النص المستخرج</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed max-h-32 overflow-y-auto">
                  {transcript}
                </p>
              </div>
            )}

            {/* Extracted Data Summary */}
            {extractedData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-800">البيانات المستخرجة</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {extractedData.allergies && extractedData.allergies.length > 0 && (
                    <Badge className="bg-red-100 text-red-800 text-[10px]">
                      حساسية: {extractedData.allergies.length}
                    </Badge>
                  )}
                  {extractedData.chronicConditions && extractedData.chronicConditions.length > 0 && (
                    <Badge className="bg-amber-100 text-amber-800 text-[10px]">
                      أمراض مزمنة: {extractedData.chronicConditions.length}
                    </Badge>
                  )}
                  {extractedData.currentMedications && extractedData.currentMedications.length > 0 && (
                    <Badge className="bg-purple-100 text-purple-800 text-[10px]">
                      أدوية: {extractedData.currentMedications.length}
                    </Badge>
                  )}
                  {extractedData.surgicalHistory && extractedData.surgicalHistory.length > 0 && (
                    <Badge className="bg-blue-100 text-blue-800 text-[10px]">
                      عمليات: {extractedData.surgicalHistory.length}
                    </Badge>
                  )}
                  {extractedData.familyHistory && (
                    <Badge className="bg-green-100 text-green-800 text-[10px]">تاريخ عائلي ✓</Badge>
                  )}
                  {extractedData.vitals && (
                    <Badge className="bg-indigo-100 text-indigo-800 text-[10px]">علامات حيوية ✓</Badge>
                  )}
                  {extractedData.medicalHistory && (
                    <Badge className="bg-gray-200 text-gray-800 text-[10px]">تاريخ مرضي ✓</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
                <RefreshCw className="h-4 w-4" />
                تسجيل جديد
              </Button>
              <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" onClick={() => onDataExtracted(extractedData!)}>
                <Save className="h-4 w-4" />
                إضافة البيانات للملف
              </Button>
            </div>
          </div>
        )}

        {/* Error State */}
        {state === "error" && (
          <div className="text-center space-y-4">
            <div className="mx-auto w-24 h-24 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <p className="text-sm text-red-700">{error}</p>
            <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </Button>
          </div>
        )}
      </div>

      {/* Tips */}
      {(state === "idle" || state === "recording") && (
        <div className="bg-gray-50 border-t border-gray-100 px-4 py-2">
          <p className="text-[10px] text-gray-500">
            <span className="font-semibold">نصائح:</span> تحدث بوضوح • اذكر أسماء الأدوية والجرعات • اذكر تواريخ العمليات • اذكر الأمراض في العائلة
          </p>
        </div>
      )}
    </div>
  );
}
