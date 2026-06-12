"use client";

/**
 * MediSport — Coach Directory (Phase 8, discovery & linking)
 *
 * Shared mirrored component. Trainees browse VERIFIED coaches ranked by score,
 * filter by specialty / search, view a public profile (certs + reviews), and
 * send a connection request (two-sided: coach must accept). Also surfaces the
 * trainee's own outgoing request statuses, and lets a linked trainee leave a
 * review.
 *
 * Data:
 *   GET  /api/sport?action=coach-directory[&specialty=&q=]
 *   GET  /api/sport?action=coach-public-profile&coachId=
 *   GET  /api/sport?action=my-trainee-requests
 *   POST /api/sport { action: "request-coach", coachId, message }
 *   POST /api/sport { action: "coach-review", coachId, stars, comment }
 */

import * as React from "react";
import {
  Search,
  Star,
  ShieldCheck,
  MapPin,
  Users as UsersIcon,
  Award,
  Loader2,
  Send,
  CheckCircle2,
  Clock,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  COACH_SPECIALTIES,
  DEGREE_LEVELS,
  RELEVANT_STUDY_FIELDS,
  CERT_ISSUERS,
  TIER_LABELS,
  type CoachTier,
} from "@/lib/sport/coach-scoring";

interface DirectoryCoach {
  userId: string;
  name: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  specialties: string[] | null;
  city: string | null;
  country: string | null;
  yearsExperience: number | null;
  coachScore: string | null;
  coachTier: CoachTier | null;
  ratingAvg: string | null;
  ratingCount: number | null;
  activeClients: number | null;
}

