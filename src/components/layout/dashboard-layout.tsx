"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Users,
  Mic,
  Pill,
  FlaskConical,
  ScanLine,
  Brain,
  BarChart3,
  Settings,
  LogOut,
  Search,
  PanelLeft,
  Menu,
  Sparkles,
  CalendarDays,
  Receipt,
  ClipboardList,
  Bot,
  Stethoscope,
  HeartPulse,
  AudioLines,
  Globe,
  Cable,
  UserCircle,
  Bell,
  Activity,
  CircleDot,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn, getInitials } from "@/lib/utils";
import { signOut } from "@/lib/auth-client";
import { toast } from "sonner";
import { NewPatientButton } from "@/components/clinical/new-patient-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { MediBotPanel, MediBotProvider } from "@/components/medibot";
import { MediBotPatientDetector } from "@/components/medibot/use-patient-route";
import {
  GlobalSearchProvider,
  useGlobalSearch,
} from "@/components/global-search";
import { LocaleSwitcher } from "@/components/clinical/locale-switcher";
import { ModuleLogo, type ModuleKey } from "@/components/brand/module-logo";

type NavItemDef = {
  href: string;
  /** Translation key under the "Nav" namespace */
  tKey: string;
  icon: typeof LayoutDashboard;
  moduleKey?: ModuleKey;
  badge?: { text: string; variant: "info" | "warning" | "success" };
  ai?: boolean;
  /** Translation key for section header (under "Nav" namespace) */
  sectionTKey?: string;
};

const NAV: NavItemDef[] = [
  // ── CLINICAL ──
  { href: "/", tKey: "dashboard", icon: LayoutDashboard, sectionTKey: "sectionClinical" },
  { href: "/patients", tKey: "patients", icon: Users },
  { href: "/medi360", tKey: "medi360", icon: CircleDot, moduleKey: "medi360", ai: true, badge: { text: "UPP", variant: "success" } },
  { href: "/encounters", tKey: "encounters", icon: ClipboardList },
  { href: "/appointments", tKey: "appointments", icon: CalendarDays },
  {
    href: "/mediscript",
    tKey: "mediscript",
    icon: Mic,
    moduleKey: "mediscript",
    ai: true,
    badge: { text: "MI", variant: "info" },
  },
  { href: "/pharmax", tKey: "pharmax", icon: Pill, moduleKey: "pharmax", ai: true },
  { href: "/medilab", tKey: "medilab", icon: FlaskConical, moduleKey: "medilab", ai: true },
  { href: "/mediscan", tKey: "mediscan", icon: ScanLine, moduleKey: "mediscan", ai: true },
  { href: "/diagnosis", tKey: "diagnosis", icon: Brain, ai: true },
  { href: "/billing", tKey: "billing", icon: Receipt },
  // ── AI AGENTS ──
  { href: "/co-clinician", tKey: "coClinician", icon: Stethoscope, sectionTKey: "sectionAgents", ai: true, badge: { text: "MI", variant: "info" } },
  { href: "/ai-nurse", tKey: "aiNurse", icon: HeartPulse, ai: true, badge: { text: "MI", variant: "info" } },
  { href: "/ai-receptionist", tKey: "aiReceptionist", icon: Bot, ai: true, badge: { text: "MI", variant: "info" } },
  { href: "/ai-interpreter", tKey: "aiInterpreter", icon: Globe, ai: true, badge: { text: "MI", variant: "info" } },
  { href: "/ambient-scribe", tKey: "ambientScribe", icon: AudioLines, ai: true, badge: { text: "MI", variant: "info" } },
  // ── SPORTS MEDICINE ──
  { href: "/medisport", tKey: "medisport", icon: Activity, moduleKey: "medisport", sectionTKey: "sectionSportsMed", ai: true, badge: { text: "NEW", variant: "success" } },
  // ── DENTAL ──
  { href: "/medident", tKey: "medident", icon: Sparkles, moduleKey: "medident", sectionTKey: "sectionDental", ai: true, badge: { text: "NEW", variant: "success" } },
  // ── INTEGRATIONS ──
  { href: "/health-connect", tKey: "healthConnect", icon: Cable },
  { href: "/patient-portal", tKey: "patientPortal", icon: UserCircle },
  // ── SYSTEM ──
  { href: "/analytics", tKey: "analytics", icon: BarChart3, sectionTKey: "sectionSystem" },
  { href: "/notifications", tKey: "notifications", icon: Bell },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email: string;
    role: "physician" | "admin";
    specialty?: string | null;
  };
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  return (
    <GlobalSearchProvider>
      <MediBotProvider>
        <DashboardShell user={user}>{children}</DashboardShell>
      </MediBotProvider>
    </GlobalSearchProvider>
  );
}

