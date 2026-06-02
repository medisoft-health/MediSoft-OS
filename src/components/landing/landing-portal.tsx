"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Shield,
  Globe,
  Activity,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/**
 * MediSoft Landing Page — Portal Selection (Light Theme)
 *
 * Three entry points:
 * 1. Physician Portal → /login
 * 2. Patient Portal → /patient-login
 * 3. Facility Portal → /facility-login
 */
export function LandingPortal() {
  const tAuth = useTranslations("Auth");
  const tLanding = useTranslations("Landing");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-white via-slate-50 to-blue-50/40 p-4 sm:p-6">
      {/* Subtle dot pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #64748b 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Soft gradient orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-blue-200/30 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 right-1/4 h-[500px] w-[500px] rounded-full bg-teal-200/20 blur-[120px]"
      />

      <div className="relative z-10 flex w-full max-w-5xl flex-col items-center">
        {/* Header */}
        <div className="mb-10 flex flex-col items-center text-center">
          <Logo variant="lockup" className="mb-6 scale-125" />
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-800 sm:text-4xl lg:text-5xl">
            {tLanding("clinicalOS")}
          </h1>
          <p className="mt-3 max-w-xl text-base text-slate-500 sm:text-lg">
            {tLanding("subtitle")}
            <br className="hidden sm:block" />
            {tLanding("selectPortal")}
          </p>
        </div>

        {/* Portal Cards */}
        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-7">
          {/* Physician Portal */}
          <PortalCard
            href="/login"
            image="/images/physician-portal.png"
            title={tAuth("physicianPortal")}
            titleAr={tLanding("physicianPortalAr")}
            description={tLanding("physicianPortalDesc")}
            enterLabel={tLanding("enter")}
            accentColor="blue"
          />
          {/* Patient Portal */}
          <PortalCard
            href="/patient-login"
            image="/images/patient-portal.png"
            title={tAuth("patientPortal")}
            titleAr={tLanding("patientPortalAr")}
            description={tLanding("patientPortalDesc")}
            enterLabel={tLanding("enter")}
            accentColor="teal"
          />
          {/* Facility Portal */}
          <PortalCard
            href="/facility-login"
            image="/images/facility-portal.png"
            title={tAuth("facilityPortal")}
            titleAr={tLanding("facilityPortalAr")}
            description={tLanding("facilityPortalDesc")}
            enterLabel={tLanding("enter")}
            accentColor="purple"
          />
        </div>

        {/* Trust Indicators */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 sm:gap-8">
          <div className="flex items-center gap-1.5">
            <Shield className="size-3.5 text-teal-500" />
            <span>{tLanding("hipaaCompliant")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe className="size-3.5 text-blue-500" />
            <span>{tLanding("fhirCompatible")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="size-3.5 text-pink-500" />
            <span>{tLanding("aiPowered")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-amber-500" />
            <span>{tLanding("saudiCertified")}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-400">
          <p>{tLanding("copyright", { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */

const accentMap = {
  blue: {
    card: "border-blue-200 hover:border-blue-300 hover:shadow-blue-100/60",
    title: "text-blue-700",
    btn: "bg-blue-600 text-white hover:bg-blue-700",
  },
  teal: {
    card: "border-teal-200 hover:border-teal-300 hover:shadow-teal-100/60",
    title: "text-teal-700",
    btn: "bg-teal-600 text-white hover:bg-teal-700",
  },
  purple: {
    card: "border-purple-200 hover:border-purple-300 hover:shadow-purple-100/60",
    title: "text-purple-700",
    btn: "bg-purple-600 text-white hover:bg-purple-700",
  },
} as const;

interface PortalCardProps {
  href: string;
  image: string;
  title: string;
  titleAr: string;
  description: string;
  enterLabel: string;
  accentColor: keyof typeof accentMap;
}

function PortalCard({
  href,
  image,
  title,
  titleAr,
  description,
  enterLabel,
  accentColor,
}: PortalCardProps) {
  const colors = accentMap[accentColor];

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col items-center overflow-hidden rounded-2xl border bg-white p-6 text-center shadow-sm transition-all duration-300",
        colors.card,
        "hover:scale-[1.02] hover:shadow-xl",
      )}
    >
      {/* Image */}
      <div className="relative mb-4 h-40 w-40 overflow-hidden rounded-full">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-110"
          sizes="160px"
        />
      </div>

      {/* Title */}
      <h2 className={cn("text-lg font-bold", colors.title)}>{title}</h2>
      <p className="mt-0.5 text-sm font-medium text-slate-400">{titleAr}</p>

      {/* Description */}
      <p className="mt-3 text-sm leading-relaxed text-slate-500">
        {description}
      </p>

      {/* Button */}
      <div
        className={cn(
          "mt-5 flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200",
          colors.btn,
        )}
      >
        <span>{enterLabel}</span>
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
