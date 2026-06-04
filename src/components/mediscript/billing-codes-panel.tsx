"use client";

import { useState, useCallback } from "react";
import {
  Receipt,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ShieldAlert,
  FileText,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SoapNoteInput } from "@/lib/validations/encounter";

// ─────────────────────────────────────────────────────────────────
//  Types (mirror server-side)
// ─────────────────────────────────────────────────────────────────

interface ICD10Suggestion {
  code: string;
  description: string;
  category: string;
  confidence: "high" | "moderate" | "low";
  supportingEvidence: string;
  isPrimary: boolean;
}

interface CPTSuggestion {
  code: string;
  description: string;
  category: string;
  confidence: "high" | "moderate" | "low";
  supportingEvidence: string;
  modifier?: string;
  units?: number;
}

interface CodingDiscrepancy {
  type: "missing_documentation" | "code_mismatch" | "specificity_needed" | "bundling_issue";
  description: string;
  recommendation: string;
  severity: "info" | "warning" | "critical";
}

interface BillingIntelligenceResult {
  icd10Codes: ICD10Suggestion[];
  cptCodes: CPTSuggestion[];
  discrepancies: CodingDiscrepancy[];
  encounterLevel: string;
  estimatedComplexity: "low" | "moderate" | "high" | "critical";
  codingSummary: string;
}

// ─────────────────────────────────────────────────────────────────
//  Props
// ─────────────────────────────────────────────────────────────────

interface BillingCodesPanelProps {
  soapNote: SoapNoteInput;
  encounterType: string;
  patientContext?: string;
  onCodesAccepted?: (icd10: ICD10Suggestion[], cpt: CPTSuggestion[]) => void;
}

// ─────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const styles: Record<string, string> = {
    high: "bg-emerald-100 text-emerald-800 border-emerald-200",
    moderate: "bg-amber-100 text-amber-800 border-amber-200",
    low: "bg-red-100 text-red-800 border-red-200",
  };
  return (
    <Badge variant="outline" className={cn("text-[10px]", styles[confidence] || styles.moderate)}>
      {confidence}
    </Badge>
  );
}

