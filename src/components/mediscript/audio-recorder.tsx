"use client";

import * as React from "react";
import {
  Mic,
  MicOff,
  Pause,
  Play,
  Square,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

/**
 * Audio recording capture component.
 *
 * Uses the browser MediaRecorder API. Renders a live waveform via
 * AudioContext's AnalyserNode. Surfaces a captured Blob to the parent
 * via `onCapture` when the user clicks Stop.
 *
 * Lifecycle:
 *   idle → recording → paused (optional) → recording → stopped → idle
 *
 * The component fully self-cleans on unmount: stops MediaStream tracks,
 * cancels animation frames, closes AudioContext.
 */
interface Props {
  onCapture: (blob: Blob, durationMs: number, mimeType: string) => void;
  disabled?: boolean;
  maxSeconds?: number;
}

type RecorderState = "idle" | "requesting" | "recording" | "paused" | "stopped";

interface CapturedAudio {
  blob: Blob;
  url: string;
  durationMs: number;
  mimeType: string;
}

export function AudioRecorder({
  onCapture,
  disabled = false,
  maxSeconds = 60 * 10, // 10 minutes
}: Props) {
  const [state, setState] = React.useState<RecorderState>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const [captured, setCaptured] = React.useState<CapturedAudio | null>(null);

  const streamRef = React.useRef<MediaStream | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const startTimeRef = React.useRef<number>(0);
  const accumulatedMsRef = React.useRef<number>(0);
  const tickRef = React.useRef<number | null>(null);

  // Waveform refs
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const drawRafRef = React.useRef<number | null>(null);

  // Cleanup on unmount.
  React.useEffect(() => {
    return () => {
      cleanup();
      if (captured?.url) URL.revokeObjectURL(captured.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cleanup() {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (drawRafRef.current != null) {
      cancelAnimationFrame(drawRafRef.current);
      drawRafRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    recorderRef.current = null;
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {
        /* ignore */
      });
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }

  function pickMimeType(): string {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];
    for (const c of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
        return c;
      }
    }
    return ""; // Browser default
  }

  async function start() {
    setError(null);
    setCaptured((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
    accumulatedMsRef.current = 0;
    chunksRef.current = [];

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError(
        "Your browser does not support audio recording. Please use the latest Chrome, Edge, or Safari.",
      );
      return;
    }

    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
    } catch (err) {
      console.error("[recorder] mic permission denied", err);
      setError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access denied. Enable it in your browser settings and try again."
          : "Could not access the microphone. Please check your input device.",
      );
      setState("idle");
      return;
    }

    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(streamRef.current!, mimeType ? { mimeType } : undefined);
    } catch (err) {
      console.error("[recorder] failed to create MediaRecorder", err);
      setError("Unable to start the recorder with your device's audio format.");
      cleanup();
      setState("idle");
      return;
    }

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const finalMs = accumulatedMsRef.current + (Date.now() - startTimeRef.current);
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || mimeType || "audio/webm",
      });
      const url = URL.createObjectURL(blob);
      const cap: CapturedAudio = {
        blob,
        url,
        durationMs: finalMs,
        mimeType: blob.type,
      };
      setCaptured(cap);
      setState("stopped");
      stopWaveform();
      stopTimer();
      // Surface to parent.
      try {
        onCapture(cap.blob, cap.durationMs, cap.mimeType);
      } catch (err) {
        console.error("[recorder] onCapture handler failed", err);
      }
      // Stop the mic so the OS indicator turns off.
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
        streamRef.current = null;
      }
    };

    recorderRef.current = recorder;
    recorder.start(250); // Receive chunks every 250ms so onstop has data.
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    setState("recording");
    startTimer();
    startWaveform();
  }

  function pause() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.pause();
      accumulatedMsRef.current += Date.now() - startTimeRef.current;
      stopTimer();
      setState("paused");
    }
  }

  function resume() {
    if (recorderRef.current?.state === "paused") {
      recorderRef.current.resume();
      startTimeRef.current = Date.now();
      setState("recording");
      startTimer();
    }
  }

  function stop() {
    if (
      recorderRef.current &&
      (recorderRef.current.state === "recording" || recorderRef.current.state === "paused")
    ) {
      recorderRef.current.stop();
    }
  }

  function resetAll() {
    cleanup();
    if (captured?.url) URL.revokeObjectURL(captured.url);
    setCaptured(null);
    setElapsedMs(0);
    setError(null);
    setState("idle");
  }

  // Timer for elapsed-time display.
  function startTimer() {
    if (tickRef.current != null) window.clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => {
      const now = Date.now() - startTimeRef.current + accumulatedMsRef.current;
      setElapsedMs(now);
      if (now / 1000 >= maxSeconds) {
        stop();
      }
    }, 200);
  }
  function stopTimer() {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  // Waveform — uses AnalyserNode + canvas.
  function startWaveform() {
    if (!streamRef.current) return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(streamRef.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      analyserRef.current = analyser;
      draw();
    } catch (err) {
      // Waveform is a nice-to-have; failures are non-fatal.
      console.warn("[recorder] waveform unavailable", err);
    }
  }
  function stopWaveform() {
    if (drawRafRef.current != null) {
      cancelAnimationFrame(drawRafRef.current);
      drawRafRef.current = null;
    }
  }
  function draw() {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width * dpr) canvas.width = width * dpr;
    if (canvas.height !== height * dpr) canvas.height = height * dpr;
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    ctx2d.clearRect(0, 0, width, height);
    ctx2d.lineWidth = 2;
    ctx2d.strokeStyle = "#E84A8A";
    ctx2d.lineCap = "round";
    ctx2d.beginPath();

    const sliceWidth = width / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0; // 0..2 (centered at 1)
      const y = (v * height) / 2;
      if (i === 0) ctx2d.moveTo(x, y);
      else ctx2d.lineTo(x, y);
      x += sliceWidth;
    }
    ctx2d.stroke();

    drawRafRef.current = requestAnimationFrame(draw);
  }

  const seconds = Math.floor(elapsedMs / 1000);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const isLive = state === "recording" || state === "paused";

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Recording failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Waveform stage */}
      <div
        className={cn(
          "relative h-32 overflow-hidden rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/30",
          isLive && "ring-2 ring-[color:var(--color-brand-pink)]/30",
        )}
      >
        {isLive ? (
          <canvas ref={canvasRef} className="absolute inset-0 size-full" />
        ) : captured ? (
          <div className="grid h-full place-items-center">
            <audio
              src={captured.url}
              controls
              className="w-3/4 max-w-md"
              preload="metadata"
            />
          </div>
        ) : state === "requesting" ? (
          <div className="grid h-full place-items-center gap-2 text-sm text-[color:var(--color-muted-foreground)]">
            <Loader2 className="size-5 animate-spin" />
            Requesting microphone access…
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-[color:var(--color-muted-foreground)]">
            <Mic className="size-7 opacity-40" />
            <span>Press &ldquo;Start recording&rdquo; to begin.</span>
          </div>
        )}

        {/* Timer chip */}
        {(isLive || captured) && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-[color:var(--color-card)]/90 px-2.5 py-1 text-xs font-mono backdrop-blur">
            {state === "recording" && (
              <span className="size-2 rounded-full bg-rose-500 pulse-dot" />
            )}
            {state === "paused" && (
              <Pause className="size-3 text-[color:var(--color-muted-foreground)]" />
            )}
            <span className="tabular-nums">
              {mm}:{ss}
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {state === "idle" && (
          <Button
            variant="brand"
            size="md"
            onClick={start}
            disabled={disabled}
          >
            <Mic className="size-4" />
            Start recording
          </Button>
        )}

        {state === "requesting" && (
          <Button variant="brand" size="md" disabled>
            <Loader2 className="size-4 animate-spin" />
            Connecting…
          </Button>
        )}

        {state === "recording" && (
          <>
            <Button variant="outline" size="md" onClick={pause}>
              <Pause className="size-4" />
              Pause
            </Button>
            <Button variant="destructive" size="md" onClick={stop}>
              <Square className="size-4" />
              Stop
            </Button>
          </>
        )}

        {state === "paused" && (
          <>
            <Button variant="brand" size="md" onClick={resume}>
              <Play className="size-4" />
              Resume
            </Button>
            <Button variant="destructive" size="md" onClick={stop}>
              <Square className="size-4" />
              Stop
            </Button>
          </>
        )}

        {state === "stopped" && captured && (
          <>
            <Button variant="outline" size="md" onClick={resetAll}>
              <RefreshCw className="size-4" />
              Re-record
            </Button>
            <span className="text-xs text-[color:var(--color-muted-foreground)]">
              {(captured.blob.size / 1024).toFixed(0)} KB · {captured.mimeType}
            </span>
          </>
        )}
      </div>

      {/* Permission hint when idle */}
      {state === "idle" && !error && (
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-[color:var(--color-muted-foreground)]">
          <MicOff className="size-3" />
          Recording stays in this browser tab only — nothing is uploaded until
          you save the encounter.
        </p>
      )}

      {/* Hard cap notice */}
      {isLive && (
        <p className="text-center text-[11px] text-[color:var(--color-muted-foreground)] tabular-nums">
          Max session length: {Math.floor(maxSeconds / 60)} minutes.
        </p>
      )}
    </div>
  );
}
