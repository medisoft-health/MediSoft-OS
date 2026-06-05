"use client";

import { useState, useCallback } from "react";
import {
  Pill,
  TestTubes,
  ScanLine,
  UserPlus,
  CalendarClock,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SoapNoteInput } from "@/lib/validations/encounter";

// ─────────────────────────────────────────────────────────────────
//  Types (mirror the server-side Saudi-compliant types)
// ─────────────────────────────────────────────────────────────────

interface SuggestedPrescription {
  drugName: string;
  drugNameAr: string;
  sfdaCode?: string;
  dose: string;
  frequency: string;
  route: string;
  duration: string;
  instructions: string;
  instructionsAr: string;
  rationale: string;
  rationaleAr: string;
  priority: "routine" | "urgent" | "stat";
  requiresPriorAuth?: boolean;
}

interface SuggestedLabOrder {
  panelName: string;
  panelNameAr: string;
  loincCode?: string;
  mohCode?: string;
  rationale: string;
  rationaleAr: string;
  priority: "routine" | "urgent" | "stat";
  fasting?: boolean;
}

interface SuggestedImagingOrder {
  scanType: string;
  scanTypeAr: string;
  bodyPart: string;
  bodyPartAr: string;
  modality: string;
  rationale: string;
  rationaleAr: string;
  priority: "routine" | "urgent" | "stat";
  contrastRequired?: boolean;
  mohApprovalRequired?: boolean;
}

interface SuggestedReferral {
  specialty: string;
  specialtyAr: string;
  reason: string;
  reasonAr: string;
  urgency: "routine" | "urgent" | "emergent";
  clinicalQuestion: string;
  clinicalQuestionAr: string;
  nphiesServiceType?: string;
}

interface SuggestedFollowUp {
  timeframe: string;
  timeframeAr: string;
  reason: string;
  reasonAr: string;
  instructions: string;
  instructionsAr: string;
  appointmentType: "in_person" | "telemedicine" | "phone";
}

interface OrderAutomationResult {
  prescriptions: SuggestedPrescription[];
  labOrders: SuggestedLabOrder[];
  imagingOrders: SuggestedImagingOrder[];
  referrals: SuggestedReferral[];
  followUps: SuggestedFollowUp[];
  clinicalSummary: string;
  clinicalSummaryAr: string;
}

// ─────────────────────────────────────────────────────────────────
//  Props
// ─────────────────────────────────────────────────────────────────

interface OrderSuggestionsPanelProps {
  soapNote: SoapNoteInput;
  patientId: number;
  patientContext?: string;
  encounterId?: string;
  onCreatePrescription?: (rx: SuggestedPrescription) => void;
  onCreateLabOrder?: (lab: SuggestedLabOrder) => void;
  onCreateImagingOrder?: (img: SuggestedImagingOrder) => void;
  onCreateReferral?: (ref: SuggestedReferral) => void;
  onScheduleFollowUp?: (fu: SuggestedFollowUp) => void;
}

