"use client";

/**
 * MediSport — Admin Coach Verification Console (Phase 8)
 *
 * Shared mirrored component used by the admin route to review, score, and
 * decide on coach verification requests. Pulls the queue from
 * GET /api/sport?action=admin-verification-queue and posts decisions to
 * POST /api/sport (action=admin-verify-decision).
 *
 * Renders nothing meaningful for non-admins (the API also enforces 403).
 */

import * as React from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  FileText,
  IdCard,
  GraduationCap,
  Award,
  Clock,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  CERT_ISSUERS,
  DEGREE_LEVELS,
  RELEVANT_STUDY_FIELDS,
  COACH_SPECIALTIES,
  TIER_LABELS,
  type CoachScoreBreakdown,
  type CoachTier,
} from "@/lib/sport/coach-scoring";

type VerificationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "needs_more_info"
  | "verified"
  | "rejected";

interface Cert {
  id: string;
  name: string;
  issuer: string | null;
  credentialNo: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  fileUrl: string | null;
  verified: boolean;
}

interface QueueRow {
  userId: string;
  name: string | null;
  email: string | null;
  verificationStatus: VerificationStatus;
  coachScore: string | null;
  coachTier: CoachTier | null;
  scoreBreakdown: CoachScoreBreakdown | null;
  adminScore: number | null;
  highestDegree: string | null;
  studyField: string | null;
  university: string | null;
  graduationYear: number | null;
  yearsExperience: number | null;
  specialties: string[] | null;
  bio: string | null;
  cvUrl: string | null;
  idDocUrl: string | null;
  professionalLinks: string[] | null;
  submittedAt: string | null;
  certifications: Cert[];
}

const STATUS_META: Record<
  string,
  { ar: string; en: string; cls: string }
