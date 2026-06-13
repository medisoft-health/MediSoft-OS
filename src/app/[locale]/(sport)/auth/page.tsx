"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Activity,
  Eye,
  EyeOff,
  HeartPulse,
  Loader2,
  Lock,
  Mail,
  Salad,
  User,
  Users,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type AuthMode = "login" | "register";
type UserRole = "trainee" | "coach";

/**
 * MediSport Standalone — Enhanced Single Login / Sign-up page (v2.0 UI Upgrade)
 *
 * Visual identity v2.0 (June 2026):
 * - Split-screen: branded hero (emerald→teal gradient + runner image + wordmark)
 *   on the left (lg+) and a clean auth card on the right.
 * - Softer background (#F8FAFC), improved form spacing, refined shadows
 * - Smoother transitions and micro-interactions
 * - Full RTL support via logical properties; uses .medisport-scope brand fonts.
 */
export default function SportAuthPage() {
  const t = useTranslations("SportStandalone");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRtl = locale === "ar";

  const [mode, setMode] = React.useState<AuthMode>(
    (searchParams.get("mode") as AuthMode) || "login"
  );
  const [role, setRole] = React.useState<UserRole>(
    (searchParams.get("role") as UserRole) || "trainee"
  );
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // Form state
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        const res = await fetch("/api/auth/sign-up/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password,
            callbackURL: `/${locale}/${role}`,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || t("authError"));
        }
        toast.success(t("registerSuccess"));
        localStorage.setItem("medisport-role", role);
        router.push(`/${locale}/onboarding?role=${role}`);
      } else {
        const res = await fetch("/api/auth/sign-in/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            callbackURL: `/${locale}/trainee`,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || t("authError"));
        }
        toast.success(t("loginSuccess"));
        const savedRole = localStorage.getItem("medisport-role") || "trainee";
        router.push(`/${locale}/${savedRole}`);
      }
    } catch (err: any) {
      toast.error(err.message || t("authError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="medisport-scope flex min-h-screen w-full items-stretch">
      {/* ── Branded Hero (left on lg+) ── */}
      <aside className="relative hidden w-1/2 overflow-hidden lg:flex lg:flex-col lg:justify-between">
        {/* Background image + gradient overlay */}
        <Image
          src="/images/medisport-runner.jpg"
          alt=""
          fill
          priority
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(6,78,59,0.92) 0%, rgba(5,122,85,0.85) 45%, rgba(14,159,110,0.78) 100%)",
          }}
        />

        {/* Top: wordmark on white chip */}
        <div className="relative z-10 p-10">
          <div className="inline-flex items-center rounded-2xl bg-white/95 px-4 py-3 shadow-lg shadow-emerald-950/20">
            <Image
              src="/images/medisport-wordmark.png"
              alt="MediSport"
              width={170}
              height={29}
              priority
              className="h-7 w-auto"
            />
          </div>
        </div>

        {/* Middle: headline */}
        <div className="relative z-10 px-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm ring-1 ring-white/25">
            <HeartPulse className="h-3.5 w-3.5" />
            {t("authHeroBadge")}
          </span>
          <h1 className="ms-display mt-5 max-w-md text-3xl font-extrabold leading-tight text-white xl:text-4xl">
            {t("authHeroTitle")}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-emerald-50/90 xl:text-base">
            {t("authHeroSubtitle")}
          </p>
        </div>

        {/* Bottom: feature chips */}
        <div className="relative z-10 flex flex-wrap gap-3 p-10">
          <HeroChip icon={Activity} label={t("authFeatureBioAge")} />
          <HeroChip icon={Salad} label={t("authFeatureNutrition")} />
          <HeroChip icon={HeartPulse} label={t("authFeatureClinical")} />
        </div>
      </aside>

      {/* ── Auth Card (right) ── */}
      <main className="flex w-full items-center justify-center bg-[#F8FAFC] px-5 py-10 lg:w-1/2">
        <div className="w-full max-w-md ms-animate-in">
          {/* Mobile wordmark */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <Image
              src="/images/medisport-wordmark.png"
              alt="MediSport"
              width={180}
              height={31}
              priority
              className="h-9 w-auto"
            />
            <p className="mt-2 text-sm text-slate-500">{t("tagline")}</p>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex rounded-2xl bg-slate-100/80 p-1.5">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 ${
                mode === "login"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t("signInTab")}
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 ${
                mode === "register"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t("signUpTab")}
            </button>
          </div>

          <h2 className="ms-display text-2xl font-bold text-slate-800">
            {mode === "login" ? t("loginTitle") : t("registerTitle")}
          </h2>
          <p className="mt-1.5 mb-7 text-sm text-slate-500">{t("tagline")}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role selection (register only) */}
            {mode === "register" && (
              <div className="space-y-2.5">
                <label className="text-sm font-medium text-slate-700">
                  {t("roleQuestion")}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <RoleOption
                    active={role === "trainee"}
                    icon={Activity}
                    label={t("roleTrainee")}
                    onClick={() => setRole("trainee")}
                  />
                  <RoleOption
                    active={role === "coach"}
                    icon={Users}
                    label={t("roleCoach")}
                    onClick={() => setRole("coach")}
                  />
                </div>
              </div>
            )}

            {/* Full name (register only) */}
            {mode === "register" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  {t("fullName")}
                </label>
                <div className="relative">
                  <User className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder={t("fullNamePlaceholder")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-xl ps-10 h-11 border-slate-200 focus:border-emerald-300 focus:ring-emerald-200/50"
                    required
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                {t("emailLabel")}
              </label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl ps-10 h-11 border-slate-200 focus:border-emerald-300 focus:ring-emerald-200/50"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                {t("passwordLabel")}
              </label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl ps-10 pe-10 h-11 border-slate-200 focus:border-emerald-300 focus:ring-emerald-200/50"
                  required
                  minLength={12}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="ms-grad-brand h-12 w-full rounded-xl text-white transition-all duration-200 hover:opacity-90 hover:shadow-lg shadow-emerald-200/50"
            >
              {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {mode === "login" ? t("loginBtn") : t("registerBtn")}
            </Button>
          </form>

          {/* Switch mode hint */}
          <div className="mt-6 text-center">
            {mode === "login" ? (
              <p className="text-sm text-slate-500">
                {t("noAccount")}{" "}
                <button
                  onClick={() => setMode("register")}
                  className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline transition-colors"
                >
                  {t("registerHere")}
                </button>
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                {t("alreadyHaveAccount")}{" "}
                <button
                  onClick={() => setMode("login")}
                  className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline transition-colors"
                >
                  {t("loginHere")}
                </button>
              </p>
            )}
          </div>

          {/* MediSoft endorsement */}
          <div className="mt-8 border-t border-slate-100 pt-6 text-center">
            <p className="text-xs text-slate-400">{t("linkMediSoft")}</p>
            <p className="mt-2 text-[11px] font-medium text-slate-400">
              Powered by MediSoft Health
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

function HeroChip({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl bg-white/12 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur-sm ring-1 ring-white/20 transition-all duration-200 hover:bg-white/20">
      <Icon className="h-4 w-4" />
      {label}
    </span>
  );
}

function RoleOption({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-3.5 transition-all duration-200 ${
        active
          ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100/50"
          : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ${
          active
            ? "bg-emerald-500 text-white shadow-sm"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}
