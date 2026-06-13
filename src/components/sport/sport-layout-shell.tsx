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
 * MediSport Standalone Layout Shell
 *
 * Brand identity v1.0 (June 2026):
 * - Official wordmark logo (Medi=pink, Sport=blue, plum runner)
 * - Vital Green primary actions, sticky white header
 * - Confident-glide motion, .medisport-scope for brand fonts (Exo 2 / Cairo)
 * - Full RTL support via logical properties
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
    return <div className="medisport-scope min-h-screen bg-white">{children}</div>;
  }

  return (
    <div className="medisport-scope flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-[var(--color-sport-50)]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-[var(--color-sport-100)] bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo — official wordmark */}
          <Link href={`/${locale}/sport`} className="flex items-center" aria-label="MediSport">
            {/* logo links to MediSport landing (/sport) */}
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
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <Link
              href={switchLocalePath}
              className="ms-glide flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-[var(--color-sport-50)] hover:text-[var(--color-sport-700)]"
              title={locale === "ar" ? "English" : "العربية"}
            >
              <Globe className="h-4 w-4" />
              <span>{locale === "ar" ? "EN" : "ع"}</span>
            </Link>

            {/* User Menu */}
            <DropdownMenu dir={isRtl ? "rtl" : "ltr"}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-lg hover:bg-[var(--color-sport-50)]">
                  <User className="h-4 w-4 text-slate-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRtl ? "start" : "end"} className="w-48">
                <DropdownMenuItem asChild>
                  <Link href={`/${locale}/trainee`}>
                    <Activity className="h-4 w-4 me-2" />
                    {t("myDashboard")}
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href={`/${locale}/console-x7k2/coaches`}>
                      <ShieldCheck className="h-4 w-4 me-2" />
                      {isRtl ? "اعتماد المدربين" : "Coach Verification"}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/${locale}/auth`} className="text-red-600">
                    <LogOut className="h-4 w-4 me-2" />
                    {t("logout")}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-lg"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--color-sport-100)] bg-white/95 backdrop-blur-xl">
            <nav className="flex flex-col p-4 gap-1">
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
      <footer className="border-t border-[var(--color-sport-100)] bg-white/70 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <Image
                src="/images/medisport-icon-192.png"
                alt="MediSport"
                width={28}
                height={28}
                className="h-7 w-7 rounded-lg"
              />
              <span className="text-sm text-slate-500">{t("tagline")}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span>Powered by MediSoft Health</span>
              <span aria-hidden>·</span>
              <span>© 2026</span>
              <span aria-hidden>·</span>
              <Link
                href={`/${locale}/auth`}
                className="ms-glide transition-colors hover:text-[var(--color-sport-700)]"
              >
                {t("login")}
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-[var(--color-sport-100)] bg-white/95 backdrop-blur-xl safe-area-bottom">
        <div className="flex items-center justify-around py-2">
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
      className={`ms-glide flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
        active
          ? "bg-[var(--color-sport-50)] text-[var(--color-sport-700)]"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
      className="ms-glide flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-[var(--color-sport-50)] hover:text-[var(--color-sport-700)]"
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
      className={`ms-glide flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 transition-colors ${
        active ? "text-[var(--color-sport-600)]" : "text-slate-400 hover:text-slate-600"
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? "text-[var(--color-sport-600)]" : ""}`} />
      <span className="text-[10px] font-semibold">{label}</span>
    </Link>
  );
}
