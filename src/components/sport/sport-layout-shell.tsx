"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Home,
  LogOut,
  Menu,
  User,
  Users,
  X,
  Globe,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * MediSport Standalone Layout Shell — v2.0 UI Upgrade
 *
 * Brand identity v2.0 (June 2026):
 * - Official wordmark logo (Medi=pink, Sport=blue, plum runner)
 * - Vital Green primary actions, sticky frosted-glass header
 * - Confident-glide motion, .medisport-scope for brand fonts (Exo 2 / Cairo)
 * - Full RTL support via logical properties
 * - Softer backgrounds (#F8FAFC), improved spacing, refined shadows
 */
export function SportLayoutShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("SportStandalone");
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { data: session } = useSession();

  // Platform-owner gate: BOTH role=admin AND the pinned owner email.
  // (UI-only convenience; real enforcement is server-side + API.)
  const su = session?.user as { role?: string; email?: string } | undefined;
  const isAdmin =
    su?.role === "admin" &&
    (su?.email ?? "").trim().toLowerCase() === "medisoft2022@gmail.com";

  const isRtl = locale === "ar";

  // The auth/login screen is rendered full-screen without the app chrome
  // (no top-nav, footer, or bottom-nav) for a clean, focused entry point.
  const isAuthRoute = /\/(auth|login|register)(\/|$)/.test(pathname);

  // Build locale-switched path
  const switchLocalePath = React.useMemo(() => {
    if (locale === "ar") {
      return pathname.replace(/^\/ar/, "/en");
    }
    return pathname.replace(/^\/en/, "/ar");
  }, [pathname, locale]);

  if (isAuthRoute) {
    return <div className="medisport-scope min-h-screen bg-[#F8FAFC]">{children}</div>;
  }

  return (
    <div className="medisport-scope flex min-h-screen flex-col bg-[#F8FAFC]">
      {/* Top Navigation — frosted glass with subtle shadow */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo — official wordmark */}
          <Link href={`/${locale}/sport`} className="flex items-center" aria-label="MediSport">
            <Image
              src="/images/medisport-wordmark.png"
              alt="MediSport"
              width={158}
              height={27}
              priority
              className="h-7 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink href={`/${locale}/sport`} active={pathname === `/${locale}/sport`}>
              <Home className="h-4 w-4" />
              <span>{t("home")}</span>
            </NavLink>
            <NavLink href={`/${locale}/trainee`} active={pathname.includes("/trainee")}>
              <Activity className="h-4 w-4" />
              <span>{t("trainee")}</span>
            </NavLink>
            <NavLink href={`/${locale}/coach`} active={pathname.includes("/coach")}>
              <Users className="h-4 w-4" />
              <span>{t("coach")}</span>
            </NavLink>
            {isAdmin && (
              <NavLink href={`/${locale}/console-x7k2`} active={pathname.includes("/console")}>
                <ShieldCheck className="h-4 w-4" />
                <span>Admin</span>
              </NavLink>
            )}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <Link
              href={switchLocalePath}
              className="ms-glide flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700"
              title={locale === "ar" ? "English" : "العربية"}
            >
              <Globe className="h-4 w-4" />
            </Link>

            {/* User Menu */}
            {session?.user ? (
              <DropdownMenu dir={isRtl ? "rtl" : "ltr"}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl h-9 w-9 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all duration-200"
                  >
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRtl ? "start" : "end"} className="w-56 rounded-xl shadow-lg border-slate-200/80 p-1">
                  <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{session.user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
                  </div>
                  <DropdownMenuItem asChild className="rounded-lg">
                    <Link href={`/${locale}/trainee`} className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      {t("myDashboard")}
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild className="rounded-lg">
                      <Link href={`/${locale}/console-x7k2/coaches`} className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        {isRtl ? "اعتماد المدربين" : "Coach Verification"}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="rounded-lg text-red-600 focus:text-red-700 focus:bg-red-50"
                    onClick={async () => {
                      await fetch("/api/auth/sign-out", { method: "POST" });
                      window.location.href = `/${locale}/auth`;
                    }}
                  >
                    <LogOut className="h-4 w-4 me-2" />
                    {t("logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href={`/${locale}/auth`}>
                <Button
                  size="sm"
                  className="ms-glide rounded-xl bg-[var(--color-sport-600)] text-white hover:bg-[var(--color-sport-700)] shadow-sm shadow-emerald-200/50 transition-all duration-200"
                >
                  {t("login")}
                </Button>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-xl h-9 w-9"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu — slide down with animation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white/98 backdrop-blur-xl">
            <nav className="flex flex-col p-3 gap-0.5">
              <MobileNavLink href={`/${locale}/sport`} onClick={() => setMobileMenuOpen(false)}>
                <Home className="h-4 w-4" />
                {t("home")}
              </MobileNavLink>
              <MobileNavLink href={`/${locale}/trainee`} onClick={() => setMobileMenuOpen(false)}>
                <Activity className="h-4 w-4" />
                {t("trainee")}
              </MobileNavLink>
              <MobileNavLink href={`/${locale}/coach`} onClick={() => setMobileMenuOpen(false)}>
                <Users className="h-4 w-4" />
                {t("coach")}
              </MobileNavLink>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer — Powered by MediSoft Health endorsement */}
      <footer className="border-t border-slate-200/60 bg-white/60 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <Image
                src="/images/medisport-icon-192.png"
                alt="MediSoft"
                width={28}
                height={28}
                className="h-7 w-7 rounded-xl"
              />
              <span className="text-sm text-slate-500">{t("tagline")}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="font-medium">Powered by MediSoft Health</span>
              <span aria-hidden className="text-slate-200">·</span>
              <span>© 2026</span>
              <span aria-hidden className="text-slate-200">·</span>
              <Link
                href={`/${locale}/auth`}
                className="ms-glide transition-colors hover:text-[var(--color-sport-600)]"
              >
                {t("login")}
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation — frosted glass with refined shadow */}
      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-slate-200/60 bg-white/90 backdrop-blur-xl safe-area-bottom shadow-[0_-1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-around py-2 px-2">
          <BottomNavItem href={`/${locale}/sport`} icon={Home} label={t("home")} active={pathname === `/${locale}/sport`} />
          <BottomNavItem href={`/${locale}/trainee`} icon={Activity} label={t("trainee")} active={pathname.includes("/trainee")} />
          <BottomNavItem href={`/${locale}/coach`} icon={Users} label={t("coach")} active={pathname.includes("/coach")} />
          <BottomNavItem href={`/${locale}/auth`} icon={User} label={t("account")} active={pathname.includes("/auth")} />
        </div>
      </nav>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`ms-glide flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 ${
        active
          ? "bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100/50"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="ms-glide flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-emerald-50/60 hover:text-emerald-700 active:scale-[0.98]"
    >
      {children}
    </Link>
  );
}

function BottomNavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`ms-glide flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 transition-all duration-200 ${
        active ? "text-emerald-600" : "text-slate-400 hover:text-slate-600"
      }`}
    >
      <div className="relative">
        <Icon className={`h-5 w-5 ${active ? "text-emerald-600" : ""}`} />
        {active && (
          <div className="absolute -top-0.5 -end-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
        )}
      </div>
      <span className={`text-[10px] font-semibold ${active ? "text-emerald-700" : ""}`}>{label}</span>
    </Link>
  );
}
