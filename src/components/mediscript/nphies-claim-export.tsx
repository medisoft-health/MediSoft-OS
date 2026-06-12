"use client";

import { useState } from "react";
import {
  FileJson,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Shield,
  Loader2,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────

interface BillingResult {
  icd10amCodes: Array<{
    code: string;
    description: string;
    descriptionAr: string;
    isPrimary: boolean;
    sequencing: number;
  }>;
  sbsProcedureCodes: Array<{
    code: string;
    description: string;
    descriptionAr: string;
    units?: number;
  }>;
  sbsServiceCodes?: Array<{
    code: string;
    description: string;
    descriptionAr: string;
  }>;
  nphiesClassification: {
    type: string;
    claimType: string;
    subType?: string;
  };
}

interface PatientInfo {
  id: number | string;
  name: string;
  nameAr?: string;
  nationalId?: string;
  mrn?: string;
  birthDate?: string;
  gender?: string;
  insuranceId?: string;
  insurerCode?: string;
  policyNumber?: string;
}

interface ClaimValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface NphiesClaimExportProps {
  billingResult: BillingResult | null;
  patientInfo: PatientInfo;
  encounterDate?: string;
}

// ─────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────

export function NphiesClaimExport({
  billingResult,
  patientInfo,
  encounterDate,
}: NphiesClaimExportProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claim, setClaim] = useState<any>(null);
  const [validation, setValidation] = useState<ClaimValidation | null>(null);
  const [copied, setCopied] = useState(false);

  const generateClaim = async () => {
    if (!billingResult) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mediscript/nphies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingResult,
          patientInfo,
          encounterDate: encounterDate || new Date().toISOString().split("T")[0],
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setClaim(data.claim);
      setValidation(data.validation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل في إنشاء المطالبة");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (claim) {
      navigator.clipboard.writeText(JSON.stringify(claim, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (claim) {
      const blob = new Blob([JSON.stringify(claim, null, 2)], {
        type: "application/fhir+json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nphies-claim-${claim.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Not ready (no billing result)
  if (!billingResult) {
    return null;
  }

  // Not yet generated
  if (!claim && !loading) {
    return (
      <div className="mt-3 pt-3 border-t border-dashed">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-green-100">
              <FileJson className="size-4 text-green-700" />
            </div>
            <div>
              <h5 className="text-xs font-semibold">تصدير مطالبة NPHIES</h5>
              <p className="text-[10px] text-[color:var(--color-muted-foreground)]">
                إنشاء مطالبة FHIR R4 متوافقة مع المنصة الوطنية
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50"
            onClick={generateClaim}
            disabled={loading}
          >
            <FileJson className="size-3 mr-1" />
            إنشاء المطالبة
          </Button>
        </div>
        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1 mt-2">
            <AlertTriangle className="size-3" /> {error}
          </p>
        )}
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="mt-3 pt-3 border-t border-dashed">
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="size-4 animate-spin text-green-600" />
          <span className="text-xs text-[color:var(--color-muted-foreground)]">
            جارٍ إنشاء مطالبة NPHIES...
          </span>
        </div>
      </div>
    );
  }

  // Generated — show result
  return (
    <div className="mt-3 pt-3 border-t border-dashed space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "grid size-8 place-items-center rounded-lg",
            validation?.valid ? "bg-green-100" : "bg-amber-100"
          )}>
            {validation?.valid ? (
              <CheckCircle2 className="size-4 text-green-700" />
            ) : (
              <AlertCircle className="size-4 text-amber-700" />
            )}
          </div>
          <div>
            <h5 className="text-xs font-semibold flex items-center gap-1.5">
              مطالبة NPHIES — FHIR R4
              {validation?.valid && (
                <Badge variant="outline" className="text-[9px] bg-green-50 text-green-700 border-green-200">
                  <Shield className="size-2.5 mr-0.5" /> متوافقة
                </Badge>
              )}
            </h5>
            <p className="text-[10px] text-[color:var(--color-muted-foreground)] font-mono">
              {claim?.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleCopy}
            title="نسخ JSON"
          >
            {copied ? (
              <CheckCircle2 className="size-3.5 text-green-600" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleDownload}
            title="تحميل ملف FHIR JSON"
          >
            <Download className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Validation Results */}
      {validation && (
        <div className="space-y-1.5">
          {validation.errors.length > 0 && (
            <div className="space-y-1">
              {validation.errors.map((err, i) => (
                <p key={i} className="text-[11px] text-red-600 flex items-start gap-1" dir="auto">
                  <AlertCircle className="size-3 shrink-0 mt-0.5" />
                  {err}
                </p>
              ))}
            </div>
          )}
          {validation.warnings.length > 0 && (
            <div className="space-y-1">
              {validation.warnings.map((warn, i) => (
                <p key={i} className="text-[11px] text-amber-600 flex items-start gap-1" dir="auto">
                  <AlertTriangle className="size-3 shrink-0 mt-0.5" />
                  {warn}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Claim Summary */}
      <div className="rounded-lg bg-[color:var(--color-muted)]/30 p-2.5 text-[11px] space-y-1">
        <div className="flex justify-between">
          <span className="text-[color:var(--color-muted-foreground)]">نوع المطالبة:</span>
          <span className="font-medium">{claim?.type?.coding?.[0]?.display || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[color:var(--color-muted-foreground)]">التشخيصات:</span>
          <span className="font-medium">{claim?.diagnosis?.length || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[color:var(--color-muted-foreground)]">الإجراءات:</span>
          <span className="font-medium">{claim?.procedure?.length || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[color:var(--color-muted-foreground)]">الخدمات:</span>
          <span className="font-medium">{claim?.item?.length || 0}</span>
        </div>
        {claim?.total && (
          <div className="flex justify-between border-t pt-1 mt-1">
            <span className="text-[color:var(--color-muted-foreground)]">الإجمالي:</span>
            <span className="font-semibold">{claim.total.value} {claim.total.currency}</span>
          </div>
        )}
      </div>

      {/* Compliance Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-[9px] bg-green-50 text-green-700 border-green-200">
          <Shield className="size-2.5 mr-0.5" /> ICD-10-AM
        </Badge>
        <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200">
          SBS/ACHI
        </Badge>
        <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200">
          FHIR R4
        </Badge>
        <Badge variant="outline" className="text-[9px] bg-teal-50 text-teal-700 border-teal-200">
          NPHIES IG 1.0
        </Badge>
      </div>

      {/* Note */}
      <p className="text-[10px] text-[color:var(--color-muted-foreground)]" dir="auto">
        هذه المطالبة جاهزة للإرسال عبر منصة NPHIES. يرجى مراجعة التحقق أعلاه قبل الإرسال.
        يمكن تحميل الملف بصيغة FHIR JSON أو نسخه مباشرة.
      </p>
    </div>
  );
}