> = {
  submitted: { ar: "بانتظار المراجعة", en: "Submitted", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  under_review: { ar: "قيد المراجعة", en: "Under review", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  needs_more_info: { ar: "بانتظار معلومات", en: "Needs info", cls: "bg-purple-100 text-purple-700 border-purple-200" },
  verified: { ar: "معتمَد", en: "Verified", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  rejected: { ar: "مرفوض", en: "Rejected", cls: "bg-rose-100 text-rose-700 border-rose-200" },
};

const labelOf = (
  list: { id: string; ar: string; en: string }[],
  id: string | null | undefined,
  isAr: boolean
) => {
  if (!id) return "—";
  const f = list.find((x) => x.id === id);
  return f ? (isAr ? f.ar : f.en) : id;
};

export function AdminCoachVerification({
  locale = "ar",
}: {
  locale?: "ar" | "en";
}) {
  const isAr = locale === "ar";
  const [rows, setRows] = React.useState<QueueRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [forbidden, setForbidden] = React.useState(false);
  const [filter, setFilter] = React.useState<string>("pending");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const qs =
        filter === "pending" ? "" : `&status=${encodeURIComponent(filter)}`;
      const res = await fetch(
        `/api/sport?action=admin-verification-queue${qs}`,
        { cache: "no-store" }
      );
      if (res.status === 403) {
        setForbidden(true);
        setRows([]);
        return;
      }
      const json = await res.json();
      if (json.success) setRows(json.data || []);
    } catch {
      toast.error(isAr ? "تعذّر تحميل الطلبات" : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [filter, isAr]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (forbidden) {
    return (
      <Card className="border-rose-200 bg-rose-50/40">
        <CardContent className="p-6 text-center">
          <ShieldX className="mx-auto h-10 w-10 text-rose-500" />
          <p className="mt-3 font-semibold text-rose-700">
            {isAr ? "هذه الصفحة للمشرفين فقط" : "Admins only"}
          </p>
          <p className="mt-1 text-sm text-rose-600/80">
            {isAr
              ? "لا تملك صلاحية الوصول إلى لوحة اعتماد المدربين."
              : "You don't have access to the coach verification console."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: "pending", ar: "بانتظار القرار", en: "Pending" },
          { id: "submitted", ar: "مُرسَلة", en: "Submitted" },
          { id: "under_review", ar: "قيد المراجعة", en: "Under review" },
          { id: "needs_more_info", ar: "بانتظار معلومات", en: "Needs info" },
          { id: "verified", ar: "معتمَدون", en: "Verified" },
          { id: "rejected", ar: "مرفوضون", en: "Rejected" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              filter === f.id
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
            }`}
          >
            {isAr ? f.ar : f.en}
          </button>
        ))}
        <Button
          size="sm"
          variant="ghost"
          onClick={load}
          className="ms-auto gap-1.5 text-slate-500"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {isAr ? "تحديث" : "Refresh"}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="p-10 text-center text-slate-500">
            <ShieldCheck className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm">
              {isAr ? "لا توجد طلبات في هذه القائمة." : "No requests in this list."}
            </p>
          </CardContent>
        </Card>
      ) : (
        rows.map((row) => (
          <CoachReviewCard key={row.userId} row={row} isAr={isAr} onDone={load} />
        ))
      )}
    </div>
  );
}

function CoachReviewCard({
  row,
  isAr,
  onDone,
}: {
  row: QueueRow;
  isAr: boolean;
  onDone: () => void;
}) {
  const [adminScore, setAdminScore] = React.useState<number>(
    row.adminScore ?? 0
  );
  const [note, setNote] = React.useState("");
  const [verifiedCertIds, setVerifiedCertIds] = React.useState<Set<string>>(
    new Set(row.certifications.filter((c) => c.verified).map((c) => c.id))
  );
  const [busy, setBusy] = React.useState<string | null>(null);

  const bd = row.scoreBreakdown;
  const statusMeta = STATUS_META[row.verificationStatus] || STATUS_META.submitted;

  const toggleCert = (id: string) => {
    setVerifiedCertIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const decide = async (decision: "approve" | "reject" | "request_info") => {
    if ((decision === "reject" || decision === "request_info") && !note.trim()) {
      toast.error(
        isAr
          ? "اكتب سببًا/ملاحظة قبل الرفض أو طلب المعلومات"
          : "Add a note before rejecting or requesting info"
      );
      return;
    }
    setBusy(decision);
    try {
      const res = await fetch("/api/sport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin-verify-decision",
          coachId: row.userId,
          decision,
          adminScore,
          note: note.trim() || null,
          verifiedCertIds: Array.from(verifiedCertIds),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          decision === "approve"
            ? isAr
              ? "تم اعتماد المدرب"
              : "Coach approved"
            : decision === "reject"
              ? isAr
                ? "تم رفض الطلب"
                : "Request rejected"
              : isAr
                ? "تم طلب معلومات إضافية"
                : "Info requested"
        );
        onDone();
      } else {
        toast.error(json.error || (isAr ? "تعذّر تنفيذ القرار" : "Action failed"));
      }
    } catch {
      toast.error(isAr ? "خطأ في الاتصال" : "Network error");
    } finally {
      setBusy(null);
    }
  };

  const liveTotal =
    bd != null
      ? Math.round(
          (bd.academic +
            bd.certifications +
            bd.experience +
            bd.completeness +
            Math.max(0, Math.min(15, adminScore)) +
            bd.performance) *
            10
        ) / 10
      : Number(row.coachScore ?? 0);

  return (
    <Card className="overflow-hidden border-slate-200">
      <CardHeader className="bg-slate-50/70 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base text-slate-800">
              {row.name || (isAr ? "مدرب" : "Coach")}
            </CardTitle>
            <p className="text-xs text-slate-500">{row.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={statusMeta.cls}>
              {isAr ? statusMeta.ar : statusMeta.en}
            </Badge>
            <div className="text-end">
              <div className="text-lg font-bold text-emerald-600">
                {liveTotal}
                <span className="text-xs text-slate-400">/100</span>
              </div>
              {row.coachTier && (
                <div className="text-[10px] text-slate-500">
                  {isAr
                    ? TIER_LABELS[row.coachTier]?.ar
                    : TIER_LABELS[row.coachTier]?.en}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        {/* Profile facts */}
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Fact
            icon={<GraduationCap className="h-4 w-4 text-emerald-500" />}
            label={isAr ? "المؤهل العلمي" : "Degree"}
            value={`${labelOf(DEGREE_LEVELS, row.highestDegree, isAr)}${
              row.studyField
                ? " — " + labelOf(RELEVANT_STUDY_FIELDS, row.studyField, isAr)
                : ""
            }`}
          />
          <Fact
            icon={<Clock className="h-4 w-4 text-emerald-500" />}
            label={isAr ? "سنوات الخبرة" : "Experience"}
            value={
              row.yearsExperience != null
                ? `${row.yearsExperience} ${isAr ? "سنة" : "yrs"}`
                : "—"
            }
          />
          <Fact
            icon={<GraduationCap className="h-4 w-4 text-emerald-500" />}
            label={isAr ? "الجامعة / سنة التخرّج" : "University / Grad year"}
            value={`${row.university || "—"}${
              row.graduationYear ? " — " + row.graduationYear : ""
            }`}
          />
          <Fact
            icon={<Award className="h-4 w-4 text-emerald-500" />}
            label={isAr ? "التخصصات" : "Specialties"}
            value={
              row.specialties && row.specialties.length
                ? row.specialties
                    .map((s) => labelOf(COACH_SPECIALTIES, s, isAr))
                    .join("، ")
                : "—"
            }
          />
        </div>

        {row.bio && (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            {row.bio}
          </p>
        )}

        {/* Documents */}
        <div className="flex flex-wrap gap-2">
          {row.cvUrl && (
            <DocLink href={row.cvUrl} icon={<FileText className="h-3.5 w-3.5" />}>
              {isAr ? "السيرة الذاتية" : "CV / Résumé"}
            </DocLink>
          )}
          {row.idDocUrl && (
            <DocLink href={row.idDocUrl} icon={<IdCard className="h-3.5 w-3.5" />}>
              {isAr ? "وثيقة الهوية" : "ID document"}
            </DocLink>
          )}
          {(row.professionalLinks || []).map((l, i) => (
            <DocLink key={i} href={l} icon={<ExternalLink className="h-3.5 w-3.5" />}>
              {isAr ? `رابط ${i + 1}` : `Link ${i + 1}`}
            </DocLink>
          ))}
        </div>

        {/* Certifications with verify toggles */}
        {row.certifications.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500">
              {isAr ? "الشهادات (علّم الموثّقة)" : "Certifications (mark verified)"}
            </p>
            {row.certifications.map((c) => {
              const issuerMeta = CERT_ISSUERS.find((x) => x.id === c.issuer);
              const recognized = issuerMeta?.recognized;
              const checked = verifiedCertIds.has(c.id);
              return (
                <label
                  key={c.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 text-sm transition ${
                    checked
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-slate-200 bg-white hover:border-emerald-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCert(c.id)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <Award
                    className={`h-4 w-4 ${
                      recognized ? "text-emerald-500" : "text-slate-400"
                    }`}
                  />
                  <div className="flex-1">
                    <span className="font-medium text-slate-700">{c.name}</span>
                    {c.issuer && (
                      <span className="ms-2 text-xs text-slate-500">
                        {labelOf(CERT_ISSUERS, c.issuer, isAr)}
                      </span>
                    )}
                    {!recognized && (
                      <Badge
                        variant="outline"
                        className="ms-2 border-amber-200 bg-amber-50 text-[10px] text-amber-600"
                      >
                        {isAr ? "غير معتمدة آليًا" : "Not auto-recognized"}
                      </Badge>
                    )}
                  </div>
                  {c.fileUrl && (
                    <a
                      href={c.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-emerald-600 hover:text-emerald-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </label>
              );
            })}
          </div>
        )}

        {/* Score breakdown */}
        {bd && (
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center text-xs sm:grid-cols-6">
            <ScorePill label={isAr ? "علمي" : "Academic"} v={bd.academic} max={20} />
            <ScorePill label={isAr ? "شهادات" : "Certs"} v={bd.certifications} max={25} />
            <ScorePill label={isAr ? "خبرة" : "Exp."} v={bd.experience} max={15} />
            <ScorePill label={isAr ? "اكتمال" : "Profile"} v={bd.completeness} max={10} />
            <ScorePill label={isAr ? "تقديري" : "Admin"} v={Math.max(0, Math.min(15, adminScore))} max={15} />
            <ScorePill label={isAr ? "أداء" : "Perf."} v={bd.performance} max={15} />
          </div>
        )}

        {/* Admin discretionary score */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
            <Star className="h-4 w-4 text-amber-500" />
            {isAr ? "النقاط التقديرية (0–15)" : "Discretionary (0–15)"}
          </label>
          <Input
            type="number"
            min={0}
            max={15}
            value={adminScore}
            onChange={(e) =>
              setAdminScore(Math.max(0, Math.min(15, Number(e.target.value) || 0)))
            }
            className="w-24"
          />
          <span className="text-xs text-slate-400">
            {isAr
              ? "تُضاف فورًا إلى التقييم الكلي"
              : "Applied to the total immediately"}
          </span>
        </div>

        {/* Note */}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder={
            isAr
              ? "ملاحظة للمدرب (إلزامية عند الرفض أو طلب المعلومات)…"
              : "Note to coach (required when rejecting / requesting info)…"
          }
          className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-emerald-400 focus:outline-none"
        />

        {/* Decision buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => decide("approve")}
            disabled={!!busy}
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {busy === "approve" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {isAr ? "اعتماد" : "Approve"}
          </Button>
          <Button
            onClick={() => decide("request_info")}
            disabled={!!busy}
            variant="outline"
            className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            {busy === "request_info" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <HelpCircle className="h-4 w-4" />
            )}
            {isAr ? "طلب معلومات" : "Request info"}
          </Button>
          <Button
            onClick={() => decide("reject")}
            disabled={!!busy}
            variant="outline"
            className="gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50"
          >
            {busy === "reject" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {isAr ? "رفض" : "Reject"}
          </Button>
          {row.submittedAt && (
            <span className="ms-auto self-center text-[11px] text-slate-400">
              <ShieldAlert className="me-1 inline h-3 w-3" />
              {isAr ? "أُرسل: " : "Submitted: "}
              {new Date(row.submittedAt).toLocaleDateString(
                isAr ? "ar-EG" : "en-US"
              )}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5">{icon}</span>
      <div>
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="font-medium text-slate-700">{value}</p>
      </div>
    </div>
  );
}

function DocLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
    >
      {icon}
      {children}
    </a>
  );
}

function ScorePill({
  label,
  v,
  max,
}: {
  label: string;
  v: number;
  max: number;
}) {
  return (
    <div>
      <div className="font-bold text-slate-700">
        {v}
        <span className="text-[10px] font-normal text-slate-400">/{max}</span>
      </div>
      <div className="text-[10px] text-slate-400">{label}</div>
    </div>
  );
}
