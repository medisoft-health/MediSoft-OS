"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { AdminCoachVerification } from "@/components/sport/admin-coach-verification";

/**
 * MediSport — Admin Coach Verification page.
 * Lives in the (sport) group so it shares the MediSport shell + brand identity.
 * Access control is enforced server-side by the API (role=admin → 403 otherwise),
 * and the component renders an "admins only" state on 403.
 */
export default function AdminCoachesPage() {
  const locale = useLocale() as "ar" | "en";
  const isAr = locale === "ar";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/coach">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="ms-grad-brand flex h-11 w-11 items-center justify-center rounded-2xl text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isAr ? "اعتماد المدربين" : "Coach Verification"}
            </h1>
            <p className="text-sm text-slate-500">
              {isAr
                ? "راجِع طلبات المدربين، تحقّق من الوثائق، واتخذ القرار."
                : "Review coach requests, verify documents, and decide."}
            </p>
          </div>
        </div>
      </div>

      <AdminCoachVerification locale={locale} />
    </div>
  );
}