function DashboardShell({ children, user }: DashboardLayoutProps) {
  const pathname = usePathname();
  const t = useTranslations("Nav");
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  // Close mobile drawer on route change.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleSignOut = React.useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = "/login";
          },
        },
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t("signOutError");
      toast.error(message);
      setSigningOut(false);
    }
  }, [signingOut, t]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[color:var(--color-background)]">
      {/* ─────────────── Desktop sidebar ─────────────── */}
      <aside
        className={cn(
          "hidden h-full lg:flex flex-col border-e border-[color:var(--color-sidebar-border)] bg-[color:var(--color-sidebar)] transition-[width] duration-200",
          collapsed ? "w-[72px]" : "w-[260px]",
        )}
        aria-label={t("mainNavigation")}
      >
        <SidebarContent
          collapsed={collapsed}
          pathname={pathname}
          user={user}
          signingOut={signingOut}
          onSignOut={handleSignOut}
          t={t}
        />
      </aside>

      {/* ─────────────── Mobile sidebar (drawer) ─────────────── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[280px] gap-0 border-e border-[color:var(--color-sidebar-border)] bg-[color:var(--color-sidebar)] p-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{t("mainNavigation")}</SheetTitle>
            <SheetDescription>{t("clinicalModulesDesc")}</SheetDescription>
          </SheetHeader>
          <SidebarContent
            collapsed={false}
            pathname={pathname}
            user={user}
            signingOut={signingOut}
            onSignOut={handleSignOut}
            t={t}
          />
        </SheetContent>
      </Sheet>

      {/* ─────────────── Main column ─────────────── */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-2 border-b border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 sm:px-4 md:px-6">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label={t("openNavigation")}
            className="lg:hidden"
          >
            <Menu className="size-5" />
          </Button>

          {/* Desktop collapse toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={t("toggleSidebar")}
            className="hidden lg:inline-flex"
          >
            <PanelLeft className="size-4" />
          </Button>

          <SearchTrigger />

          <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
            <LocaleSwitcher />
            <NotificationBell />
            <NewPatientButton />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
        <MediBotPatientDetector />
      </div>

      {/* ─────────────── MediBot Panel (persistent right column) ─────────────── */}
      <MediBotPanel />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sidebar content (shared between desktop aside and mobile sheet)
// ─────────────────────────────────────────────────────────────────
function SidebarContent({
  collapsed,
  pathname,
  user,
  signingOut,
  onSignOut,
  t,
}: {
  collapsed: boolean;
  pathname: string;
  user?: DashboardLayoutProps["user"];
  signingOut: boolean;
  onSignOut: () => void;
  t: ReturnType<typeof useTranslations<"Nav">>;
}) {
  return (
    <>
      {/* Brand header */}
      <div className="flex h-16 items-center gap-2 border-b border-[color:var(--color-sidebar-border)] px-4">
        {collapsed ? (
          <Logo variant="mark" className="size-8" />
        ) : (
          <Logo variant="lockup" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map((item, idx) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          const label = t(item.tKey as Parameters<typeof t>[0]);
          return (
            <React.Fragment key={item.href}>
              {/* Section header */}
              {item.sectionTKey && !collapsed && (
                <div className={cn("mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]", idx > 0 && "mt-5")}>
                  {t(item.sectionTKey as Parameters<typeof t>[0])}
                </div>
              )}
              <Link
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]"
                    : "text-[color:var(--color-sidebar-foreground)] hover:bg-[color:var(--color-sidebar-accent)]",
                )}
                title={collapsed ? label : undefined}
              >
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute -start-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full grad-pink-navy"
                  />
                )}
                {/* Show Lucide icon when collapsed; show brand logo when expanded + moduleKey exists */}
                {collapsed || !item.moduleKey ? (
                  <Icon className="size-[18px] shrink-0" strokeWidth={2} />
                ) : (
                  <ModuleLogo module={item.moduleKey} height={24} maxWidth={160} sidebarMode className="shrink-0" />
                )}
                {!collapsed && (
                  <>
                    {/* Hide the text label when showing a module logo — the logo IS the label */}
                    {!item.moduleKey && (
                      <span className="flex-1 truncate">{label}</span>
                    )}
                    {item.moduleKey && <span className="flex-1" />}
                    {item.ai && (
                      <Sparkles className="size-3.5 text-[color:var(--color-brand-cyan)]" />
                    )}
                    {item.badge && (
                      <Badge
                        variant={item.badge.variant}
                        className="ms-auto px-1.5 py-0 text-[9px]"
                      >
                        {item.badge.text}
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            </React.Fragment>
          );
        })}

        {/* Settings — always at the bottom of nav */}
        {!collapsed && (
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors mt-2",
              pathname.startsWith("/settings")
                ? "bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]"
                : "text-[color:var(--color-sidebar-foreground)] hover:bg-[color:var(--color-sidebar-accent)]",
            )}
          >
            <Settings className="size-[18px]" strokeWidth={2} />
            <span>{t("settings")}</span>
          </Link>
        )}
      </nav>

      {/* Upgrade card */}
      {!collapsed && (
        <div className="m-3 rounded-2xl grad-brand p-4 text-white">
          <div className="text-xs opacity-90">{t("upgradeTagline")}</div>
          <div className="font-[family-name:var(--font-script)] text-xl">
            {t("upgradePro")}
          </div>
          <button className="mt-3 w-full rounded-lg bg-white/20 py-1.5 text-xs font-semibold backdrop-blur transition-colors hover:bg-white/30">
            {t("learnMore")}
          </button>
        </div>
      )}

      {/* User footer */}
      <div className="border-t border-[color:var(--color-sidebar-border)] p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl p-2",
            collapsed && "justify-center",
          )}
        >
          <div className="grid size-9 shrink-0 place-items-center rounded-xl grad-pink-navy text-xs font-bold text-white">
            {user ? getInitials(user.name) : "—"}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {user?.name ?? t("signIn")}
              </div>
              <div className="truncate text-[11px] text-[color:var(--color-muted-foreground)]">
                {user?.specialty ?? user?.role ?? ""}
              </div>
            </div>
          )}
          {!collapsed && user && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={t("signOutLabel")}
              title={t("signOutLabel")}
              onClick={onSignOut}
              disabled={signingOut}
            >
              <LogOut className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// Search trigger — opens the Cmd+K palette
// ─────────────────────────────────────────────────────────────────
function SearchTrigger() {
  const { openSearch } = useGlobalSearch();
  const t = useTranslations("Nav");
  const [isMac, setIsMac] = React.useState(false);

  React.useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
    }
  }, []);

  return (
    <button
      type="button"
      onClick={openSearch}
      className={cn(
        "group relative ms-1 flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[color:var(--color-input)] bg-[color:var(--color-card)] px-3 text-sm transition-colors",
        "max-w-md text-[color:var(--color-muted-foreground)]",
        "hover:border-[color:var(--color-brand-pink)] hover:text-[color:var(--color-foreground)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-1",
      )}
      aria-label={t("searchPlaceholder")}
    >
      <Search className="size-4 shrink-0" />
      <span className="hidden truncate sm:inline">{t("searchPatientsShort")}</span>
      <span className="ms-auto hidden items-center gap-1 sm:flex">
        <kbd className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/40 px-1.5 py-0.5 text-[10px] font-mono">
          {isMac ? "⌘" : "Ctrl"}
        </kbd>
        <kbd className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/40 px-1.5 py-0.5 text-[10px] font-mono">
          K
        </kbd>
      </span>
    </button>
  );
}
