"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/**
 * Patient Login Page
 *
 * Allows patients to access their portal with email and password.
 * Currently shows a "Coming Soon" state since patient auth is being developed.
 */
export default function PatientLoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Patient auth will be implemented in the next phase
    setTimeout(() => {
      setError("Patient portal access is being configured. Please contact your healthcare provider for access credentials.");
      setIsLoading(false);
    }, 1500);
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-8 sm:p-10">
        {/* Back link */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[color:var(--color-muted-foreground)] transition-colors hover:text-[color:var(--color-foreground)]"
        >
          <ArrowLeft className="size-3.5" />
          Back to portal selection
        </Link>

        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-teal-500/10 text-teal-600">
            <User className="size-8" />
          </div>
          <Logo variant="lockup" className="mb-4" />
          <h1 className="text-2xl font-black tracking-tight">Patient Portal</h1>
          <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
            Access your medical records, appointments, and lab results
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2 rounded-xl border border-[color:var(--color-destructive)]/20 bg-[color:var(--color-destructive)]/10 px-3 py-2.5 text-sm text-[color:var(--color-destructive)]"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="patient-email">Email or Patient ID</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
              <Input
                id="patient-email"
                type="email"
                placeholder="patient@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="patient-password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
              <Input
                id="patient-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            variant="brand"
            size="lg"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in to Patient Portal"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-[color:var(--color-muted-foreground)]">
          <p>
            Don&apos;t have an account?{" "}
            <span className="font-medium text-teal-600">
              Contact your healthcare provider
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
