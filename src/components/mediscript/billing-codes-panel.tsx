"use client";

import { useState, useCallback } from "react";
import { NphiesClaimExport } from "@/components/mediscript/nphies-claim-export";
import {
  Receipt,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ShieldAlert,
  Gauge,
  Building2,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SoapNoteInput } from "@/lib/validations/encounter";

// ─────────────────────────────────────────────────────────────────
//  Types (mirror server-side Saudi-compliant types)
// ─────────────────────────────────────────────────────────────────

interface ICD10AMSuggestion {
  code: string;
  description: string;
  descriptionAr: string;
  category: string;
  confidence: "high" | "moderate" | "low";
  supportingEvidence: string;
  isPrimary: boolean;
  sequencing: number;
  presentOnAdmission?: string;
}

interface SBSProcedureSuggestion {
  code: string;
  description: string;
  descriptionAr: string;
  category: string;
  confidence: "high" | "moderate" | "low";
  supportingEvidence: string;
  block?: number;
  units?: number;
}

interface SBSServiceSuggestion {
  code: string;
  description: string;
  descriptionAr: string;
  category: string;
  confidence: "high" | "moderate" | "low";
  supportingEvidence: string;
}

interface CodingDiscrepancy {
  type: string;
  description: string;
  descriptionAr: string;
  recommendation: string;
  recommendationAr: string;
  severity: "info" | "warning" | "critical";
  nphiesRule?: string;
}

interface NphiesEncounterClassification {
  type: string;
  typeDescription: string;
  typeDescriptionAr: string;
  claimType: string;
  serviceType: string;
}

interface BillingIntelligenceResult {
  icd10amCodes: ICD10AMSuggestion[];
  sbsProcedureCodes: SBSProcedureSuggestion[];
  sbsServiceCodes: SBSServiceSuggestion[];
  discrepancies: CodingDiscrepancy[];
  nphiesClassification: NphiesEncounterClassification;
  estimatedComplexity: "low" | "moderate" | "high" | "critical";
  codingSummary: string;
  codingSummaryAr: string;
  nphiesReadiness: number;
  // Legacy aliases
  icd10Codes: ICD10AMSuggestion[];
  cptCodes: SBSProcedureSuggestion[];
}

// ─────────────────────────────────────────────────────────────────
//  Props
// ─────────────────────────────────────────────────────────────────