// ─────────────────────────────────────────────────────────────────
//  Priority Badge
// ─────────────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    stat: "bg-red-100 text-red-800 border-red-200",
    urgent: "bg-amber-100 text-amber-800 border-amber-200",
    emergent: "bg-red-100 text-red-800 border-red-200",
    routine: "bg-green-100 text-green-800 border-green-200",
  };
  const labels: Record<string, string> = {
    stat: "فوري",
    urgent: "عاجل",
    emergent: "طارئ",
    routine: "روتيني",
  };
  return (
    <Badge variant="outline" className={cn("text-[10px] uppercase font-semibold", colors[priority] || colors.routine)}>
      {labels[priority] || priority}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Section Components
// ─────────────────────────────────────────────────────────────────

function PrescriptionCard({
  rx,
  onAccept,
  accepted,
}: {
  rx: SuggestedPrescription;
  onAccept: () => void;
  accepted: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      "rounded-lg border p-3 transition-all",
      accepted ? "border-emerald-300 bg-emerald-50/50" : "border-[color:var(--color-border)] hover:border-[color:var(--color-brand-pink)]/40"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{rx.drugName}</span>
            {rx.drugNameAr && rx.drugNameAr !== rx.drugName && (
              <span className="text-xs text-[color:var(--color-muted-foreground)]" dir="rtl">({rx.drugNameAr})</span>
            )}
            <PriorityBadge priority={rx.priority} />
            {rx.requiresPriorAuth && (
              <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">
                <Shield className="size-2.5 mr-0.5" /> موافقة مسبقة
              </Badge>
            )}
            {rx.sfdaCode && (
              <Badge variant="outline" className="text-[9px] font-mono">
                SFDA: {rx.sfdaCode}
              </Badge>
            )}
          </div>
          <p className="text-xs text-[color:var(--color-muted-foreground)] mt-0.5">
            {rx.dose} · {rx.frequency} · {rx.route}
            {rx.duration && ` · ${rx.duration}`}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </Button>
          <Button
            variant={accepted ? "outline" : "brand"}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={onAccept}
            disabled={accepted}
          >
            {accepted ? (
              <><CheckCircle2 className="size-3 mr-1" /> تم</>
            ) : (
              <><Plus className="size-3 mr-1" /> PharmaX</>
            )}
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="mt-2 pt-2 border-t border-dashed text-xs space-y-1">
          {(rx.instructionsAr || rx.instructions) && (
            <p dir="auto"><span className="font-medium">التعليمات:</span> {rx.instructionsAr || rx.instructions}</p>
          )}
          <p className="text-[color:var(--color-muted-foreground)]" dir="auto">
            <span className="font-medium">المبرر السريري:</span> {rx.rationaleAr || rx.rationale}
          </p>
        </div>
      )}
    </div>
  );
}

