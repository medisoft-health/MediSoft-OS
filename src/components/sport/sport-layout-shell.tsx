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
  UserCircle,
  Dumbbell,
  Compass,
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
 * MediSport Standalone Layout Shell — v3.0 (Enclosed Post-Login Experience)
 *
 * After login, the user enters a fully personalized enclosed world:
 * - Home/Logo → trainee dashboard (NOT the public landing page)
 * - No links to the public marketing page while logged in
 * - Sign Out is the ONLY way to exit the private environment
 * - Public landing page is only shown to unauthenticated visitors
 *
 * Brand identity v2.0 (June 2026):
 * - Official wordmark logo (Medi=pink, Sport=blue, plum runner)
 * - Vital Green primary actions, sticky frosted-glass header
 * - Full RTL support via logical properties
 */
export function SportLayoutShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("SportStandalone");
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { data: session } = useSession();

  // Profile state (avatar + completion)
  const [profileData, setProfileData] = React.useState<{
    avatarUrl?: string;
    completion?: number;
    displayName?: string;
  } | null>(null);

  // Fetch profile for avatar + completion badge
  React.useEffect(() => {
    if (session?.user) {
      fetch("/api/sport?action=my-sport-profile")
        .then((r) => r.json())
        .then((json) => {
          if (json.success && json.data) {
            setProfileData({
              avatarUrl: json.data.avatarUrl || undefined,
              completion: json.data.profileCompletion || json.completion || 0,
              displayName: json.data.displayName || undefined,
            });
          }
        })
        .catch(() => {});
    }
  }, [session?.user]);

  // Platform-owner gate
  const su = session?.user as { role?: string; email?: string } | undefined;
  const isAdmin =
    su?.role === "admin" &&
    (su?.email ?? "").trim().toLowerCase() === "medisoft2022@gmail.com";

  const isRtl = locale === "ar";
  const isLoggedIn = !!session?.user;
  const showCompletionBadge = profileData && (profileData.completion || 0) < 80;

  // The auth/login/onboarding screens are rendered full-screen without the app chrome
  const isAuthRoute = /\/(auth|login|register|onboarding)(\/|$)/.test(pathname);

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

  // ─── ENCLOSED EXPERIENCE: When logged in, Home = trainee dashboard ───
  // When NOT logged in, Home = public landing page (/sport)
  const homeHref = isLoggedIn ? `/${locale}/trainee` : `/${locale}/sport`;

  return (
    <div className="medisport-scope flex min-h-screen flex-col bg-[#F8FAFC]">
      {/* Top Navigation — frosted glass with subtle shadow */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo — goes to private dashboard when logged in */}
          <Link href={homeHref} className="flex items-center" aria-label="MediSport">
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
            {isLoggedIn ? (
              <>
                {/* LOGGED IN: Show only private navigation */}
                <NavLink href={`/${locale}/trainee`} active={pathname === `/${locale}/trainee` || pathname === homeHref}>
                  <Home className="h-4 w-4" />
                  <span>{t("home")}</span>
                </NavLink>
                <NavLink href={`/${locale}/trainee/profile`} active={pathname.includes("/profile")}>
                  <UserCircle className="h-4 w-4" />
                  <span>{isRtl ? "ملفي" : "Profile"}</span>
                </NavLink>
                <NavLink href={`/${locale}/trainee/journey`} active={pathname.includes("/journey")}>
                  <Compass className="h-4 w-4" />
                  <span>{isRtl ? "رحلتي" : "Journey"}</span>
                </NavLink>
                <NavLink href={`/${locale}/trainee/exercises`} active={pathname.includes("/exercises")}>
                  <Dumbbell className="h-4 w-4" />
                  <span>{isRtl ? "التمارين" : "Exercises"}</span>
                </NavLink>
                <NavLink href={`/${locale}/trainee/coaches`} active={pathname.includes("/coaches")}>
                  <Users className="h-4 w-4" />
                  <span>{isRtl ? "المدربين" : "Coaches"}</span>
                </NavLink>
                <NavLink href={`/${locale}/trainee/community`} active={pathname.includes("/community")}>
                  <Activity className="h-4 w-4" />
                  <span>{isRtl ? "المجتمع" : "Community"}</span>
                </NavLink>
                {isAdmin && (
                  <NavLink href={`/${locale}/console-x7k2`} active={pathname.includes("/console")}>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Admin</span>
                  </NavLink>
                )}
              </>
            ) : (
              <>
                {/* NOT LOGGED IN: Show public navigation */}
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
              </>
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
            {isLoggedIn ? (
              <DropdownMenu dir={isRtl ? "rtl" : "ltr"}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative rounded-xl h-9 w-9 overflow-hidden bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all duration-200"
                  >
                    {profileData?.avatarUrl ? (
                      <Image
                        src={profileData.avatarUrl}
                        alt="Avatar"
                        width={36}
                        height={36}
                        className="h-full w-full object-cover rounded-xl"
                      />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                    {/* Orange dot if profile < 80% */}
                    {showCompletionBadge && (
                      <span className="absolute top-0 end-0 h-2.5 w-2.5 rounded-full bg-orange-500 border-2 border-white" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRtl ? "start" : "end"} className="w-56 rounded-xl shadow-lg border-slate-200/80 p-1">
                  <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {profileData?.displayName || session?.user?.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{session?.user?.email}</p>
                    {profileData && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${profileData.completion || 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">
                          {profileData.completion || 0}%
                        </span>
                      </div>
                    )}
                  </div>
                  <DropdownMenuItem asChild className="rounded-lg">
                    <Link href={`/${locale}/trainee`} className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      {isRtl ? "الرئيسية" : "Home"}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg">
                    <Link href={`/${locale}/trainee/profile`} className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4" />
                      {isRtl ? "ملفي الشخصي" : "My Profile"}
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
              {isLoggedIn ? (
                <>
                  {/* LOGGED IN: Private mobile menu */}
                  <MobileNavLink href={`/${locale}/trainee`} onClick={() => setMobileMenuOpen(false)}>
                    <Home className="h-4 w-4" />
                    {isRtl ? "الرئيسية" : "Home"}
                  </MobileNavLink>
                  <MobileNavLink href={`/${locale}/trainee/profile`} onClick={() => setMobileMenuOpen(false)}>
                    <UserCircle className="h-4 w-4" />
                    {isRtl ? "ملفي الشخصي" : "My Profile"}
                  </MobileNavLink>
                  <MobileNavLink href={`/${locale}/trainee/journey`} onClick={() => setMobileMenuOpen(false)}>
                    <Compass className="h-4 w-4" />
                    {isRtl ? "رحلتي" : "My Journey"}
                  </MobileNavLink>
                  <MobileNavLink href={`/${locale}/trainee/exercises`} onClick={() => setMobileMenuOpen(false)}>
                    <Dumbbell className="h-4 w-4" />
                    {isRtl ? "مكتبة التمارين" : "Exercise Library"}
                  </MobileNavLink>
                  <MobileNavLink href={`/${locale}/trainee/coaches`} onClick={() => setMobileMenuOpen(false)}>
                    <Users className="h-4 w-4" />
                    {isRtl ? "المدربين" : "Coaches"}
                  </MobileNavLink>
                  <MobileNavLink href={`/${locale}/trainee/community`} onClick={() => setMobileMenuOpen(false)}>
                    <Activity className="h-4 w-4" />
                    {isRtl ? "المجتمع" : "Community"}
                  </MobileNavLink>
                  {isAdmin && (
                    <MobileNavLink href={`/${locale}/console-x7k2`} onClick={() => setMobileMenuOpen(false)}>
                      <ShieldCheck className="h-4 w-4" />
                      Admin
                    </MobileNavLink>
                  )}
                </>
              ) : (
                <>
                  {/* NOT LOGGED IN: Public mobile menu */}
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
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer — minimal when logged in */}
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
              {!isLoggedIn && (
                <>
                  <span aria-hidden className="text-slate-200">·</span>
                  <Link
                    href={`/${locale}/auth`}
                    className="ms-glide transition-colors hover:text-[var(--color-sport-600)]"
                  >
                    {t("login")}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation — enclosed experience when logged in */}
      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-slate-200/60 bg-white/90 backdrop-blur-xl safe-area-bottom shadow-[0_-1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-around py-2 px-2">
          {isLoggedIn ? (
            <>
              {/* LOGGED IN: Private bottom nav */}
              <BottomNavItem href={`/${locale}/trainee`} icon={Home} label={isRtl ? "الرئيسية" : "Home"} active={pathname === `/${locale}/trainee`} />
              <BottomNavItem href={`/${locale}/trainee/journey`} icon={Compass} label={isRtl ? "رحلتي" : "Journey"} active={pathname.includes("/journey")} />
              <BottomNavItem href={`/${locale}/trainee/exercises`} icon={Dumbbell} label={isRtl ? "التمارين" : "Exercises"} active={pathname.includes("/exercises")} />
              <BottomNavItem href={`/${locale}/trainee/profile`} icon={UserCircle} label={isRtl ? "ملفي" : "Profile"} active={pathname.includes("/profile")} badge={showCompletionBadge} />
              <BottomNavItem href={`/${locale}/trainee/community`} icon={Users} label={isRtl ? "المجتمع" : "Community"} active={pathname.includes("/community")} />
            </>
          ) : (
            <>
              {/* NOT LOGGED IN: Public bottom nav */}
              <BottomNavItem href={`/${locale}/sport`} icon={Home} label={t("home")} active={pathname === `/${locale}/sport`} />
              <BottomNavItem href={`/${locale}/trainee`} icon={Activity} label={t("trainee")} active={pathname.includes("/trainee")} />
              <BottomNavItem href={`/${locale}/coach`} icon={Users} label={t("coach")} active={pathname.includes("/coach")} />
            </>
          )}
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
  badge,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  badge?: boolean;
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
        {(active || badge) && (
          <div className={`absolute -top-0.5 -end-0.5 h-1.5 w-1.5 rounded-full ${badge ? "bg-orange-500" : "bg-emerald-500"}`} />
        )}
      </div>
      <span className={`text-[10px] font-semibold ${active ? "text-emerald-600" : ""}`}>{label}</span>
    </Link>
  );
}