function ComplexityGauge({ complexity }: { complexity: string }) {
  const levels: Record<string, { color: string; width: string; label: string }> = {
    low: { color: "bg-green-500", width: "w-1/4", label: "Low" },
    moderate: { color: "bg-amber-500", width: "w-2/4", label: "Moderate" },
    high: { color: "bg-orange-500", width: "w-3/4", label: "High" },
    critical: { color: "bg-red-500", width: "w-full", label: "Critical" },
  };
  const level = levels[complexity] || levels.moderate;

  return (
    <div className="flex items-center gap-2">
      <Gauge className="size-3.5 text-[color:var(--color-muted-foreground)]" />
      <div className="flex-1 h-1.5 rounded-full bg-[color:var(--color-muted)]/20 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", level.color, level.width)} />
      </div>
      <span className="text-[10px] font-medium">{level.label}</span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-5 w-5 p-0"
      onClick={handleCopy}
      title="Copy code"
    >
      {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
    </Button>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────────────────

export function BillingCodesPanel({
  soapNote,
  encounterType,
  patientContext,
  onCodesAccepted,
}: BillingCodesPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BillingIntelligenceResult | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const generateCodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mediscript/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soapNote,
          encounterType,
          patientContext,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data.billing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate billing codes");
    } finally {
      setLoading(false);
    }
  }, [soapNote, encounterType, patientContext]);

  const handleAcceptAll = () => {
    if (result) {
      setAccepted(true);
      onCodesAccepted?.(result.icd10Codes, result.cptCodes);
    }
  };

  // Not yet generated
  if (!result && !loading) {
    return (
      <Card className="border-dashed border-blue-300/40 bg-gradient-to-br from-blue-50/50 to-transparent">
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-blue-100/80">
            <Receipt className="size-6 text-blue-700" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-sm">Billing Code Intelligence</h4>
            <p className="text-xs text-[color:var(--color-muted-foreground)] max-w-sm">
              Analyze this encounter to suggest ICD-10-CM diagnosis codes and CPT
              procedure codes. Flags documentation gaps and coding discrepancies.
            </p>
          </div>
          <Button
            variant="default"
            size="md"
            onClick={generateCodes}
            disabled={loading}
          >
            <Receipt className="size-4 mr-1.5" />
            Generate Billing Codes
          </Button>
          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="size-3" /> {error}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Loading
  if (loading) {
    return (
      <Card className="border-blue-200/40">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <Loader2 className="size-8 animate-spin text-blue-600" />
          <div className="space-y-1">
            <h4 className="font-semibold text-sm">Analyzing Documentation</h4>
            <p className="text-xs text-[color:var(--color-muted-foreground)]">
              Mapping diagnoses to ICD-10-CM and procedures to CPT codes...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Results
  return (
    <Card className="border-blue-200/40">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Receipt className="size-4 text-blue-700" />
            Billing Code Intelligence
            {accepted && (
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="size-3 mr-0.5" /> Accepted
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={generateCodes}
              disabled={loading}
            >
              Regenerate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
            </Button>
          </div>
        </div>

        {!collapsed && result && (
          <div className="space-y-2 mt-2">
            {/* Encounter Level & Complexity */}
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="text-[10px]">
                <FileText className="size-3 mr-1" />
                E/M Level: {result.encounterLevel}
              </Badge>
              <div className="flex-1 min-w-[120px]">
                <ComplexityGauge complexity={result.estimatedComplexity} />
              </div>
            </div>
            {result.codingSummary && (
              <p className="text-xs text-[color:var(--color-muted-foreground)]">
                {result.codingSummary}
              </p>
            )}
          </div>
        )}
      </CardHeader>

      {!collapsed && result && (
        <CardContent className="space-y-4 pt-2">
          {/* Discrepancies / Warnings */}
          {result.discrepancies.length > 0 && (
            <div className="space-y-2">
              <h5 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700">
                <ShieldAlert className="size-3.5" />
                Coding Alerts
              </h5>
              <div className="space-y-1.5">
                {result.discrepancies.map((d, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border p-2.5 text-xs",
                      d.severity === "critical"
                        ? "border-red-200 bg-red-50/50"
                        : d.severity === "warning"
                        ? "border-amber-200 bg-amber-50/50"
                        : "border-blue-200 bg-blue-50/50"
                    )}
                  >
                    <div className="flex items-start gap-1.5">
                      {d.severity === "critical" ? (
                        <AlertTriangle className="size-3.5 text-red-600 shrink-0 mt-0.5" />
                      ) : d.severity === "warning" ? (
                        <AlertTriangle className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="size-3.5 text-blue-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium">{d.description}</p>
                        <p className="text-[color:var(--color-muted-foreground)] mt-0.5">
                          {d.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ICD-10 Codes */}
          {result.icd10Codes.length > 0 && (
            <div className="space-y-2">
              <h5 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                ICD-10-CM Diagnosis Codes
                <Badge variant="outline" className="text-[10px] ml-auto">{result.icd10Codes.length}</Badge>
              </h5>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[color:var(--color-muted)]/10">
                    <tr>
                      <th className="text-left px-3 py-1.5 font-medium">Code</th>
                      <th className="text-left px-3 py-1.5 font-medium">Description</th>
                      <th className="text-left px-3 py-1.5 font-medium">Confidence</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--color-border)]">
                    {result.icd10Codes.map((code, i) => (
                      <tr key={i} className="hover:bg-[color:var(--color-muted)]/5">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <code className="font-mono font-semibold text-blue-700">{code.code}</code>
                            {code.isPrimary && (
                              <Badge variant="outline" className="text-[9px] bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)] border-[color:var(--color-brand-pink)]/30">
                                Primary
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium">{code.description}</p>
                          <p className="text-[color:var(--color-muted-foreground)] text-[10px] mt-0.5">
                            {code.supportingEvidence}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          <ConfidenceBadge confidence={code.confidence} />
                        </td>
                        <td className="px-2 py-2">
                          <CopyButton text={code.code} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CPT Codes */}
          {result.cptCodes.length > 0 && (
            <div className="space-y-2">
              <h5 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                CPT Procedure Codes
                <Badge variant="outline" className="text-[10px] ml-auto">{result.cptCodes.length}</Badge>
              </h5>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[color:var(--color-muted)]/10">
                    <tr>
                      <th className="text-left px-3 py-1.5 font-medium">Code</th>
                      <th className="text-left px-3 py-1.5 font-medium">Description</th>
                      <th className="text-left px-3 py-1.5 font-medium">Confidence</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--color-border)]">
                    {result.cptCodes.map((code, i) => (
                      <tr key={i} className="hover:bg-[color:var(--color-muted)]/5">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <code className="font-mono font-semibold text-purple-700">{code.code}</code>
                            {code.modifier && (
                              <Badge variant="outline" className="text-[9px]">
                                -{code.modifier}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium">{code.description}</p>
                          <p className="text-[color:var(--color-muted-foreground)] text-[10px] mt-0.5">
                            {code.supportingEvidence}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          <ConfidenceBadge confidence={code.confidence} />
                        </td>
                        <td className="px-2 py-2">
                          <CopyButton text={code.code} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Accept All Button */}
          {!accepted && (result.icd10Codes.length > 0 || result.cptCodes.length > 0) && (
            <div className="flex justify-end pt-2">
              <Button
                variant="brand"
                size="md"
                onClick={handleAcceptAll}
              >
                <CheckCircle2 className="size-4 mr-1.5" />
                Accept & Attach to Encounter
              </Button>
            </div>
          )}

          {/* Disclaimer */}
          <p className="flex items-start gap-1.5 text-[10px] text-[color:var(--color-muted-foreground)] border-t pt-2">
            <AlertTriangle className="size-3 shrink-0 mt-0.5" />
            Billing codes are suggestions only. The physician is responsible for final
            code selection. Codes should be verified against current CMS/CCHI guidelines
            before claim submission.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
