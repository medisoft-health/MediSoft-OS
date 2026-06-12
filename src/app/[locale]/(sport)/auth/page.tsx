"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Dumbbell,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type AuthMode = "login" | "register";
type UserRole = "trainee" | "coach";

/**
 * MediSport Standalone — Auth Page
 * 
 * Independent authentication flow:
 * - Email-based registration/login
 * - Role selection (Coach / Trainee)
 * - Does NOT require a full MediSoft clinical account
 * - Can link to MediSoft later for medical context access
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
  const [step, setStep] = React.useState<"role" | "credentials">(
    mode === "register" ? "role" : "credentials"
  );
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // Form state
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setStep("credentials");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "register") {
        // Register via Better-Auth
        const res = await fetch("/api/auth/sign-up/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password,
            // Store role in metadata for MediSport
            callbackURL: `/${locale}/sport/${role}`,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || t("authError"));
        }

        toast.success(t("registerSuccess"));
        // Store sport role in localStorage
        localStorage.setItem("medisport-role", role);
        router.push(`/${locale}/sport/onboarding?role=${role}`);
      } else {
        // Login via Better-Auth
        const res = await fetch("/api/auth/sign-in/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            callbackURL: `/${locale}/sport/trainee`,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || t("authError"));
        }

        toast.success(t("loginSuccess"));
        const savedRole = localStorage.getItem("medisport-role") || "trainee";
        router.push(`/${locale}/sport/${savedRole}`);
      }
    } catch (err: any) {
      toast.error(err.message || t("authError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-200/50 mb-3">
            <Dumbbell className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">MediSport</h1>
          <p className="text-sm text-slate-500 mt-1">{t("tagline")}</p>
        </div>

        {/* Role Selection Step (Register only) */}
        {mode === "register" && step === "role" && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-slate-900">{t("selectRole")}</h2>
              <p className="text-sm text-slate-500 mt-1">{t("selectRoleDesc")}</p>
            </div>

            <button
              onClick={() => handleRoleSelect("trainee")}
              className="w-full p-4 rounded-xl border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all duration-200 text-start group"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 group-hover:scale-110 transition-transform">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{t("roleTrainee")}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{t("roleTraineeDesc")}</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleRoleSelect("coach")}
              className="w-full p-4 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200 text-start group"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{t("roleCoach")}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{t("roleCoachDesc")}</p>
                </div>
              </div>
            </button>

            <div className="text-center pt-4">
              <p className="text-sm text-slate-500">
                {t("alreadyHaveAccount")}{" "}
                <button
                  onClick={() => { setMode("login"); setStep("credentials"); }}
                  className="text-emerald-600 font-medium hover:underline"
                >
                  {t("loginHere")}
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Credentials Step */}
        {step === "credentials" && (
          <Card className="border-slate-200 shadow-xl shadow-slate-100/50">
            <CardHeader className="pb-4 pt-6 px-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {mode === "login" ? t("loginTitle") : t("registerTitle")}
                  </h2>
                  {mode === "register" && (
                    <Badge
                      variant="secondary"
                      className={`mt-1 ${role === "coach" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}
                    >
                      {role === "coach" ? t("roleCoach") : t("roleTrainee")}
                    </Badge>
                  )}
                </div>
                {mode === "register" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("role")}
                    className="text-slate-500"
                  >
                    <ArrowLeft className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">{t("fullName")}</label>
                    <div className="relative">
                      <User className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="text"
                        placeholder={t("fullNamePlaceholder")}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="ps-10 rounded-lg"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">{t("emailLabel")}</label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="email"
                      placeholder={t("emailPlaceholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="ps-10 rounded-lg"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">{t("passwordLabel")}</label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={t("passwordPlaceholder")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="ps-10 pe-10 rounded-lg"
                      required
                      minLength={12}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg h-11"
                >
                  {loading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                  {mode === "login" ? t("loginBtn") : t("registerBtn")}
                </Button>
              </form>

              <div className="mt-4 text-center">
                {mode === "login" ? (
                  <p className="text-sm text-slate-500">
                    {t("noAccount")}{" "}
                    <button
                      onClick={() => { setMode("register"); setStep("role"); }}
                      className="text-emerald-600 font-medium hover:underline"
                    >
                      {t("registerHere")}
                    </button>
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">
                    {t("alreadyHaveAccount")}{" "}
                    <button
                      onClick={() => { setMode("login"); setStep("credentials"); }}
                      className="text-emerald-600 font-medium hover:underline"
                    >
                      {t("loginHere")}
                    </button>
                  </p>
                )}
              </div>

              {/* Link to MediSoft */}
              <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400">
                  {t("linkMediSoft")}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