function LabOrderCard({
  lab,
  onAccept,
  accepted,
}: {
  lab: SuggestedLabOrder;
  onAccept: () => void;
  accepted: boolean;
}) {
  return (
    <div className={cn(
      "rounded-lg border p-3 transition-all",
      accepted ? "border-emerald-300 bg-emerald-50/50" : "border-[color:var(--color-border)] hover:border-blue-300/60"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{lab.panelName}</span>
            {lab.panelNameAr && lab.panelNameAr !== lab.panelName && (
              <span className="text-xs text-[color:var(--color-muted-foreground)]" dir="rtl">({lab.panelNameAr})</span>
            )}
            <PriorityBadge priority={lab.priority} />
            {lab.fasting && (
              <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                صائم
              </Badge>
            )}
          </div>
          <p className="text-xs text-[color:var(--color-muted-foreground)] mt-0.5" dir="auto">
            {lab.rationaleAr || lab.rationale}
          </p>
          <div className="flex gap-2 mt-0.5">
            {lab.loincCode && (
              <span className="text-[10px] font-mono text-[color:var(--color-muted-foreground)]">
                LOINC: {lab.loincCode}
              </span>
            )}
            {lab.mohCode && (
              <span className="text-[10px] font-mono text-[color:var(--color-muted-foreground)]">
                MOH: {lab.mohCode}
              </span>
            )}
          </div>
        </div>
        <Button
          variant={accepted ? "outline" : "default"}
          size="sm"
          className="h-7 text-xs px-2 shrink-0"
          onClick={onAccept}
          disabled={accepted}
        >
          {accepted ? (
            <><CheckCircle2 className="size-3 mr-1" /> تم</>
          ) : (
            <><Plus className="size-3 mr-1" /> MediLab</>
          )}
        </Button>
      </div>
    </div>
  );
}

function ImagingOrderCard({
  img,
  onAccept,
  accepted,
}: {
  img: SuggestedImagingOrder;
  onAccept: () => void;
  accepted: boolean;
}) {
  return (
    <div className={cn(
      "rounded-lg border p-3 transition-all",
      accepted ? "border-emerald-300 bg-emerald-50/50" : "border-[color:var(--color-border)] hover:border-purple-300/60"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{img.scanType}</span>
            {img.scanTypeAr && img.scanTypeAr !== img.scanType && (
              <span className="text-xs text-[color:var(--color-muted-foreground)]" dir="rtl">({img.scanTypeAr})</span>
            )}
            <Badge variant="outline" className="text-[10px]">{img.modality}</Badge>
            <PriorityBadge priority={img.priority} />
            {img.contrastRequired && (
              <Badge variant="outline" className="text-[10px] bg-yellow-50 text-yellow-700 border-yellow-200">
                + صبغة
              </Badge>
            )}
            {img.mohApprovalRequired && (
              <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">
                <Shield className="size-2.5 mr-0.5" /> موافقة وزارة الصحة
              </Badge>
            )}
          </div>
          <p className="text-xs text-[color:var(--color-muted-foreground)] mt-0.5" dir="auto">
            {img.bodyPartAr || img.bodyPart} — {img.rationaleAr || img.rationale}
          </p>
        </div>
        <Button
          variant={accepted ? "outline" : "default"}
          size="sm"
          className="h-7 text-xs px-2 shrink-0"
          onClick={onAccept}
          disabled={accepted}
        >
          {accepted ? (
            <><CheckCircle2 className="size-3 mr-1" /> تم</>
          ) : (
            <><Plus className="size-3 mr-1" /> MediScan</>
          )}
        </Button>
      </div>
    </div>
  );
}

function ReferralCard({
  ref: referral,
  onAccept,
  accepted,
}: {
  ref: SuggestedReferral;
  onAccept: () => void;
  accepted: boolean;
}) {
  return (
    <div className={cn(
      "rounded-lg border p-3 transition-all",
      accepted ? "border-emerald-300 bg-emerald-50/50" : "border-[color:var(--color-border)] hover:border-teal-300/60"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{referral.specialty}</span>
            {referral.specialtyAr && referral.specialtyAr !== referral.specialty && (
              <span className="text-xs text-[color:var(--color-muted-foreground)]" dir="rtl">({referral.specialtyAr})</span>
            )}
            <PriorityBadge priority={referral.urgency} />
            {referral.nphiesServiceType && (
              <Badge variant="outline" className="text-[9px] bg-green-50 text-green-700 border-green-200">
                NPHIES: {referral.nphiesServiceType}
              </Badge>
            )}
          </div>
          <p className="text-xs text-[color:var(--color-muted-foreground)] mt-0.5" dir="auto">
            {referral.reasonAr || referral.reason}
          </p>
          <p className="text-[11px] text-[color:var(--color-muted-foreground)] mt-1 italic" dir="auto">
            السؤال السريري: {referral.clinicalQuestionAr || referral.clinicalQuestion}
          </p>
        </div>
        <Button
          variant={accepted ? "outline" : "default"}
          size="sm"
          className="h-7 text-xs px-2 shrink-0"
          onClick={onAccept}
          disabled={accepted}
        >
          {accepted ? (
            <><CheckCircle2 className="size-3 mr-1" /> تم</>
          ) : (
            <><Plus className="size-3 mr-1" /> إحالة</>
          )}
        </Button>
      </div>
    </div>
  );
}

function FollowUpCard({
  fu,
  onAccept,
  accepted,
}: {
  fu: SuggestedFollowUp;
  onAccept: () => void;
  accepted: boolean;
}) {
  const typeLabels: Record<string, string> = {
    in_person: "حضوري",
    telemedicine: "عن بُعد",
    phone: "هاتفي",
  };

  return (
    <div className={cn(
      "rounded-lg border p-3 transition-all",
      accepted ? "border-emerald-300 bg-emerald-50/50" : "border-[color:var(--color-border)] hover:border-indigo-300/60"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{fu.timeframeAr || fu.timeframe}</span>
            <Badge variant="outline" className="text-[10px]">
              {typeLabels[fu.appointmentType] || fu.appointmentType}
            </Badge>
          </div>
          <p className="text-xs text-[color:var(--color-muted-foreground)] mt-0.5" dir="auto">
            {fu.reasonAr || fu.reason}
          </p>
          {(fu.instructionsAr || fu.instructions) && (
            <p className="text-[11px] text-[color:var(--color-muted-foreground)] mt-1" dir="auto">
              التعليمات: {fu.instructionsAr || fu.instructions}
            </p>
          )}
        </div>
        <Button
          variant={accepted ? "outline" : "default"}
          size="sm"
          className="h-7 text-xs px-2 shrink-0"
          onClick={onAccept}
          disabled={accepted}
        >
          {accepted ? (
            <><CheckCircle2 className="size-3 mr-1" /> تم</>
          ) : (
            <><Plus className="size-3 mr-1" /> جدولة</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────────────────

export function OrderSuggestionsPanel({
  soapNote,
  patientId,
  patientContext,
  encounterId,
  onCreatePrescription,
  onCreateLabOrder,
  onCreateImagingOrder,
  onCreateReferral,
  onScheduleFollowUp,
}: OrderSuggestionsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrderAutomationResult | null>(null);
  const [acceptedRx, setAcceptedRx] = useState<Set<number>>(new Set());
  const [acceptedLab, setAcceptedLab] = useState<Set<number>>(new Set());
  const [acceptedImg, setAcceptedImg] = useState<Set<number>>(new Set());
  const [acceptedRef, setAcceptedRef] = useState<Set<number>>(new Set());
  const [acceptedFu, setAcceptedFu] = useState<Set<number>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  const generateSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mediscript/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soapNote,
          patientContext,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل في إنشاء الاقتراحات");
    } finally {
      setLoading(false);
    }
  }, [soapNote, patientContext]);

  const handleAcceptRx = (idx: number, rx: SuggestedPrescription) => {
    setAcceptedRx((prev) => new Set(prev).add(idx));
    onCreatePrescription?.(rx);
  };

  const handleAcceptLab = (idx: number, lab: SuggestedLabOrder) => {
    setAcceptedLab((prev) => new Set(prev).add(idx));
    onCreateLabOrder?.(lab);
  };

  const handleAcceptImg = (idx: number, img: SuggestedImagingOrder) => {
    setAcceptedImg((prev) => new Set(prev).add(idx));
    onCreateImagingOrder?.(img);
  };

  const handleAcceptRef = (idx: number, ref: SuggestedReferral) => {
    setAcceptedRef((prev) => new Set(prev).add(idx));
    onCreateReferral?.(ref);
  };

  const handleAcceptFu = (idx: number, fu: SuggestedFollowUp) => {
    setAcceptedFu((prev) => new Set(prev).add(idx));
    onScheduleFollowUp?.(fu);
  };

  const totalSuggestions = result
    ? result.prescriptions.length +
      result.labOrders.length +
      result.imagingOrders.length +
      result.referrals.length +
      result.followUps.length
    : 0;

  const totalAccepted =
    acceptedRx.size + acceptedLab.size + acceptedImg.size + acceptedRef.size + acceptedFu.size;

  // Not yet generated
  if (!result && !loading) {
    return (
      <Card className="border-dashed border-[color:var(--color-brand-pink)]/30 bg-gradient-to-br from-[color:var(--color-brand-pink)]/5 to-transparent">
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-[color:var(--color-brand-pink)]/10">
            <Sparkles className="size-6 text-[color:var(--color-brand-magenta)]" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-sm">ذكاء الطلبات — Order Intelligence</h4>
            <p className="text-xs text-[color:var(--color-muted-foreground)] max-w-sm" dir="auto">
              تحليل تقرير SOAP واقتراح الوصفات والتحاليل والأشعة والإحالات ومواعيد المتابعة
              وفق معايير وزارة الصحة وهيئة الغذاء والدواء (SFDA).
            </p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Badge variant="outline" className="text-[9px] bg-green-50 text-green-700 border-green-200">
                <Shield className="size-2.5 mr-0.5" /> SFDA
              </Badge>
              <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200">
                MOH
              </Badge>
              <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200">
                NPHIES
              </Badge>
            </div>
          </div>
          <Button
            variant="brand"
            size="sm"
            onClick={generateSuggestions}
            disabled={loading}
          >
            <Sparkles className="size-4 mr-1.5" />
            إنشاء اقتراحات الطلبات — Generate Orders
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

  // Loading state
  if (loading) {
    return (
      <Card className="border-[color:var(--color-brand-pink)]/20">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <Loader2 className="size-8 animate-spin text-[color:var(--color-brand-magenta)]" />
          <div className="space-y-1">
            <h4 className="font-semibold text-sm">جارٍ تحليل التقرير — Analyzing SOAP Note</h4>
            <p className="text-xs text-[color:var(--color-muted-foreground)]" dir="auto">
              إنشاء اقتراحات الطلبات السريرية بناءً على النتائج الموثقة...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Results
  return (
    <Card className="border-[color:var(--color-brand-pink)]/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="size-4 text-[color:var(--color-brand-magenta)]" />
            ذكاء الطلبات — Order Intelligence
            <Badge variant="outline" className="text-[10px] font-normal">
              {totalAccepted}/{totalSuggestions} معتمد
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={generateSuggestions}
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
        {result?.clinicalSummaryAr && !collapsed && (
          <p className="text-xs text-[color:var(--color-muted-foreground)] mt-1" dir="auto">
            {result.clinicalSummaryAr}
          </p>
        )}
        {!result?.clinicalSummaryAr && result?.clinicalSummary && !collapsed && (
          <p className="text-xs text-[color:var(--color-muted-foreground)] mt-1">
            {result.clinicalSummary}
          </p>
        )}
      </CardHeader>

      {!collapsed && result && (
        <CardContent className="space-y-4 pt-2">
          {/* Prescriptions → PharmaX */}
          {result.prescriptions.length > 0 && (
            <div className="space-y-2">
              <h5 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                <Pill className="size-3.5 text-[color:var(--color-brand-magenta)]" />
                الوصفات → PharmaX
                <Badge variant="outline" className="text-[10px] ml-auto">{result.prescriptions.length}</Badge>
              </h5>
              <div className="space-y-2">
                {result.prescriptions.map((rx, i) => (
                  <PrescriptionCard
                    key={i}
                    rx={rx}
                    onAccept={() => handleAcceptRx(i, rx)}
                    accepted={acceptedRx.has(i)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Lab Orders → MediLab */}
          {result.labOrders.length > 0 && (
            <div className="space-y-2">
              <h5 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                <TestTubes className="size-3.5 text-blue-600" />
                التحاليل → MediLab
                <Badge variant="outline" className="text-[10px] ml-auto">{result.labOrders.length}</Badge>
              </h5>
              <div className="space-y-2">
                {result.labOrders.map((lab, i) => (
                  <LabOrderCard
                    key={i}
                    lab={lab}
                    onAccept={() => handleAcceptLab(i, lab)}
                    accepted={acceptedLab.has(i)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Imaging Orders → MediScan */}
          {result.imagingOrders.length > 0 && (
            <div className="space-y-2">
              <h5 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                <ScanLine className="size-3.5 text-purple-600" />
                الأشعة → MediScan
                <Badge variant="outline" className="text-[10px] ml-auto">{result.imagingOrders.length}</Badge>
              </h5>
              <div className="space-y-2">
                {result.imagingOrders.map((img, i) => (
                  <ImagingOrderCard
                    key={i}
                    img={img}
                    onAccept={() => handleAcceptImg(i, img)}
                    accepted={acceptedImg.has(i)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Referrals */}
          {result.referrals.length > 0 && (
            <div className="space-y-2">
              <h5 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                <UserPlus className="size-3.5 text-teal-600" />
                الإحالات
                <Badge variant="outline" className="text-[10px] ml-auto">{result.referrals.length}</Badge>
              </h5>
              <div className="space-y-2">
                {result.referrals.map((ref, i) => (
                  <ReferralCard
                    key={i}
                    ref={ref}
                    onAccept={() => handleAcceptRef(i, ref)}
                    accepted={acceptedRef.has(i)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Follow-ups */}
          {result.followUps.length > 0 && (
            <div className="space-y-2">
              <h5 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                <CalendarClock className="size-3.5 text-indigo-600" />
                مواعيد المتابعة
                <Badge variant="outline" className="text-[10px] ml-auto">{result.followUps.length}</Badge>
              </h5>
              <div className="space-y-2">
                {result.followUps.map((fu, i) => (
                  <FollowUpCard
                    key={i}
                    fu={fu}
                    onAccept={() => handleAcceptFu(i, fu)}
                    accepted={acceptedFu.has(i)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No suggestions */}
          {totalSuggestions === 0 && (
            <p className="text-center text-xs text-[color:var(--color-muted-foreground)] py-4" dir="auto">
              لا توجد طلبات سريرية مقترحة لهذه الزيارة. قد يكون تقرير SOAP مختصراً جداً
              أو لم يتم تحديد إجراءات قابلة للتنفيذ.
            </p>
          )}

          {/* Disclaimer */}
          <p className="flex items-start gap-1.5 text-[10px] text-[color:var(--color-muted-foreground)] border-t pt-2" dir="auto">
            <AlertTriangle className="size-3 shrink-0 mt-0.5" />
            هذه اقتراحات فقط. الطبيب مسؤول عن مراجعة واعتماد جميع الطلبات قبل تنفيذها.
            الحكم السريري يتفوق على جميع الاقتراحات الآلية. متوافق مع معايير وزارة الصحة وهيئة الغذاء والدواء.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
