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
  ExternalLink,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SoapNoteInput } from "@/lib/validations/encounter";

// ─────────────────────────────────────────────────────────────────
//  Types (mirror the server-side types)
// ─────────────────────────────────────────────────────────────────

interface SuggestedPrescription {
  drugName: string;
  dose: string;
  frequency: string;
  route: string;
  duration: string;
  instructions: string;
  rationale: string;
  priority: "routine" | "urgent" | "stat";
}

interface SuggestedLabOrder {
  panelName: string;
  loincCode?: string;
  rationale: string;
  priority: "routine" | "urgent" | "stat";
  fasting?: boolean;
}

interface SuggestedImagingOrder {
  scanType: string;
  bodyPart: string;
  modality: string;
  rationale: string;
  priority: "routine" | "urgent" | "stat";
  contrastRequired?: boolean;
}

interface SuggestedReferral {
  specialty: string;
  reason: string;
  urgency: "routine" | "urgent" | "emergent";
  clinicalQuestion: string;
}

interface SuggestedFollowUp {
  timeframe: string;
  reason: string;
  instructions: string;
  appointmentType: "in_person" | "telemedicine" | "phone";
}

interface OrderAutomationResult {
  prescriptions: SuggestedPrescription[];
  labOrders: SuggestedLabOrder[];
  imagingOrders: SuggestedImagingOrder[];
  referrals: SuggestedReferral[];
  followUps: SuggestedFollowUp[];
  clinicalSummary: string;
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
  return (
    <Badge variant="outline" className={cn("text-[10px] uppercase font-semibold", colors[priority] || colors.routine)}>
      {priority}
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
            <PriorityBadge priority={rx.priority} />
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
              <><CheckCircle2 className="size-3 mr-1" /> Sent</>
            ) : (
              <><Plus className="size-3 mr-1" /> PharmaX</>
            )}
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="mt-2 pt-2 border-t border-dashed text-xs space-y-1">
          {rx.instructions && (
            <p><span className="font-medium">Instructions:</span> {rx.instructions}</p>
          )}
          <p className="text-[color:var(--color-muted-foreground)]">
            <span className="font-medium">Rationale:</span> {rx.rationale}
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
            <PriorityBadge priority={lab.priority} />
            {lab.fasting && (
              <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                Fasting
              </Badge>
            )}
          </div>
          <p className="text-xs text-[color:var(--color-muted-foreground)] mt-0.5">
            {lab.rationale}
          </p>
          {lab.loincCode && (
            <p className="text-[10px] font-mono text-[color:var(--color-muted-foreground)] mt-0.5">
              LOINC: {lab.loincCode}
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
            <><CheckCircle2 className="size-3 mr-1" /> Sent</>
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
            <Badge variant="outline" className="text-[10px]">{img.modality}</Badge>
            <PriorityBadge priority={img.priority} />
            {img.contrastRequired && (
              <Badge variant="outline" className="text-[10px] bg-yellow-50 text-yellow-700 border-yellow-200">
                + Contrast
              </Badge>
            )}
          </div>
          <p className="text-xs text-[color:var(--color-muted-foreground)] mt-0.5">
            {img.bodyPart} — {img.rationale}
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
            <><CheckCircle2 className="size-3 mr-1" /> Sent</>
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
            <PriorityBadge priority={referral.urgency} />
          </div>
          <p className="text-xs text-[color:var(--color-muted-foreground)] mt-0.5">
            {referral.reason}
          </p>
          <p className="text-[11px] text-[color:var(--color-muted-foreground)] mt-1 italic">
            Clinical question: {referral.clinicalQuestion}
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
            <><CheckCircle2 className="size-3 mr-1" /> Created</>
          ) : (
            <><Plus className="size-3 mr-1" /> Refer</>
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
    in_person: "In-Person",
    telemedicine: "Telemedicine",
    phone: "Phone",
  };

  return (
    <div className={cn(
      "rounded-lg border p-3 transition-all",
      accepted ? "border-emerald-300 bg-emerald-50/50" : "border-[color:var(--color-border)] hover:border-indigo-300/60"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{fu.timeframe}</span>
            <Badge variant="outline" className="text-[10px]">
              {typeLabels[fu.appointmentType] || fu.appointmentType}
            </Badge>
          </div>
          <p className="text-xs text-[color:var(--color-muted-foreground)] mt-0.5">
            {fu.reason}
          </p>
          {fu.instructions && (
            <p className="text-[11px] text-[color:var(--color-muted-foreground)] mt-1">
              Instructions: {fu.instructions}
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
            <><CheckCircle2 className="size-3 mr-1" /> Scheduled</>
          ) : (
            <><Plus className="size-3 mr-1" /> Schedule</>
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
      setError(err instanceof Error ? err.message : "Failed to generate suggestions");
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
            <h4 className="font-semibold text-sm">Order Intelligence</h4>
            <p className="text-xs text-[color:var(--color-muted-foreground)] max-w-sm">
              Analyze this SOAP note to get intelligent suggestions for prescriptions,
              lab orders, imaging, referrals, and follow-up appointments.
            </p>
          </div>
          <Button
            variant="brand"
            size="md"
            onClick={generateSuggestions}
            disabled={loading}
          >
            <Sparkles className="size-4 mr-1.5" />
            Generate Order Suggestions
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
            <h4 className="font-semibold text-sm">Analyzing SOAP Note</h4>
            <p className="text-xs text-[color:var(--color-muted-foreground)]">
              Generating clinical order suggestions based on documented findings...
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
            Order Intelligence
            <Badge variant="outline" className="text-[10px] font-normal">
              {totalAccepted}/{totalSuggestions} accepted
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
        {result?.clinicalSummary && !collapsed && (
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
                Prescriptions → PharmaX
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
                Lab Orders → MediLab
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
                Imaging Orders → MediScan
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
                Referrals
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
                Follow-up Appointments
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
            <p className="text-center text-xs text-[color:var(--color-muted-foreground)] py-4">
              No clinical orders suggested for this encounter. The SOAP note may be
              too brief or no actionable items were identified.
            </p>
          )}

          {/* Disclaimer */}
          <p className="flex items-start gap-1.5 text-[10px] text-[color:var(--color-muted-foreground)] border-t pt-2">
            <AlertTriangle className="size-3 shrink-0 mt-0.5" />
            These are suggestions only. The physician must review and approve all orders
            before they are executed. Clinical judgment supersedes all automated suggestions.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
