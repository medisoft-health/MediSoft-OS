"use client";

/**
 * CoachVerificationForm — shared mirrored component (Phase 8)
 *
 * Single source of truth for the coach verification experience, reused by BOTH
 * the standalone (sport) route group and the integrated /medisport module.
 *
 * Talks to /api/sport:
 *   GET  my-coach-profile            -> { profile, certifications }
 *   POST coach-profile-save          -> recompute score
 *   POST coach-cert-add / remove
 *   POST coach-submit-verification
 *   POST /api/sport/upload (multipart) -> { url } for CV / cert files / ID
 *
 * Bilingual (Classical Arabic + English), RTL-aware. Uses an internal
 * dictionary to avoid adding new i18n namespaces.
 */

import * as React from "react";
import { useLocale } from "next-intl";
import {
  GraduationCap,
  Award,
  Upload,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  FileText,
  Loader2,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DEGREE_LEVELS,
  RELEVANT_STUDY_FIELDS,
  CERT_ISSUERS,
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

interface CoachProfile {
  userId: string;
  displayName: string | null;
  bio: string | null;
  highestDegree: string | null;
  studyField: string | null;
  university: string | null;
  graduationYear: number | null;
  yearsExperience: number | null;
  specialties: string[] | null;
  languages: string[] | null;
  city: string | null;
  country: string | null;
  cvUrl: string | null;
  idDocUrl: string | null;
  avatarUrl: string | null;
  professionalLinks: string[] | null;
  verificationStatus: VerificationStatus;
  coachScore: string | null;
  coachTier: CoachTier | null;
  scoreBreakdown: CoachScoreBreakdown | null;
  adminNote: string | null;
  rejectionReason: string | null;
}

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

const LANG_OPTIONS = [
  { id: "ar", ar: "العربية", en: "Arabic" },
  { id: "en", ar: "الإنجليزية", en: "English" },
  { id: "fr", ar: "الفرنسية", en: "French" },
  { id: "other", ar: "أخرى", en: "Other" },
];

export function CoachVerificationForm() {
  const locale = useLocale() as "ar" | "en";
  const isAr = locale === "ar";
  const T = React.useMemo(() => makeDict(isAr), [isAr]);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [profile, setProfile] = React.useState<CoachProfile | null>(null);
  const [certs, setCerts] = React.useState<Cert[]>([]);

  // form state
  const [displayName, setDisplayName] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [highestDegree, setHighestDegree] = React.useState("");
  const [studyField, setStudyField] = React.useState("");
  const [university, setUniversity] = React.useState("");
  const [graduationYear, setGraduationYear] = React.useState("");
  const [yearsExperience, setYearsExperience] = React.useState("");
  const [city, setCity] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [specialties, setSpecialties] = React.useState<string[]>([]);
  const [languages, setLanguages] = React.useState<string[]>([]);
  const [cvUrl, setCvUrl] = React.useState<string | null>(null);
  const [idDocUrl, setIdDocUrl] = React.useState<string | null>(null);
  const [links, setLinks] = React.useState("");

  // new cert form
  const [certName, setCertName] = React.useState("");
  const [certIssuer, setCertIssuer] = React.useState("");
  const [certNo, setCertNo] = React.useState("");
  const [certExpiry, setCertExpiry] = React.useState("");
  const [certFileUrl, setCertFileUrl] = React.useState<string | null>(null);
  const [addingCert, setAddingCert] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sport?action=my-coach-profile");
      const json = await res.json();
      if (json.success) {
        const p: CoachProfile | null = json.data.profile;
        setProfile(p);
        setCerts(json.data.certifications || []);
        if (p) {
          setDisplayName(p.displayName || "");
          setBio(p.bio || "");
          setHighestDegree(p.highestDegree || "");
          setStudyField(p.studyField || "");
          setUniversity(p.university || "");
          setGraduationYear(p.graduationYear ? String(p.graduationYear) : "");
          setYearsExperience(p.yearsExperience != null ? String(p.yearsExperience) : "");
          setCity(p.city || "");
          setCountry(p.country || "");
          setSpecialties(p.specialties || []);
          setLanguages(p.languages || []);
          setCvUrl(p.cvUrl);
          setIdDocUrl(p.idDocUrl);
          setLinks((p.professionalLinks || []).join("\n"));
        }
      }
    } catch {
      toast.error(T.loadError);
    } finally {
      setLoading(false);
    }
  }, [T.loadError]);

  React.useEffect(() => {
    load();
  }, [load]);

  function toggle(list: string[], id: string, setter: (v: string[]) => void) {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function uploadFile(file: File, kind: "cv" | "cert" | "id" | "avatar"): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    const res = await fetch("/api/sport/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!json.success) {
      toast.error(json.error === "too_large" ? T.fileTooLarge : T.uploadError);
      return null;
    }
    return json.data.url as string;
  }

  function buildProfilePayload() {
    return {
      displayName: displayName.trim() || null,
      bio: bio.trim() || null,
      highestDegree: highestDegree || null,
      studyField: studyField || null,
      university: university.trim() || null,
      graduationYear: graduationYear ? Number(graduationYear) : null,
      yearsExperience: yearsExperience ? Number(yearsExperience) : null,
      specialties,
      languages,
      city: city.trim() || null,
      country: country.trim() || null,
      cvUrl,
      idDocUrl,
      professionalLinks: links
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    };
  }

  async function saveProfile(silent = false) {
    setSaving(true);
    try {
      const res = await fetch("/api/sport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "coach-profile-save", profile: buildProfilePayload() }),
      });
      const json = await res.json();
      if (json.success) {
        if (!silent) toast.success(T.saved);
        await load();
        return true;
      }
      toast.error(T.saveError);
      return false;
    } catch {
      toast.error(T.saveError);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function addCert() {
    if (!certName.trim()) {
      toast.error(T.certNameRequired);
      return;
    }
    setAddingCert(true);
    try {
      const res = await fetch("/api/sport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "coach-cert-add",
          certification: {
            name: certName.trim(),
            issuer: certIssuer || null,
            credentialNo: certNo.trim() || null,
            expiryDate: certExpiry || null,
            fileUrl: certFileUrl,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(T.certAdded);
        setCertName("");
        setCertIssuer("");
        setCertNo("");
        setCertExpiry("");
        setCertFileUrl(null);
        await load();
      } else {
        toast.error(T.saveError);
      }
    } finally {
      setAddingCert(false);
    }
  }

  async function removeCert(id: string) {
    const res = await fetch("/api/sport", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "coach-cert-remove", id }),
    });
    const json = await res.json();
    if (json.success) {
      setCerts((prev) => prev.filter((c) => c.id !== id));
      toast.success(T.certRemoved);
    }
  }

  async function submitVerification() {
    setSubmitting(true);
    try {
      const ok = await saveProfile(true);
      if (!ok) return;
      const res = await fetch("/api/sport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "coach-submit-verification" }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(T.submitted);
        await load();
      } else if (json.error === "insufficient") {
        toast.error(T.insufficient);
      } else if (json.error === "already_verified") {
        toast.info(T.alreadyVerified);
      } else {
        toast.error(T.saveError);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const status: VerificationStatus = profile?.verificationStatus || "draft";
  const score = profile?.coachScore ? Number(profile.coachScore) : 0;
  const tier = profile?.coachTier || "unranked";
  const bd = profile?.scoreBreakdown;
  const locked = status === "submitted" || status === "under_review" || status === "verified";

  return (
    <div className="space-y-6">
      <StatusCard
        T={T}
        status={status}
        score={score}
        tier={tier}
        breakdown={bd}
        adminNote={profile?.rejectionReason || profile?.adminNote || null}
        isAr={isAr}
      />

      {/* Identity & bio */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            {T.profileSection}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label={T.displayName}>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={locked} placeholder={T.displayNamePh} />
          </Field>
          <Field label={`${T.bio} (${bio.length})`}>
            <textarea
              className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
              rows={3}
              value={bio}
              maxLength={600}
              disabled={locked}
              onChange={(e) => setBio(e.target.value)}
              placeholder={T.bioPh}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={T.city}>
              <Input value={city} onChange={(e) => setCity(e.target.value)} disabled={locked} />
            </Field>
            <Field label={T.country}>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} disabled={locked} />
            </Field>
          </div>
          <Field label={T.languages}>
            <div className="flex flex-wrap gap-2">
              {LANG_OPTIONS.map((l) => (
                <Chip key={l.id} active={languages.includes(l.id)} disabled={locked} onClick={() => toggle(languages, l.id, setLanguages)}>
                  {isAr ? l.ar : l.en}
                </Chip>
              ))}
            </div>
          </Field>
        </CardContent>
      </Card>

      {/* Academic */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-5 w-5 text-emerald-600" />
            {T.academicSection} <span className="text-xs font-normal text-slate-400">/20</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={T.degree}>
              <Select value={highestDegree} onChange={setHighestDegree} disabled={locked} options={DEGREE_LEVELS.map((d) => ({ value: d.id, label: isAr ? d.ar : d.en }))} placeholder={T.choose} />
            </Field>
            <Field label={T.studyField}>
              <Select value={studyField} onChange={setStudyField} disabled={locked} options={RELEVANT_STUDY_FIELDS.map((d) => ({ value: d.id, label: isAr ? d.ar : d.en }))} placeholder={T.choose} />
            </Field>
            <Field label={T.university}>
              <Input value={university} onChange={(e) => setUniversity(e.target.value)} disabled={locked} />
            </Field>
            <Field label={T.gradYear}>
              <Input type="number" value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} disabled={locked} placeholder="2018" />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Experience & specialties */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-5 w-5 text-emerald-600" />
            {T.experienceSection} <span className="text-xs font-normal text-slate-400">/15</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label={T.yearsExperience}>
            <Input type="number" min={0} max={60} value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} disabled={locked} placeholder="5" />
          </Field>
          <Field label={T.specialties}>
            <div className="flex flex-wrap gap-2">
              {COACH_SPECIALTIES.map((s) => (
                <Chip key={s.id} active={specialties.includes(s.id)} disabled={locked} onClick={() => toggle(specialties, s.id, setSpecialties)}>
                  {isAr ? s.ar : s.en}
                </Chip>
              ))}
            </div>
          </Field>
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-5 w-5 text-emerald-600" />
            {T.certsSection} <span className="text-xs font-normal text-slate-400">/25</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {certs.length > 0 && (
            <ul className="space-y-2">
              {certs.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Award className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium">{c.name}</span>
                    {c.issuer && <Badge variant="secondary">{certIssuerLabel(c.issuer, isAr)}</Badge>}
                    {c.verified && (
                      <Badge className="bg-emerald-600">
                        <CheckCircle2 className="me-1 h-3 w-3" /> {T.verified}
                      </Badge>
                    )}
                    {c.fileUrl && (
                      <a href={c.fileUrl} target="_blank" rel="noreferrer" className="text-emerald-600 underline">
                        <FileText className="inline h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  {!locked && (
                    <button onClick={() => removeCert(c.id)} className="text-slate-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {!locked && (
            <div className="space-y-3 rounded-md border border-dashed border-slate-300 p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={T.certName}>
                  <Input value={certName} onChange={(e) => setCertName(e.target.value)} placeholder={T.certNamePh} />
                </Field>
                <Field label={T.issuer}>
                  <Select value={certIssuer} onChange={setCertIssuer} options={CERT_ISSUERS.map((i) => ({ value: i.id, label: isAr ? i.ar : i.en }))} placeholder={T.choose} />
                </Field>
                <Field label={T.credentialNo}>
                  <Input value={certNo} onChange={(e) => setCertNo(e.target.value)} />
                </Field>
                <Field label={T.expiry}>
                  <Input type="date" value={certExpiry} onChange={(e) => setCertExpiry(e.target.value)} />
                </Field>
              </div>
              <UploadButton
                T={T}
                label={certFileUrl ? T.fileAttached : T.attachCertFile}
                done={!!certFileUrl}
                onPick={async (f) => {
                  const url = await uploadFile(f, "cert");
                  if (url) setCertFileUrl(url);
                }}
              />
              <Button onClick={addCert} disabled={addingCert} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                {addingCert ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : <Plus className="me-1 h-4 w-4" />}
                {T.addCert}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-emerald-600" />
            {T.documentsSection} <span className="text-xs font-normal text-slate-400">/10</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <UploadButton
            T={T}
            label={cvUrl ? T.cvAttached : T.uploadCv}
            done={!!cvUrl}
            disabled={locked}
            onPick={async (f) => {
              const url = await uploadFile(f, "cv");
              if (url) {
                setCvUrl(url);
                toast.success(T.uploaded);
              }
            }}
          />
          {cvUrl && (
            <a href={cvUrl} target="_blank" rel="noreferrer" className="block text-sm text-emerald-600 underline">
              {T.viewCv}
            </a>
          )}
          <UploadButton
            T={T}
            label={idDocUrl ? T.idAttached : T.uploadId}
            done={!!idDocUrl}
            disabled={locked}
            onPick={async (f) => {
              const url = await uploadFile(f, "id");
              if (url) {
                setIdDocUrl(url);
                toast.success(T.uploaded);
              }
            }}
          />
          <Field label={T.profLinks}>
            <textarea
              className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
              rows={2}
              value={links}
              disabled={locked}
              onChange={(e) => setLinks(e.target.value)}
              placeholder={T.profLinksPh}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Actions */}
      {!locked && (
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => saveProfile()} disabled={saving} variant="outline">
            {saving ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : null}
            {T.saveDraft}
          </Button>
          <Button onClick={submitVerification} disabled={submitting} className="ms-grad-brand text-white">
            {submitting ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : <ShieldCheck className="me-1 h-4 w-4" />}
            {T.submit}
          </Button>
        </div>
      )}
      {status === "needs_more_info" && (
        <div className="flex flex-wrap gap-3">
          <Button onClick={submitVerification} disabled={submitting} className="ms-grad-brand text-white">
            {submitting ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : null}
            {T.resubmit}
          </Button>
        </div>
      )}
    </div>
  );
}

// ------------------------------- Sub-components --------------------------------

function StatusCard({
  T,
  status,
  score,
  tier,
  breakdown,
  adminNote,
  isAr,
}: {
  T: ReturnType<typeof makeDict>;
  status: VerificationStatus;
  score: number;
  tier: CoachTier;
  breakdown?: CoachScoreBreakdown | null;
  adminNote: string | null;
  isAr: boolean;
}) {
  const meta = STATUS_META[status];
  return (
    <Card className="overflow-hidden border-slate-200">
      <div className="ms-grad-brand p-5 text-white">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <meta.icon className="h-8 w-8" />
            <div>
              <div className="text-lg font-bold">{T.statusLabels[status]}</div>
              <div className="text-sm text-white/80">{T.statusHints[status]}</div>
            </div>
          </div>
          <div className="text-end">
            <div className="text-3xl font-extrabold">{score.toFixed(0)}<span className="text-base font-medium">/100</span></div>
            <div className="text-sm text-white/90">{isAr ? TIER_LABELS[tier].ar : TIER_LABELS[tier].en}</div>
          </div>
        </div>
      </div>
      {breakdown && (
        <CardContent className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-3">
          <ScorePill label={T.bdAcademic} value={breakdown.academic} max={20} />
          <ScorePill label={T.bdCerts} value={breakdown.certifications} max={25} />
          <ScorePill label={T.bdExperience} value={breakdown.experience} max={15} />
          <ScorePill label={T.bdCompleteness} value={breakdown.completeness} max={10} />
          <ScorePill label={T.bdAdmin} value={breakdown.admin} max={15} />
          <ScorePill label={T.bdPerformance} value={breakdown.performance} max={15} />
        </CardContent>
      )}
      {adminNote && (status === "needs_more_info" || status === "rejected") && (
        <div className="border-t border-slate-100 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          <AlertCircle className="me-1 inline h-4 w-4" />
          {adminNote}
        </div>
      )}
    </Card>
  );
}

function ScorePill({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="rounded-md border border-slate-200 p-2">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span className="font-semibold text-slate-700">{value}/{max}</span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
        <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Chip({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition ${
        active ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-slate-600 hover:border-emerald-300"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      {children}
    </button>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <select
      className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder || "—"}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function UploadButton({
  T,
  label,
  done,
  disabled,
  onPick,
}: {
  T: ReturnType<typeof makeDict>;
  label: string;
  done?: boolean;
  disabled?: boolean;
  onPick: (file: File) => Promise<void>;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          await onPick(f);
          setBusy(false);
          if (ref.current) ref.current.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || busy}
        onClick={() => ref.current?.click()}
        className={done ? "border-emerald-400 text-emerald-700" : ""}
      >
        {busy ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : done ? <CheckCircle2 className="me-1 h-4 w-4" /> : <Upload className="me-1 h-4 w-4" />}
        {label}
      </Button>
      <span className="ms-2 text-xs text-slate-400">{T.fileHint}</span>
    </div>
  );
}

// ------------------------------- helpers + dict --------------------------------

function certIssuerLabel(id: string, isAr: boolean): string {
  const found = CERT_ISSUERS.find((c) => c.id === id);
  return found ? (isAr ? found.ar : found.en) : id;
}

const STATUS_META: Record<VerificationStatus, { icon: React.ComponentType<{ className?: string }> }> = {
  draft: { icon: FileText },
  submitted: { icon: Clock },
  under_review: { icon: Clock },
  needs_more_info: { icon: AlertCircle },
  verified: { icon: ShieldCheck },
  rejected: { icon: XCircle },
};

function makeDict(isAr: boolean) {
  return {
    profileSection: isAr ? "الملف التعريفي" : "Profile",
    academicSection: isAr ? "المؤهل العلمي" : "Academic Qualification",
    experienceSection: isAr ? "الخبرة والتخصص" : "Experience & Specialties",
    certsSection: isAr ? "الشهادات المهنية" : "Professional Certifications",
    documentsSection: isAr ? "الوثائق" : "Documents",
    displayName: isAr ? "الاسم المعروض" : "Display Name",
    displayNamePh: isAr ? "مثال: الكابتن أحمد" : "e.g. Coach Ahmed",
    bio: isAr ? "نبذة تعريفية" : "Bio",
    bioPh: isAr ? "اكتب نبذة عن خبرتك وأسلوبك في التدريب…" : "Describe your experience and coaching style…",
    city: isAr ? "المدينة" : "City",
    country: isAr ? "الدولة" : "Country",
    languages: isAr ? "لغات التدريب" : "Coaching Languages",
    degree: isAr ? "أعلى مؤهل" : "Highest Degree",
    studyField: isAr ? "مجال الدراسة" : "Field of Study",
    university: isAr ? "الجامعة / المعهد" : "University / Institute",
    gradYear: isAr ? "سنة التخرج" : "Graduation Year",
    yearsExperience: isAr ? "سنوات الخبرة" : "Years of Experience",
    specialties: isAr ? "التخصصات" : "Specialties",
    certName: isAr ? "اسم الشهادة" : "Certification Name",
    certNamePh: isAr ? "مثال: Certified Personal Trainer" : "e.g. Certified Personal Trainer",
    issuer: isAr ? "الجهة المانحة" : "Issuer",
    credentialNo: isAr ? "رقم الاعتماد (اختياري)" : "Credential No. (optional)",
    expiry: isAr ? "تاريخ الانتهاء" : "Expiry Date",
    attachCertFile: isAr ? "إرفاق ملف الشهادة" : "Attach certificate file",
    fileAttached: isAr ? "تم إرفاق الملف" : "File attached",
    addCert: isAr ? "إضافة شهادة" : "Add Certification",
    documentsHint: isAr ? "ارفع سيرتك الذاتية ووثيقة هوية للتحقق" : "Upload your CV and an ID document",
    uploadCv: isAr ? "رفع السيرة الذاتية (CV)" : "Upload CV",
    cvAttached: isAr ? "تم رفع السيرة الذاتية" : "CV uploaded",
    viewCv: isAr ? "عرض السيرة الذاتية" : "View CV",
    uploadId: isAr ? "رفع وثيقة الهوية" : "Upload ID Document",
    idAttached: isAr ? "تم رفع الهوية" : "ID uploaded",
    profLinks: isAr ? "روابط مهنية (كل رابط بسطر)" : "Professional links (one per line)",
    profLinksPh: isAr ? "Instagram، موقعك، LinkedIn…" : "Instagram, website, LinkedIn…",
    saveDraft: isAr ? "حفظ كمسودة" : "Save Draft",
    saved: isAr ? "تم الحفظ" : "Saved",
    submit: isAr ? "إرسال للاعتماد" : "Submit for Verification",
    resubmit: isAr ? "إعادة الإرسال" : "Resubmit",
    submitted: isAr ? "تم إرسال طلبك للمراجعة" : "Your request was submitted",
    insufficient: isAr ? "أضف مؤهلًا علميًا أو شهادة واحدة على الأقل قبل الإرسال" : "Add a degree or at least one certification before submitting",
    alreadyVerified: isAr ? "حسابك معتمَد بالفعل" : "Already verified",
    choose: isAr ? "اختر…" : "Choose…",
    verified: isAr ? "موثّقة" : "Verified",
    certAdded: isAr ? "تمت إضافة الشهادة" : "Certification added",
    certRemoved: isAr ? "تم حذف الشهادة" : "Certification removed",
    certNameRequired: isAr ? "اسم الشهادة مطلوب" : "Certification name required",
    uploaded: isAr ? "تم الرفع" : "Uploaded",
    uploadError: isAr ? "فشل الرفع" : "Upload failed",
    fileTooLarge: isAr ? "الملف كبير جدًا (الحد 15 ميجابايت)" : "File too large (15MB max)",
    fileHint: isAr ? "PDF أو صورة، حتى 15MB" : "PDF or image, up to 15MB",
    loadError: isAr ? "تعذّر تحميل البيانات" : "Failed to load",
    saveError: isAr ? "تعذّر الحفظ" : "Save failed",
    bdAcademic: isAr ? "المؤهل" : "Academic",
    bdCerts: isAr ? "الشهادات" : "Certs",
    bdExperience: isAr ? "الخبرة" : "Experience",
    bdCompleteness: isAr ? "اكتمال الملف" : "Completeness",
    bdAdmin: isAr ? "تقييم الإدارة" : "Admin",
    bdPerformance: isAr ? "الأداء" : "Performance",
    statusLabels: {
      draft: isAr ? "مسودة — لم تُرسل بعد" : "Draft — not submitted",
      submitted: isAr ? "قيد المراجعة" : "Submitted",
      under_review: isAr ? "قيد المراجعة" : "Under Review",
      needs_more_info: isAr ? "مطلوب معلومات إضافية" : "Needs More Info",
      verified: isAr ? "معتمَد ✓" : "Verified ✓",
      rejected: isAr ? "لم يُعتمد" : "Not Approved",
    } as Record<VerificationStatus, string>,
    statusHints: {
      draft: isAr ? "أكمل ملفك ثم أرسله للاعتماد" : "Complete your profile then submit",
      submitted: isAr ? "سيراجع الفريق طلبك قريبًا" : "Our team will review shortly",
      under_review: isAr ? "طلبك قيد المراجعة الآن" : "Your request is being reviewed",
      needs_more_info: isAr ? "يرجى تحديث ملفك وإعادة الإرسال" : "Please update and resubmit",
      verified: isAr ? "تهانينا! حسابك ظاهر في دليل المدربين" : "You're live in the coach directory",
      rejected: isAr ? "راجع الملاحظة وأعد المحاولة" : "Review the note and try again",
    } as Record<VerificationStatus, string>,
    statusLabel: "",
  };
}