interface BillingCodesPanelProps {
  soapNote: SoapNoteInput;
  encounterType: string;
  patientContext?: string;
  patientId?: number;
  patientName?: string;
  onCodesAccepted?: (icd10: ICD10AMSuggestion[], sbs: SBSProcedureSuggestion[]) => void;
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

function NphiesReadinessGauge({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return "bg-emerald-500";
    if (s >= 60) return "bg-amber-500";
    return "bg-red-500";
  };
  const getLabel = (s: number) => {
    if (s >= 80) return "NPHIES Ready";
    if (s >= 60) return "Needs Review";
    return "Not Ready";
  };

  return (
    <div className="flex items-center gap-2">
      <Shield className="size-3.5 text-[color:var(--color-muted-foreground)]" />
      <div className="flex-1 h-2 rounded-full bg-[color:var(--color-muted)]/20 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", getColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-[10px] font-semibold">{score}%</span>
      <span className="text-[10px] text-[color:var(--color-muted-foreground)]">{getLabel(score)}</span>
    </div>
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
  patientId,
  patientName,
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
      onCodesAccepted?.(
        result.icd10amCodes || result.icd10Codes,
        result.sbsProcedureCodes || result.cptCodes,
      );
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
            <h4 className="font-semibold text-sm">ذكاء الترميز الطبي — Billing Code Intelligence</h4>
            <p className="text-xs text-[color:var(--color-muted-foreground)] max-w-sm">
              تحليل الزيارة واقتراح أكواد ICD-10-AM للتشخيصات وأكواد SBS/ACHI
              للإجراءات وفق معايير مجلس الضمان الصحي (CHI) ومنصة نفيس (NPHIES).
            </p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Badge variant="outline" className="text-[9px] bg-green-50 text-green-700 border-green-200">
                <Shield className="size-2.5 mr-0.5" /> NPHIES
              </Badge>
              <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200">
                ICD-10-AM
              </Badge>
              <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200">
                SBS/ACHI
              </Badge>
            </div>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={generateCodes}
            disabled={loading}
          >
            <Receipt className="size-4 mr-1.5" />
            إنشاء أكواد الفوترة — Generate Billing Codes
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
            <h4 className="font-semibold text-sm">جارٍ تحليل التوثيق — Analyzing Documentation</h4>
            <p className="text-xs text-[color:var(--color-muted-foreground)]">
              ربط التشخيصات بأكواد ICD-10-AM والإجراءات بأكواد SBS/ACHI...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Results
  const icd10Codes = result?.icd10amCodes || result?.icd10Codes || [];
  const sbsProcedures = result?.sbsProcedureCodes || result?.cptCodes || [];
  const sbsServices = result?.sbsServiceCodes || [];

  return (
    <Card className="border-blue-200/40">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Receipt className="size-4 text-blue-700" />
            ذكاء الترميز الطبي — Billing Intelligence
            {accepted && (
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="size-3 mr-0.5" /> معتمد
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
              إعادة إنشاء
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
            {/* NPHIES Classification & Readiness */}
            <div className="flex items-center gap-3 flex-wrap">
              {result.nphiesClassification && (
                <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                  <Building2 className="size-3 mr-1" />
                  {result.nphiesClassification.type} — {result.nphiesClassification.typeDescriptionAr || result.nphiesClassification.typeDescription}
                </Badge>
              )}
              {result.nphiesClassification && (
                <Badge variant="outline" className="text-[10px]">
                  {result.nphiesClassification.claimType}
                </Badge>
              )}
            </div>

            {/* NPHIES Readiness Score */}
            {typeof result.nphiesReadiness === "number" && (
              <NphiesReadinessGauge score={result.nphiesReadiness} />
            )}

            {/* Complexity */}
            <ComplexityGauge complexity={result.estimatedComplexity} />

            {(result.codingSummaryAr || result.codingSummary) && (
              <p className="text-xs text-[color:var(--color-muted-foreground)]" dir="auto">
                {result.codingSummaryAr || result.codingSummary}
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
                تنبيهات الترميز — Coding Alerts
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
                        <p className="font-medium" dir="auto">{d.descriptionAr || d.description}</p>
                        <p className="text-[color:var(--color-muted-foreground)] mt-0.5" dir="auto">
                          {d.recommendationAr || d.recommendation}
                        </p>
                        {d.nphiesRule && (
                          <Badge variant="outline" className="text-[9px] mt-1">
                            NPHIES: {d.nphiesRule}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ICD-10-AM Diagnosis Codes */}
          {icd10Codes.length > 0 && (
            <div className="space-y-2">
              <h5 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                أكواد التشخيص ICD-10-AM
                <Badge variant="outline" className="text-[10px] ml-auto">{icd10Codes.length}</Badge>
              </h5>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[color:var(--color-muted)]/10">
                    <tr>
                      <th className="text-left px-3 py-1.5 font-medium">#</th>
                      <th className="text-left px-3 py-1.5 font-medium">الكود</th>
                      <th className="text-left px-3 py-1.5 font-medium">الوصف</th>
                      <th className="text-left px-3 py-1.5 font-medium">الثقة</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--color-border)]">
                    {icd10Codes
                      .sort((a, b) => (a.sequencing || 99) - (b.sequencing || 99))
                      .map((code, i) => (
                      <tr key={i} className="hover:bg-[color:var(--color-muted)]/5">
                        <td className="px-3 py-2 text-center">
                          <span className="text-[10px] font-mono text-[color:var(--color-muted-foreground)]">
                            {code.sequencing || i + 1}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <code className="font-mono font-semibold text-blue-700">{code.code}</code>
                            {code.isPrimary && (
                              <Badge variant="outline" className="text-[9px] bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)] border-[color:var(--color-brand-pink)]/30">
                                رئيسي
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium" dir="auto">{code.descriptionAr || code.description}</p>
                          <p className="text-[color:var(--color-muted-foreground)] text-[10px] mt-0.5">
                            {code.description !== code.descriptionAr ? code.description : ""}
                          </p>
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

          {/* SBS/ACHI Procedure Codes */}
          {sbsProcedures.length > 0 && (
            <div className="space-y-2">
              <h5 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                أكواد الإجراءات SBS/ACHI
                <Badge variant="outline" className="text-[10px] ml-auto">{sbsProcedures.length}</Badge>
              </h5>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[color:var(--color-muted)]/10">
                    <tr>
                      <th className="text-left px-3 py-1.5 font-medium">الكود</th>
                      <th className="text-left px-3 py-1.5 font-medium">الوصف</th>
                      <th className="text-left px-3 py-1.5 font-medium">الثقة</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--color-border)]">
                    {sbsProcedures.map((code, i) => (
                      <tr key={i} className="hover:bg-[color:var(--color-muted)]/5">
                        <td className="px-3 py-2">
                          <code className="font-mono font-semibold text-purple-700">{code.code}</code>
                          {code.units && code.units > 1 && (
                            <Badge variant="outline" className="text-[9px] ml-1">
                              x{code.units}
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium" dir="auto">{code.descriptionAr || code.description}</p>
                          <p className="text-[color:var(--color-muted-foreground)] text-[10px] mt-0.5">
                            {code.description !== code.descriptionAr ? code.description : ""}
                          </p>
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

          {/* SBS Service Codes */}
          {sbsServices.length > 0 && (
            <div className="space-y-2">
              <h5 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                أكواد الخدمات SBS
                <Badge variant="outline" className="text-[10px] ml-auto">{sbsServices.length}</Badge>
              </h5>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[color:var(--color-muted)]/10">
                    <tr>
                      <th className="text-left px-3 py-1.5 font-medium">الكود</th>
                      <th className="text-left px-3 py-1.5 font-medium">الوصف</th>
                      <th className="text-left px-3 py-1.5 font-medium">النوع</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--color-border)]">
                    {sbsServices.map((code, i) => (
                      <tr key={i} className="hover:bg-[color:var(--color-muted)]/5">
                        <td className="px-3 py-2">
                          <code className="font-mono font-semibold text-teal-700">{code.code}</code>
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium" dir="auto">{code.descriptionAr || code.description}</p>
                          <p className="text-[color:var(--color-muted-foreground)] text-[10px] mt-0.5">
                            {code.supportingEvidence}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className="text-[9px]">
                            {code.category}
                          </Badge>
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
          {!accepted && (icd10Codes.length > 0 || sbsProcedures.length > 0) && (
            <div className="flex justify-end pt-2">
              <Button
                variant="brand"
                size="sm"
                onClick={handleAcceptAll}
              >
                <CheckCircle2 className="size-4 mr-1.5" />
                اعتماد وإرفاق بالزيارة — Accept & Attach
              </Button>
            </div>
          )}

          {/* NPHIES Claim Export */}
          {accepted && result && (
            <NphiesClaimExport
              billingResult={{
                icd10amCodes: (result.icd10amCodes || result.icd10Codes).map(c => ({
                  code: c.code,
                  description: c.description,
                  descriptionAr: c.descriptionAr,
                  isPrimary: c.isPrimary,
                  sequencing: c.sequencing,
                })),
                sbsProcedureCodes: (result.sbsProcedureCodes || result.cptCodes).map(c => ({
                  code: c.code,
                  description: c.description,
                  descriptionAr: c.descriptionAr,
                  units: c.units,
                })),
                sbsServiceCodes: result.sbsServiceCodes?.map(c => ({
                  code: c.code,
                  description: c.description,
                  descriptionAr: c.descriptionAr,
                })),
                nphiesClassification: {
                  type: result.nphiesClassification.type,
                  claimType: result.nphiesClassification.claimType,
                },
              }}
              patientInfo={{
                id: patientId || 0,
                name: patientName || "Patient",
              }}
            />
          )}

          {/* Disclaimer */}
          <p className="flex items-start gap-1.5 text-[10px] text-[color:var(--color-muted-foreground)] border-t pt-2" dir="auto">
            <AlertTriangle className="size-3 shrink-0 mt-0.5" />
            أكواد الفوترة هي اقتراحات فقط. الطبيب مسؤول عن الاختيار النهائي للأكواد.
            يجب التحقق من الأكواد وفق إرشادات مجلس الضمان الصحي (CHI) ومنصة نفيس (NPHIES) قبل تقديم المطالبة.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
