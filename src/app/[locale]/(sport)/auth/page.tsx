"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Activity,
  ArrowLeft,
  Eye,
  EyeOff,
  Globe,
  HeartPulse,
  Loader2,
  Lock,
  Mail,
  Phone,
  Salad,
  User,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type AuthMode = "login" | "register" | "forgot" | "phone";
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

  // Form state — Email
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  // Form state — Phone OTP
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [otpCode, setOtpCode] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);
  const [otpCountdown, setOtpCountdown] = React.useState(0);

  // Form state — Forgot password
  const [resetSent, setResetSent] = React.useState(false);

  // OTP countdown timer
  React.useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // Language switch path
  const switchLocalePath = React.useMemo(() => {
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
    if (locale === "ar") return currentPath.replace(/^\/ar/, "/en");
    return currentPath.replace(/^\/en/, "/ar");
  }, [locale]);

  // ─── Email Login/Register ───
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        const res = await fetch("/api/auth/sign-up/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, callbackURL: `/${locale}/${role}` }),
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
          body: JSON.stringify({ email, password, callbackURL: `/${locale}/trainee` }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || t("authError"));
        }
        toast.success(t("loginSuccess"));
        const savedRole = localStorage.getItem("medisport-role") || "trainee";
        const returnTo = searchParams.get("returnTo");
        router.push(returnTo || `/${locale}/${savedRole}`);
      }
    } catch (err: any) {
      toast.error(err.message || t("authError"));
    } finally {
      setLoading(false);
    }
  };

  // ─── Forgot Password ───
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error(isRtl ? "أدخل بريدك الإلكتروني أولاً" : "Enter your email first");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forget-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirectTo: `/${locale}/auth?mode=login` }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || t("authError"));
      }
      setResetSent(true);
      toast.success(isRtl ? "تم إرسال رابط إعادة التعيين" : "Reset link sent!");
    } catch (err: any) {
      toast.error(err.message || t("authError"));
    } finally {
      setLoading(false);
    }
  };

  // ─── Phone OTP — Send Code ───
  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      toast.error(isRtl ? "أدخل رقم جوال صحيح" : "Enter a valid phone number");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/phone-number/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || t("authError"));
      }
      setOtpSent(true);
      setOtpCountdown(60);
      toast.success(isRtl ? "تم إرسال رمز التحقق" : "OTP sent!");
    } catch (err: any) {
      toast.error(err.message || t("authError"));
    } finally {
      setLoading(false);
    }
  };

  // ─── Phone OTP — Verify & Sign In ───
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      toast.error(isRtl ? "أدخل رمز التحقق المكوّن من 6 أرقام" : "Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/phone-number/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, code: otpCode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || (isRtl ? "رمز التحقق غير صحيح" : "Invalid OTP"));
      }
      toast.success(t("loginSuccess"));
      const savedRole = localStorage.getItem("medisport-role") || "trainee";
      const returnTo = searchParams.get("returnTo");
      router.push(returnTo || `/${locale}/${savedRole}`);
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
      <main className="relative flex w-full flex-col items-center justify-center px-4 py-12 lg:w-1/2">
        {/* Language Switcher — top corner */}
        <div className="absolute top-4 end-4 z-10">
          <Link
            href={switchLocalePath}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-200 hover:text-slate-800"
          >
            <Globe className="h-4 w-4" />
            <span>{locale === "ar" ? "English" : "العربية"}</span>
          </Link>
        </div>

        <div className="w-full max-w-[420px] space-y-6">
          {/* Mobile wordmark */}
          <div className="mb-4 flex flex-col items-center lg:hidden">
            <Image
              src="/images/medisport-wordmark.png"
              alt="MediSport"
              width={180}
              height={31}
              priority
              className="h-9 w-auto"
            />
          </div>

          {/* Mode Tabs — only show for login/register */}
          {(mode === "login" || mode === "register") && (
            <div className="flex rounded-xl bg-slate-100 p-1">
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
            </div>
          )}

          {/* ─── FORGOT PASSWORD MODE ─── */}
          {mode === "forgot" && (
            <div className="space-y-5">
              <button
                onClick={() => setMode("login")}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {isRtl ? "العودة لتسجيل الدخول" : "Back to login"}
              </button>
              <h2 className="ms-display text-2xl font-bold text-slate-800">
                {isRtl ? "استعادة كلمة المرور" : "Reset Password"}
              </h2>
              <p className="text-sm text-slate-500">
                {isRtl
                  ? "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور."
                  : "Enter your email and we'll send you a password reset link."}
              </p>
              {resetSent ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
                  <p className="text-sm font-medium text-emerald-800">
                    {isRtl
                      ? "تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني. تحقق من صندوق الوارد."
                      : "Reset link sent to your email. Check your inbox."}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
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
                  <Button
                    type="submit"
                    disabled={loading}
                    className="ms-grad-brand h-12 w-full rounded-xl text-white transition-all duration-200 hover:opacity-90 hover:shadow-lg shadow-emerald-200/50"
                  >
                    {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    {isRtl ? "إرسال رابط الاستعادة" : "Send Reset Link"}
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* ─── PHONE OTP MODE ─── */}
          {mode === "phone" && (
            <div className="space-y-5">
              <button
                onClick={() => { setMode("login"); setOtpSent(false); setOtpCode(""); }}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {isRtl ? "العودة لتسجيل الدخول" : "Back to login"}
              </button>
              <h2 className="ms-display text-2xl font-bold text-slate-800">
                {isRtl ? "الدخول برقم الجوال" : "Login with Phone"}
              </h2>
              <p className="text-sm text-slate-500">
                {isRtl
                  ? "أدخل رقم جوالك وسنرسل لك رمز تحقق."
                  : "Enter your phone number and we'll send you a verification code."}
              </p>

              {!otpSent ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      {isRtl ? "رقم الجوال" : "Phone Number"}
                    </label>
                    <div className="relative">
                      <Phone className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="tel"
                        placeholder="+966 5XX XXX XXXX"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="rounded-xl ps-10 h-11 border-slate-200 focus:border-emerald-300 focus:ring-emerald-200/50"
                        dir="ltr"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="ms-grad-brand h-12 w-full rounded-xl text-white transition-all duration-200 hover:opacity-90 hover:shadow-lg shadow-emerald-200/50"
                  >
                    {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    {isRtl ? "إرسال رمز التحقق" : "Send OTP"}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      {isRtl ? "رمز التحقق" : "Verification Code"}
                    </label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      className="rounded-xl h-12 text-center text-2xl tracking-[0.5em] font-mono border-slate-200 focus:border-emerald-300 focus:ring-emerald-200/50"
                      dir="ltr"
                      required
                    />
                    <p className="text-xs text-slate-400 text-center mt-2">
                      {isRtl ? `تم إرسال الرمز إلى ${phoneNumber}` : `Code sent to ${phoneNumber}`}
                    </p>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="ms-grad-brand h-12 w-full rounded-xl text-white transition-all duration-200 hover:opacity-90 hover:shadow-lg shadow-emerald-200/50"
                  >
                    {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    {isRtl ? "تأكيد الدخول" : "Verify & Sign In"}
                  </Button>
                  <div className="text-center">
                    {otpCountdown > 0 ? (
                      <p className="text-xs text-slate-400">
                        {isRtl ? `إعادة الإرسال بعد ${otpCountdown} ثانية` : `Resend in ${otpCountdown}s`}
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline transition-colors"
                      >
                        {isRtl ? "إعادة إرسال الرمز" : "Resend Code"}
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ─── EMAIL LOGIN / REGISTER MODE ─── */}
          {(mode === "login" || mode === "register") && (
            <>
              <h2 className="ms-display text-2xl font-bold text-slate-800">
                {mode === "login" ? t("loginTitle") : t("registerTitle")}
              </h2>
              <p className="mt-1.5 mb-2 text-sm text-slate-500">{t("tagline")}</p>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {/* Role selection (register only) */}
                {mode === "register" && (
                  <div className="space-y-2.5">
                    <label className="text-sm font-medium text-slate-700">
                      {t("roleQuestion")}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <RoleOption
                        active={role === "coach"}
                        icon={Users}
                        label={t("roleCoach")}
                        onClick={() => setRole("coach")}
                      />
                      <RoleOption
                        active={role === "trainee"}
                        icon={Activity}
                        label={t("roleTrainee")}
                        onClick={() => setRole("trainee")}
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
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      {t("passwordLabel")}
                    </label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                      >
                        {isRtl ? "نسيت كلمة المرور؟" : "Forgot password?"}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={isRtl ? "٨ أحرف على الأقل" : "At least 8 characters"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="rounded-xl ps-10 pe-10 h-11 border-slate-200 focus:border-emerald-300 focus:ring-emerald-200/50"
                      required
                      minLength={8}
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

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#F8FAFC] px-3 text-slate-400">
                    {isRtl ? "أو" : "or"}
                  </span>
                </div>
              </div>

              {/* Phone Login Button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode("phone")}
                className="h-11 w-full rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
              >
                <Phone className="me-2 h-4 w-4 text-emerald-600" />
                {isRtl ? "الدخول برقم الجوال" : "Login with Phone Number"}
              </Button>

              {/* Switch mode hint */}
              <div className="mt-5 text-center">
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
            </>
          )}

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
