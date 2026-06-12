"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Dumbbell,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Sun,
  User,
  Users,
  X,
  Globe,
  Trophy,
  Apple,
  Activity,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
 * Features:
 * - Top navigation bar with MediSport branding
 * - Mobile bottom navigation
 * - Language switcher (AR/EN)
 * - User menu with logout
 * - No clinical sidebar — clean fitness-focused design
 */
export function SportLayoutShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("SportStandalone");
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isRtl = locale === "ar";
  const altLocale = locale === "ar" ? "en" : "ar";

  // Build locale-switched path
  const switchLocalePath = React.useMemo(() => {
    if (locale === "ar") {
      return pathname.replace(/^\/ar/, "/en");
    }
    return pathname.replace(/^\/en/, "/ar");
  }, [pathname, locale]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-emerald-100/50 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href={`/${locale}/sport`} className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200/50">
              <Dumbbell className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              MediSport
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink href={`/${locale}/sport`} active={pathname === `/${locale}/sport`}>
              <Home className="h-4 w-4" />
              <span>{t("home")}</span>
            </NavLink>
            <NavLink href={`/${locale}/sport/trainee`} active={pathname.includes("/trainee")}>
              <Activity className="h-4 w-4" />
              <span>{t("trainee")}</span>
            </NavLink>
            <NavLink href={`/${locale}/sport/coach`} active={pathname.includes("/coach")}>
              <Users className="h-4 w-4" />
              <span>{t("coach")}</span>
            </NavLink>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <Link
              href={switchLocalePath}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
              title={locale === "ar" ? "English" : "العربية"}
            >
              <Globe className="h-4 w-4" />
            </Link>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-lg hover:bg-emerald-50">
                  <User className="h-4 w-4 text-slate-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRtl ? "start" : "end"} className="w-48">
                <DropdownMenuItem asChild>
                  <Link href={`/${locale}/sport/trainee`}>
                    <Activity className="h-4 w-4 me-2" />
                    {t("myDashboard")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/${locale}/sport/auth`} className="text-red-600">
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
          <div className="md:hidden border-t border-emerald-100/50 bg-white/95 backdrop-blur-xl">
            <nav className="flex flex-col p-4 gap-1">
              <MobileNavLink href={`/${locale}/sport`} onClick={() => setMobileMenuOpen(false)}>
                <Home className="h-4 w-4" />
                {t("home")}
              </MobileNavLink>
              <MobileNavLink href={`/${locale}/sport/trainee`} onClick={() => setMobileMenuOpen(false)}>
                <Activity className="h-4 w-4" />
                {t("trainee")}
              </MobileNavLink>
              <MobileNavLink href={`/${locale}/sport/coach`} onClick={() => setMobileMenuOpen(false)}>
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

      {/* Footer */}
      <footer className="border-t border-emerald-100/50 bg-white/60 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Dumbbell className="h-4 w-4 text-emerald-500" />
              <span>MediSport — {t("tagline")}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span>© 2026 MediSoft Health</span>
              <span>•</span>
              <Link href={`/${locale}/sport/auth`} className="hover:text-emerald-600 transition-colors">
                {t("login")}
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-emerald-100 bg-white/95 backdrop-blur-xl safe-area-bottom">
        <div className="flex items-center justify-around py-2">
          <BottomNavItem href={`/${locale}/sport`} icon={Home} label={t("home")} active={pathname === `/${locale}/sport`} />
          <BottomNavItem href={`/${locale}/sport/trainee`} icon={Activity} label={t("trainee")} active={pathname.includes("/trainee")} />
          <BottomNavItem href={`/${locale}/sport/coach`} icon={Users} label={t("coach")} active={pathname.includes("/coach")} />
          <BottomNavItem href={`/${locale}/sport/auth`} icon={User} label={t("account")} active={pathname.includes("/auth")} />
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
      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-emerald-50 text-emerald-700"
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
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
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
      className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
        active ? "text-emerald-600" : "text-slate-400 hover:text-slate-600"
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? "text-emerald-600" : ""}`} />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