interface RequestStatus {
  id: string;
  coachId: string;
  coachName: string | null;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

const labelOf = (
  list: { id: string; ar: string; en: string }[],
  id: string | null | undefined,
  isAr: boolean
) => {
  if (!id) return "";
  const f = list.find((x) => x.id === id);
  return f ? (isAr ? f.ar : f.en) : id;
};

export function CoachDirectory({ locale = "ar" }: { locale?: "ar" | "en" }) {
  const isAr = locale === "ar";
  const [coaches, setCoaches] = React.useState<DirectoryCoach[]>([]);
  const [requests, setRequests] = React.useState<RequestStatus[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [specialty, setSpecialty] = React.useState<string>("");
  const [selected, setSelected] = React.useState<DirectoryCoach | null>(null);

  const reqByCoach = React.useMemo(() => {
    const m = new Map<string, RequestStatus>();
    for (const r of requests) m.set(r.coachId, r);
    return m;
  }, [requests]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: "coach-directory" });
      if (specialty) params.set("specialty", specialty);
      if (q.trim()) params.set("q", q.trim());
      const [dirRes, reqRes] = await Promise.all([
        fetch(`/api/sport?${params.toString()}`, { cache: "no-store" }),
        fetch("/api/sport?action=my-trainee-requests", { cache: "no-store" }),
      ]);
      const dir = await dirRes.json();
      if (dir.success) setCoaches(dir.data || []);
      if (reqRes.ok) {
        const rq = await reqRes.json();
        if (rq.success) setRequests(rq.data || []);
      }
    } catch {
      toast.error(isAr ? "تعذّر تحميل المدربين" : "Failed to load coaches");
    } finally {
      setLoading(false);
    }
  }, [specialty, q, isAr]);

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialty]);

  return (
    <div className="space-y-4">
      {/* Search + specialty filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder={isAr ? "ابحث عن مدرب…" : "Search coaches…"}
            className="ps-9"
          />
        </div>
        <Button onClick={load} className="ms-grad-brand text-white">
          {isAr ? "بحث" : "Search"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSpecialty("")}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
            specialty === ""
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
          }`}
        >
          {isAr ? "الكل" : "All"}
        </button>
        {COACH_SPECIALTIES.map((s) => (
          <button
            key={s.id}
            onClick={() => setSpecialty(s.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              specialty === s.id
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
            }`}
          >
            {isAr ? s.ar : s.en}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : coaches.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="p-10 text-center text-slate-500">
            <ShieldCheck className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm">
              {isAr
                ? "لا يوجد مدربون معتمدون مطابقون لبحثك بعد."
                : "No verified coaches match your search yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {coaches.map((c, i) => (
            <CoachCard
              key={c.userId}
              coach={c}
              rank={i + 1}
              isAr={isAr}
              request={reqByCoach.get(c.userId)}
              onOpen={() => setSelected(c)}
            />
          ))}
        </div>
      )}

      {selected && (
        <CoachProfileDialog
          coachId={selected.userId}
          isAr={isAr}
          request={reqByCoach.get(selected.userId)}
          onClose={() => setSelected(null)}
          onRequested={load}
        />
      )}
    </div>
  );
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={
            i <= Math.round(value)
              ? "fill-amber-400 text-amber-400"
              : "text-slate-300"
          }
        />
      ))}
    </span>
  );
}

function CoachCard({
  coach,
  rank,
  isAr,
  request,
  onOpen,
}: {
  coach: DirectoryCoach;
  rank: number;
  isAr: boolean;
  request?: RequestStatus;
  onOpen: () => void;
}) {
  const score = Number(coach.coachScore ?? 0);
  const rating = Number(coach.ratingAvg ?? 0);
  return (
    <Card
      onClick={onOpen}
      className="cursor-pointer border-slate-200 transition hover:border-emerald-300 hover:shadow-md"
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="relative">
            <div className="ms-grad-brand flex h-12 w-12 items-center justify-center rounded-2xl text-base font-bold text-white">
              {(coach.displayName || coach.name || "?").charAt(0)}
            </div>
            {rank <= 3 && (
              <span className="absolute -top-1.5 -end-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-white">
                {rank}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-semibold text-slate-800">
                {coach.displayName || coach.name}
              </p>
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
              <Stars value={rating} />
              {coach.ratingCount ? (
                <span>
                  {rating.toFixed(1)} ({coach.ratingCount})
                </span>
              ) : (
                <span>{isAr ? "جديد" : "New"}</span>
              )}
            </div>
            {coach.specialties && coach.specialties.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {coach.specialties.slice(0, 2).map((s) => (
                  <Badge
                    key={s}
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50/60 text-[10px] text-emerald-700"
                  >
                    {labelOf(COACH_SPECIALTIES, s, isAr)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="text-end">
            <div className="text-lg font-bold text-emerald-600">{score}</div>
            {coach.coachTier && (
              <div className="text-[10px] text-slate-400">
                {isAr
                  ? TIER_LABELS[coach.coachTier]?.ar
                  : TIER_LABELS[coach.coachTier]?.en}
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {coach.city || coach.country || (isAr ? "غير محدد" : "—")}
          </span>
          <span className="flex items-center gap-1">
            <UsersIcon className="h-3.5 w-3.5" />
            {coach.activeClients ?? 0} {isAr ? "متدرب" : "clients"}
          </span>
          {request && (
            <RequestBadge status={request.status} isAr={isAr} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RequestBadge({
  status,
  isAr,
}: {
  status: "pending" | "accepted" | "declined";
  isAr: boolean;
}) {
  if (status === "accepted")
    return (
      <Badge className="bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="me-1 h-3 w-3" />
        {isAr ? "مرتبط" : "Linked"}
      </Badge>
    );
  if (status === "pending")
    return (
      <Badge className="bg-amber-100 text-amber-700">
        <Clock className="me-1 h-3 w-3" />
        {isAr ? "بانتظار الرد" : "Pending"}
      </Badge>
    );
  return (
    <Badge className="bg-slate-100 text-slate-500">
      {isAr ? "غير مقبول" : "Declined"}
    </Badge>
  );
}

interface PublicProfile {
  profile: DirectoryCoach & {
    languages: string[] | null;
    highestDegree: string | null;
    studyField: string | null;
    university: string | null;
  };
  certifications: { name: string; issuer: string | null; verified: boolean }[];
  reviews: {
    stars: number;
    comment: string | null;
    createdAt: string;
    traineeName: string | null;
  }[];
}

function CoachProfileDialog({
  coachId,
  isAr,
  request,
  onClose,
  onRequested,
}: {
  coachId: string;
  isAr: boolean;
  request?: RequestStatus;
  onClose: () => void;
  onRequested: () => void;
}) {
  const [data, setData] = React.useState<PublicProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/sport?action=coach-public-profile&coachId=${encodeURIComponent(coachId)}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (json.success) setData(json.data);
      } finally {
        setLoading(false);
      }
    })();
  }, [coachId]);

  const sendRequest = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/sport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request-coach",
          coachId,
          message: message.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(isAr ? "تم إرسال طلب التدريب" : "Request sent");
        onRequested();
        onClose();
      } else {
        toast.error(
          json.error === "coach_not_verified"
            ? isAr
              ? "هذا المدرب غير معتمد"
              : "Coach not verified"
            : isAr
              ? "تعذّر إرسال الطلب"
              : "Failed to send request"
        );
      }
    } catch {
      toast.error(isAr ? "خطأ في الاتصال" : "Network error");
    } finally {
      setSending(false);
    }
  };

  const p = data?.profile;
  const rating = Number(p?.ratingAvg ?? 0);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="medisport-scope max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            {isAr ? "ملف المدرب" : "Coach profile"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !p ? (
          <p className="py-8 text-center text-slate-500">
            {isAr ? "تعذّر عرض الملف" : "Profile unavailable"}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="ms-grad-brand flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white">
                {(p.displayName || p.name || "?").charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-slate-800">
                  {p.displayName || p.name}
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Stars value={rating} />
                  <span>
                    {p.ratingCount
                      ? `${rating.toFixed(1)} (${p.ratingCount})`
                      : isAr
                        ? "مدرب جديد"
                        : "New coach"}
                  </span>
                </div>
              </div>
              <div className="text-end">
                <div className="text-2xl font-bold text-emerald-600">
                  {Number(p.coachScore ?? 0)}
                  <span className="text-xs text-slate-400">/100</span>
                </div>
                {p.coachTier && (
                  <div className="text-[11px] text-slate-500">
                    {isAr
                      ? TIER_LABELS[p.coachTier]?.ar
                      : TIER_LABELS[p.coachTier]?.en}
                  </div>
                )}
              </div>
            </div>

            {p.bio && <p className="text-sm text-slate-600">{p.bio}</p>}

            <div className="grid grid-cols-2 gap-3 text-sm">
              {p.highestDegree && (
                <Info
                  icon={<GraduationCap className="h-4 w-4 text-emerald-500" />}
                  label={isAr ? "المؤهل" : "Degree"}
                  value={`${labelOf(DEGREE_LEVELS, p.highestDegree, isAr)}${
                    p.studyField
                      ? " — " + labelOf(RELEVANT_STUDY_FIELDS, p.studyField, isAr)
                      : ""
                  }`}
                />
              )}
              {p.yearsExperience != null && (
                <Info
                  icon={<Clock className="h-4 w-4 text-emerald-500" />}
                  label={isAr ? "الخبرة" : "Experience"}
                  value={`${p.yearsExperience} ${isAr ? "سنة" : "yrs"}`}
                />
              )}
              {(p.city || p.country) && (
                <Info
                  icon={<MapPin className="h-4 w-4 text-emerald-500" />}
                  label={isAr ? "الموقع" : "Location"}
                  value={[p.city, p.country].filter(Boolean).join("، ")}
                />
              )}
              <Info
                icon={<UsersIcon className="h-4 w-4 text-emerald-500" />}
                label={isAr ? "المتدربون" : "Clients"}
                value={String(p.activeClients ?? 0)}
              />
            </div>

            {p.specialties && p.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {p.specialties.map((s) => (
                  <Badge
                    key={s}
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50/60 text-xs text-emerald-700"
                  >
                    {labelOf(COACH_SPECIALTIES, s, isAr)}
                  </Badge>
                ))}
              </div>
            )}

            {data!.certifications.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-500">
                  {isAr ? "الشهادات" : "Certifications"}
                </p>
                <div className="space-y-1.5">
                  {data!.certifications.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm"
                    >
                      <Award className="h-4 w-4 text-emerald-500" />
                      <span className="font-medium text-slate-700">{c.name}</span>
                      {c.issuer && (
                        <span className="text-xs text-slate-400">
                          {labelOf(CERT_ISSUERS, c.issuer, isAr)}
                        </span>
                      )}
                      {c.verified && (
                        <CheckCircle2 className="ms-auto h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data!.reviews.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-500">
                  {isAr ? "آراء المتدربين" : "Trainee reviews"}
                </p>
                <div className="space-y-2">
                  {data!.reviews.map((r, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-slate-50 p-2.5 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-700">
                          {r.traineeName || (isAr ? "متدرب" : "Trainee")}
                        </span>
                        <Stars value={r.stars} size={12} />
                      </div>
                      {r.comment && (
                        <p className="mt-1 text-slate-600">{r.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Request action */}
            {request?.status === "accepted" ? (
              <div className="rounded-lg bg-emerald-50 p-3 text-center text-sm font-medium text-emerald-700">
                <CheckCircle2 className="me-1 inline h-4 w-4" />
                {isAr ? "أنت مرتبط بهذا المدرب" : "You're linked with this coach"}
              </div>
            ) : request?.status === "pending" ? (
              <div className="rounded-lg bg-amber-50 p-3 text-center text-sm font-medium text-amber-700">
                <Clock className="me-1 inline h-4 w-4" />
                {isAr ? "طلبك قيد المراجعة لدى المدرب" : "Your request is pending"}
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  placeholder={
                    isAr
                      ? "رسالة تعريفية للمدرب (اختياري)…"
                      : "Intro message to the coach (optional)…"
                  }
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-emerald-400 focus:outline-none"
                />
                <Button
                  onClick={sendRequest}
                  disabled={sending}
                  className="ms-grad-brand w-full gap-2 text-white"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {isAr ? "إرسال طلب تدريب" : "Request coaching"}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({
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
