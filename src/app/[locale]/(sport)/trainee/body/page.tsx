"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { BodyCompositionHistory } from "@/components/sport/body-composition-history";

/**
 * MediSport Standalone — Body Composition Tracking page.
 * Thin wrapper around the shared, DB-backed tracker so standalone and
 * integrated (/medisport) stay mirrored.
 */
export default function BodyCompositionPage() {
  const t = useTranslations("SportBody");
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/trainee">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t("title")}</h1>
            <p className="text-sm text-slate-500">{t("subtitle")}</p>
          </div>
        </div>
      </div>
      <BodyCompositionHistory />
    </div>
  );
}
