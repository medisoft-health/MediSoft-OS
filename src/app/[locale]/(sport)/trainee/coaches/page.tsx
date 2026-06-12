"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { CoachDirectory } from "@/components/sport/coach-directory";

/**
 * MediSport Standalone — Coach Directory page for trainees.
 * Thin wrapper around the shared CoachDirectory so standalone and integrated
 * (/medisport) stay mirrored.
 */
export default function TraineeCoachesPage() {
  const locale = useLocale() as "ar" | "en";
  const isAr = locale === "ar";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/trainee">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="ms-grad-brand flex h-11 w-11 items-center justify-center rounded-2xl text-white">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isAr ? "اختر مدربك" : "Find your coach"}
            </h1>
            <p className="text-sm text-slate-500">
              {isAr
                ? "مدربون معتمدون مرتّبون حسب التقييم — اطلب من يناسبك."
                : "Verified coaches ranked by score — request the right fit."}
            </p>
          </div>
        </div>
      </div>

      <CoachDirectory locale={locale} />
    </div>
  );
}
