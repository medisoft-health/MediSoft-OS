"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  FileText,
  HeartPulse,
  Link2,
  Lock,
  ShieldCheck,
  Stethoscope,
  TestTube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ShareCategory {
  key: string;
  icon: React.ElementType;
}

const SHARE_CATEGORIES: ShareCategory[] = [
  { key: "labResults", icon: TestTube },
  { key: "vitals", icon: HeartPulse },
  { key: "bodyComposition", icon: Activity },
  { key: "medicalHistory", icon: FileText },
  { key: "clinicalNotes", icon: Stethoscope },
];

/**
 * MediSport — Medical Context Bridge
 *
 * Consent-based bridge that links a MediSport athlete profile to their
 * MediSoft clinical record. The athlete controls exactly which data
 * categories are shared with their coach/physician.
 */
export default function MedicalBridgePage() {
  const t = useTranslations("SportBridge");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const [linked, setLinked] = React.useState(false);
  const [mrn, setMrn] = React.useState("");
  const [consents, setConsents] = React.useState<Record<string, boolean>>({
    labResults: true,
    vitals: true,
    bodyComposition: true,
    medicalHistory: false,
    clinicalNotes: false,
  });
  const [saved, setSaved] = React.useState(false);

  const toggle = (key: string) =>
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleLink = async () => {
    setLinked(true);
    try {
      await fetch("/api/sport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "medical-bridge-link", mrn, consents }),
      });
    } catch {
      /* offline-safe */
    }
  };

  const handleSaveConsents = async () => {
    setSaved(true);
    try {
      await fetch("/api/sport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "medical-bridge-consent", consents }),
      });
    } catch {
      /* offline-safe */
    }
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${locale}/sport/trainee`}>
          <Button variant="ghost" size="icon" className="rounded-lg">
            <ArrowLeft className={`h-5 w-5 ${isRtl ? "rotate-180" : ""}`} />
          </Button>
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
            <Link2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t("title")}</h1>
            <p className="text-sm text-slate-500">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      {/* Privacy banner */}
      <Card className="border-emerald-100 bg-emerald-50/40 mb-4">
        <CardContent className="p-3 flex items-start gap-2.5">
          <Lock className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-800 leading-relaxed">{t("privacyNote")}</p>
        </CardContent>
      </Card>

      {/* Link account */}
      {!linked ? (
        <Card className="border-slate-100 mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-emerald-500" />
              {t("linkRecord")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-500">{t("linkDescription")}</p>
            <input
              value={mrn}
              onChange={(e) => setMrn(e.target.value)}
              placeholder={t("mrnPlaceholder")}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm"
            />
            <Button
              onClick={handleLink}
              disabled={!mrn}
              className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Link2 className="h-4 w-4 me-1.5" />
              {t("linkButton")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-200 bg-emerald-50/40 mb-4">
          <CardContent className="p-3 flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-800">{t("linkedTitle")}</p>
              <p className="text-xs text-emerald-700">{t("linkedDesc")} {mrn}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consent controls */}
      {linked && (
        <Card className="border-slate-100 mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              {t("shareControls")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {SHARE_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const enabled = consents[cat.key];
              return (
                <button
                  key={cat.key}
                  onClick={() => toggle(cat.key)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-emerald-200 transition-all"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      enabled ? "bg-emerald-100" : "bg-slate-100"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${enabled ? "text-emerald-600" : "text-slate-400"}`} />
                  </div>
                  <div className="flex-1 text-start">
                    <p className="text-sm font-medium text-slate-900">{t(`cat_${cat.key}`)}</p>
                    <p className="text-[10px] text-slate-500">{t(`cat_${cat.key}_desc`)}</p>
                  </div>
                  {/* toggle */}
                  <div
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      enabled ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                        enabled
                          ? isRtl
                            ? "left-0.5"
                            : "right-0.5"
                          : isRtl
                          ? "right-0.5"
                          : "left-0.5"
                      }`}
                    />
                  </div>
                </button>
              );
            })}
            <Button
              onClick={handleSaveConsents}
              className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white mt-2"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="h-4 w-4 me-1.5" />
                  {t("consentsSaved")}
                </>
              ) : (
                t("saveConsents")
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* What coaches see */}
      {linked && (
        <Card className="border-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("coachViewTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {SHARE_CATEGORIES.filter((c) => consents[c.key]).map((c) => (
                <Badge key={c.key} variant="secondary" className="text-[10px]">
                  {t(`cat_${c.key}`)}
                </Badge>
              ))}
              {SHARE_CATEGORIES.filter((c) => consents[c.key]).length === 0 && (
                <p className="text-xs text-slate-400">{t("nothingShared")}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
