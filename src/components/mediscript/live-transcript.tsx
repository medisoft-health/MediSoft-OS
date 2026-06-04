"use client";

import * as React from "react";
import { Languages, Loader2, Mic } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Live Transcript Display — shows real-time transcription as the doctor speaks.
 *
 * Uses the Web Speech API (SpeechRecognition) for real-time transcription.
 * This provides immediate feedback during recording. The final transcription
 * is still done server-side with the full audio for accuracy.
 *
 * Features:
 * - Real-time speech-to-text display
 * - Auto-detects Arabic vs English
 * - Shows detected language badge
 * - Scrolls to latest text automatically
 */

interface Props {
  /** Whether recording is active */
  isRecording: boolean;
  /** Callback when language is detected */
  onLanguageDetected?: (lang: "ar" | "en") => void;
  /** Callback with interim transcript text */
  onTranscriptUpdate?: (text: string) => void;
  /** Preferred language hint */
  preferredLanguage?: "ar" | "en" | "auto";
}

export function LiveTranscript({
  isRecording,
  onLanguageDetected,
  onTranscriptUpdate,
  preferredLanguage = "auto",
}: Props) {
  const [transcript, setTranscript] = React.useState<string>("");
  const [interimText, setInterimText] = React.useState<string>("");
  const [detectedLang, setDetectedLang] = React.useState<"ar" | "en" | null>(null);
  const [isListening, setIsListening] = React.useState(false);
  const [supported, setSupported] = React.useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = React.useRef<any>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when new text arrives
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, interimText]);

  // Detect language from text content
  const detectLanguage = React.useCallback(
    (text: string): "ar" | "en" => {
      // Count Arabic characters vs Latin characters
      const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
      const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
      return arabicChars > latinChars ? "ar" : "en";
    },
    [],
  );

  // Initialize and manage SpeechRecognition
  React.useEffect(() => {
    if (!isRecording) {
      // Stop recognition when recording stops
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsListening(false);
      return;
    }

    // Check browser support
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // Configure recognition
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // Set language based on preference
    if (preferredLanguage === "ar") {
      recognition.lang = "ar-SA"; // Saudi Arabic
    } else if (preferredLanguage === "en") {
      recognition.lang = "en-US";
    } else {
      // Auto mode — start with Arabic (primary market), switch if English detected
      recognition.lang = "ar-SA";
    }

    recognition.onstart = () => {
      setIsListening(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalText = "";
      let interim = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalText) {
        setTranscript((prev) => {
          const updated = prev + finalText;
          onTranscriptUpdate?.(updated);

          // Detect language from accumulated text
          if (preferredLanguage === "auto" && updated.length > 20) {
            const lang = detectLanguage(updated);
            if (lang !== detectedLang) {
              setDetectedLang(lang);
              onLanguageDetected?.(lang);

              // Switch recognition language if needed
              if (lang === "en" && recognition.lang !== "en-US") {
                recognition.lang = "en-US";
                // Restart with new language
                try {
                  recognition.stop();
                  setTimeout(() => {
                    try { recognition.start(); } catch { /* ignore */ }
                  }, 100);
                } catch { /* ignore */ }
              }
            }
          }

          return updated;
        });
      }

      setInterimText(interim);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") {
        // Normal — just no speech detected yet
        return;
      }
      if (event.error === "aborted") {
        return;
      }
      console.warn("[live-transcript] recognition error:", event.error);
    };

    recognition.onend = () => {
      // Auto-restart if still recording
      if (isRecording && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // May fail if already started
        }
      } else {
        setIsListening(false);
      }
    };

    // Start recognition
    try {
      recognition.start();
    } catch (err) {
      console.warn("[live-transcript] failed to start:", err);
      setSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch { /* ignore */ }
        recognitionRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, preferredLanguage]);

  // Reset transcript when recording starts fresh
  React.useEffect(() => {
    if (isRecording) {
      setTranscript("");
      setInterimText("");
      setDetectedLang(null);
    }
  }, [isRecording]);

  if (!supported) {
    return (
      <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/30 p-3">
        <p className="text-xs text-[color:var(--color-muted-foreground)] text-center">
          Real-time transcription preview not available in this browser.
          The full recording will still be transcribed by Medical Intelligence.
        </p>
      </div>
    );
  }

  if (!isRecording && !transcript) {
    return null; // Don't show anything before recording starts
  }

  return (
    <div className="space-y-2">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[color:var(--color-muted-foreground)]">
            Live Preview
          </span>
          {isListening && (
            <Badge variant="outline" className="text-[9px] gap-1 animate-pulse">
              <Mic className="size-2.5 text-rose-500" />
              Listening
            </Badge>
          )}
        </div>
        {detectedLang && (
          <Badge variant="secondary" className="text-[9px] gap-1">
            <Languages className="size-2.5" />
            {detectedLang === "ar" ? "العربية" : "English"}
          </Badge>
        )}
      </div>

      {/* Transcript display */}
      <div
        ref={scrollRef}
        className={cn(
          "max-h-32 overflow-y-auto rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-3 text-sm",
          detectedLang === "ar" && "text-right",
          !transcript && !interimText && "flex items-center justify-center min-h-[4rem]",
        )}
        dir={detectedLang === "ar" ? "rtl" : "ltr"}
      >
        {transcript || interimText ? (
          <p className="leading-relaxed">
            <span className="text-[color:var(--color-foreground)]">{transcript}</span>
            {interimText && (
              <span className="text-[color:var(--color-muted-foreground)] italic">
                {interimText}
              </span>
            )}
          </p>
        ) : (
          <div className="flex items-center gap-2 text-[color:var(--color-muted-foreground)]">
            <Loader2 className="size-3.5 animate-spin" />
            <span className="text-xs">Waiting for speech...</span>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-[color:var(--color-muted-foreground)] text-center">
        This is a real-time preview only. Final transcription uses the full Medical Intelligence pipeline for clinical accuracy.
      </p>
    </div>
  );
}
