"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  searchWada,
  WADA_SUBSTANCES,
  type ProhibitionStatus,
  type WadaSubstance,
} from "@/lib/sport/wada-database";

const STATUS_CONFIG: Record<
  ProhibitionStatus,
  { color: string; bg: string; icon: React.ElementType }
> = {
  prohibited: { color: "text-red-700", bg: "bg-red-50 border-red-200", icon: XCircle },
  prohibited_in_competition: {
    color: "text-orange-700",
    bg: "bg-orange-50 border-orange-200",
    icon: ShieldAlert,
  },
  monitored: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Eye },
  permitted: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
};

/**
 * MediSport — WADA Banned Substance Check
 */
export default function WadaCheckPage() {
  const t = useTranslations("SportWada");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const [query, setQuery] = React.useState("");
  const results = React.useMemo<WadaSubstance[]>(
    () => (query ? searchWada(query) : WADA_SUBSTANCES),
    [query]
  );

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
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t("title")}</h1>
            <p className="text-sm text-slate-500">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className={`absolute top-3 h-4 w-4 text-slate-400 ${isRtl ? "right-3" : "left-3"}`} />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className={`h-11 ${isRtl ? "pr-9" : "pl-9"}`}
        />
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 mb-4 sm:grid-cols-4">
        {(["permitted", "monitored", "prohibited_in_competition", "prohibited"] as ProhibitionStatus[]).map(
          (s) => {
            const cfg = STATUS_CONFIG[s];
            const Icon = cfg.icon;
            return (
              <div key={s} className={`flex items-center gap-1.5 p-2 rounded-lg border ${cfg.bg}`}>
                <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                <span className={`text-[10px] font-medium ${cfg.color}`}>{t(`status_${s}`)}</span>
              </div>
            );
          }
        )}
      </div>

      {/* Results */}
      <div className="space-y-2">
        {results.map((sub) => {
          const cfg = STATUS_CONFIG[sub.status];
          const Icon = cfg.icon;
          return (
            <Card key={sub.id} className={`border ${cfg.bg}`}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 ${cfg.color} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {locale === "ar" ? sub.nameAr : sub.nameEn}
                      </p>
                      <Badge className={`text-[9px] ${cfg.color} bg-white/60 border-0`}>
                        {t(`status_${sub.status}`)}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {locale === "ar" ? sub.categoryAr : sub.category}
                    </p>
                    <p className="text-xs text-slate-600 mt-1.5">
                      {locale === "ar" ? sub.notesAr : sub.notesEn}
                    </p>
                    {(sub.alternativesAr || sub.alternativesEn) && (
                      <div className="flex items-start gap-1.5 mt-2 p-2 rounded-md bg-white/60">
                        <AlertTriangle className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] text-slate-700">
                          <span className="font-medium">{t("alternatives")}: </span>
                          {locale === "ar" ? sub.alternativesAr : sub.alternativesEn}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {results.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">{t("noResults")}</p>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="mt-6 p-3 rounded-lg bg-slate-50 border border-slate-100">
        <p className="text-[10px] text-slate-500 leading-relaxed">{t("disclaimer")}</p>
      </div>
    </div>
  );
}
