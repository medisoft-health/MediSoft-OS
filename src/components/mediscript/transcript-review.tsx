"use client";

import * as React from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Transcript Review Panel — shown between transcription and SOAP generation.
 *
 * Calls the /api/mediscript/correct-transcript endpoint to fix:
 *   - Drug name misspellings (metforman → Metformin)
 *   - Medical term phonetics (haychbeeaywunsi → HbA1c)
 *   - Number standardization (8 point 2 → 8.2)
 *
 * The doctor can review corrections before the SOAP is generated.
 */

interface Correction {
  original: string;
  corrected: string;
  reason: string;
}

interface CorrectionResult {
  correctedTranscript: string;
  corrections: Correction[];
  confidence: number;
  language: string;
}

interface Props {
  rawTranscript: string;
  patientId: number;
  onAccept: (correctedTranscript: string) => void;
  onSkip: () => void;
}

export function TranscriptReview({
  rawTranscript,
  patientId,
  onAccept,
  onSkip,
}: Props) {
  const [result, setResult] = React.useState<CorrectionResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showDetails, setShowDetails] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/mediscript/correct-transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawTranscript, patientId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setResult(json);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message ?? "Correction failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rawTranscript, patientId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-6 py-8 text-center">
        <Loader2 className="size-6 animate-spin text-[color:var(--color-brand-magenta)]" />
        <div>
          <p className="font-medium text-sm">Reviewing transcript accuracy…</p>
          <p className="text-xs text-[color:var(--color-muted-foreground)] mt-1">
            Medical Intelligence is checking drug names, medical terms, and clinical values.
          </p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 text-sm text-amber-800">
          <AlertTriangle className="size-4" />
          <span className="font-medium">Transcript correction unavailable</span>
        </div>
        <p className="text-xs text-amber-700">
          The transcript will be used as-is for SOAP generation. You can still edit it in the review step.
        </p>
        <Button variant="outline" size="sm" onClick={onSkip}>
          Continue with raw transcript
        </Button>
      </div>
    );
  }

  const hasCorrections = result.corrections.length > 0;

  return (
    <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-muted)]/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-[color:var(--color-brand-magenta)]" />
            <span className="font-semibold text-sm">Transcript Review</span>
            {hasCorrections ? (
              <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">
                {result.corrections.length} correction{result.corrections.length === 1 ? "" : "s"} suggested
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300 bg-emerald-50">
                <Check className="size-3 mr-0.5" />
                No corrections needed
              </Badge>
            )}
          </div>
          <Badge variant="outline" className="text-[10px]">
            {result.confidence}% confidence · {result.language}
          </Badge>
        </div>
      </div>

      {/* Corrections list */}
      {hasCorrections && (
        <div className="px-4 py-3 space-y-2">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-xs font-medium text-[color:var(--color-brand-magenta)] hover:underline"
          >
            {showDetails ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            {showDetails ? "Hide" : "Show"} corrections
          </button>

          {showDetails && (
            <div className="space-y-1.5 mt-2">
              {result.corrections.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-xs bg-[color:var(--color-muted)]/40"
                >
                  <span className="line-through text-red-600 font-mono">{c.original}</span>
                  <span className="text-[color:var(--color-muted-foreground)]">→</span>
                  <span className="font-semibold text-emerald-700 font-mono">{c.corrected}</span>
                  <Badge variant="outline" className="text-[9px] ml-auto">
                    {c.reason}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[color:var(--color-border)] bg-[color:var(--color-muted)]/10">
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Use original transcript
        </Button>
        <Button
          variant="brand"
          size="sm"
          onClick={() => onAccept(result.correctedTranscript)}
        >
          {hasCorrections ? "Accept corrections & generate SOAP" : "Generate SOAP"}
          <Sparkles className="size-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}
