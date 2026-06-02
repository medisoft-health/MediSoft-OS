"use client";

import Link from "next/link";
import {
  Stethoscope,
  User,
  Building2,
  ArrowRight,
  Shield,
  Globe,
  Activity,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/**
 * MediSoft Landing Page — Portal Selection
 *
 * Three entry points:
 * 1. Physician Portal → /login
 * 2. Patient Portal → /patient-login
 * 3. Facility Portal → /facility-login
 */
export function LandingPortal() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6">
      {/* Background effects */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 20% 20%, rgba(26,59,122,0.35), transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(233,30,140,0.15), transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(13,148,136,0.1), transparent 60%)",
        }}
      />
      {/* Subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex w-full max-w-5xl flex-col items-center">
        {/* Logo & Header */}
        <div className="mb-12 flex flex-col items-center text-center">
          <Logo variant="lockup" className="mb-6 scale-125" />
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
            Clinical Operating System
          </h1>
          <p className="mt-3 max-w-xl text-base text-slate-400 sm:text-lg">
            The next generation of intelligent healthcare management.
            <br className="hidden sm:block" />
            Select your portal to continue.
          </p>
        </div>

        {/* Portal Cards */}
        <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
          {/* Physician Portal */}
          <PortalCard
            href="/login"
            icon={Stethoscope}
            title="Physician Portal"
            titleAr="بوابة الأطباء"
            description="Access your clinical workspace, patient records, and medical intelligence tools."
            gradient="from-blue-600/20 to-blue-900/20"
            borderColor="border-blue-500/30"
            iconColor="text-blue-400"
            hoverGlow="hover:shadow-blue-500/20"
          />

          {/* Patient Portal */}
          <PortalCard
            href="/patient-login"
            icon={User}
            title="Patient Portal"
            titleAr="بوابة المرضى"
            description="View your medical records, appointments, lab results, and communicate with your doctor."
            gradient="from-teal-600/20 to-teal-900/20"
            borderColor="border-teal-500/30"
            iconColor="text-teal-400"
            hoverGlow="hover:shadow-teal-500/20"
          />

          {/* Facility Portal */}
          <PortalCard
            href="/facility-login"
            icon={Building2}
            title="Facility Portal"
            titleAr="بوابة المنشآت الطبية"
            description="Manage your hospital operations, staff, departments, analytics, and compliance."
            gradient="from-pink-600/20 to-pink-900/20"
            borderColor="border-pink-500/30"
            iconColor="text-pink-400"
            hoverGlow="hover:shadow-pink-500/20"
          />
        </div>

        {/* Trust Indicators */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 sm:gap-8">
          <div className="flex items-center gap-1.5">
            <Shield className="size-3.5 text-teal-500" />
            <span>HIPAA & PDPL Compliant</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe className="size-3.5 text-blue-500" />
            <span>HL7 FHIR R4 Compatible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="size-3.5 text-pink-500" />
            <span>Medical Intelligence Powered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-amber-500" />
            <span>Saudi Arabia Certified</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-600">
          <p>&copy; {new Date().getFullYear()} MediSoft Health. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */

interface PortalCardProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  titleAr: string;
  description: string;
  gradient: string;
  borderColor: string;
  iconColor: string;
  hoverGlow: string;
}

function PortalCard({
  href,
  icon: Icon,
  title,
  titleAr,
  description,
  gradient,
  borderColor,
  iconColor,
  hoverGlow,
}: PortalCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col items-center rounded-2xl border p-8 text-center transition-all duration-300",
        "bg-gradient-to-b backdrop-blur-sm",
        gradient,
        borderColor,
        hoverGlow,
        "hover:scale-[1.03] hover:border-opacity-60 hover:shadow-2xl",
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "mb-5 grid size-16 place-items-center rounded-2xl bg-slate-800/60 ring-1 ring-white/10 transition-transform group-hover:scale-110",
          iconColor,
        )}
      >
        <Icon className="size-8" />
      </div>

      {/* Title */}
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <p className="mt-0.5 text-sm font-medium text-slate-400">{titleAr}</p>

      {/* Description */}
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        {description}
      </p>

      {/* Arrow */}
      <div className="mt-5 flex items-center gap-1 text-sm font-semibold text-slate-300 transition-colors group-hover:text-white">
        <span>Enter</span>
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
