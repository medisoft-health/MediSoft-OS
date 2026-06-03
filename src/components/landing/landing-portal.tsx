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
 * MediSoft Landing Page — Portal Selection
 *
 * Three entry points:
 * 1. Physician Portal → /login
 * 2. Patient Portal → /patient-login
 * 3. Facility Portal → /facility-login
 *
 * Uses CSS variable tokens for full dark mode + theme compatibility.
 */
export function LandingPortal() {
  const tAuth = useTranslations("Auth");
  const tLanding = useTranslations("Landing");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[color:var(--color-background)] p-4 sm:p-6">
      {/* Subtle dot pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Soft gradient orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 start-1/4 h-[500px] w-[500px] rounded-full bg-[color:var(--color-brand-blue)]/15 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 end-1/4 h-[500px] w-[500px] rounded-full bg-[color:var(--color-brand-cyan)]/10 blur-[120px]"
      />

      <div className="relative z-10 flex w-full max-w-5xl flex-col items-center">
        {/* Header */}
        <div className="mb-10 flex flex-col items-center text-center">
          <Logo variant="lockup" className="mb-6 w-48 sm:w-56" />
          <h1 className="mt-4 text-3xl font-black tracking-tight text-[color:var(--color-foreground)] sm:text-4xl lg:text-5xl">
            {tLanding("clinicalOS")}
          </h1>
          <p className="mt-3 max-w-xl text-base text-[color:var(--color-muted-foreground)] sm:text-lg">
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
        <div className="mt-14 flex flex-wrap items-center justify-center gap-6 text-xs text-[color:var(--color-muted-foreground)] sm:gap-8">
          <div className="flex items-center gap-1.5">
            <Shield className="size-3.5 text-[color:var(--color-brand-cyan)]" />
            <span>{tLanding("hipaaCompliant")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe className="size-3.5 text-[color:var(--color-brand-blue)]" />
            <span>{tLanding("fhirCompatible")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="size-3.5 text-[color:var(--color-brand-pink)]" />
            <span>{tLanding("aiPowered")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-[color:var(--color-brand-orange)]" />
            <span>{tLanding("saudiCertified")}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-[color:var(--color-muted-foreground)]">
          <p>{tLanding("copyright", { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */

const accentMap = {
  blue: {
    card: "border-[color:var(--color-brand-blue)]/20 hover:border-[color:var(--color-brand-blue)]/40 hover:shadow-[color:var(--color-brand-blue)]/10",
    title: "text-[color:var(--color-brand-blue)]",
    btn: "bg-[color:var(--color-brand-blue)] text-white hover:opacity-90",
  },
  teal: {
    card: "border-[color:var(--color-brand-cyan)]/20 hover:border-[color:var(--color-brand-cyan)]/40 hover:shadow-[color:var(--color-brand-cyan)]/10",
    title: "text-[color:var(--color-brand-cyan)]",
    btn: "bg-[color:var(--color-brand-cyan)] text-white hover:opacity-90",
  },
  purple: {
    card: "border-[color:var(--color-brand-purple)]/20 hover:border-[color:var(--color-brand-purple)]/40 hover:shadow-[color:var(--color-brand-purple)]/10",
    title: "text-[color:var(--color-brand-purple)]",
    btn: "bg-[color:var(--color-brand-purple)] text-white hover:opacity-90",
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
        "group relative flex flex-col items-center overflow-hidden rounded-2xl border bg-[color:var(--color-card)] p-6 text-center shadow-sm transition-all duration-300",
        colors.card,
        "motion-safe:hover:-translate-y-1 hover:shadow-xl",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2",
      )}
    >
      {/* Image */}
      <div className="relative mb-4 h-40 w-40 overflow-hidden rounded-full bg-[color:var(--color-muted)]">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-110"
          sizes="160px"
        />
      </div>

      {/* Title */}
      <h2 className={cn("text-lg font-bold", colors.title)}>{title}</h2>
      <p className="mt-0.5 text-sm font-medium text-[color:var(--color-muted-foreground)]">{titleAr}</p>

      {/* Description */}
      <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-muted-foreground)]">
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
        <ArrowRight className="size-4 transition-transform motion-safe:group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
