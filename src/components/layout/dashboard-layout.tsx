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
  ChevronDown,
  MessageSquare,
  Video,
  Rocket,
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
import { PatientChatbot } from "@/components/patient-chatbot";
import { MediBotPatientDetector } from "@/components/medibot/use-patient-route";
import {
  GlobalSearchProvider,
  useGlobalSearch,
} from "@/components/global-search";
import { LocaleSwitcher } from "@/components/clinical/locale-switcher";
import { AdaptiveProvider } from "@/components/ui/adaptive-context";
import { ModuleLogo, type ModuleKey } from "@/components/brand/module-logo";
import { ContextSwitcher } from "@/components/ui/context-switcher";

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
  // ── COMMUNICATION ──
  { href: "/mediconnect", tKey: "mediconnect", icon: MessageSquare, sectionTKey: "sectionCommunication", badge: { text: "NEW", variant: "success" } },
  { href: "/telemedicine", tKey: "telemedicine", icon: Video, badge: { text: "NEW", variant: "success" } },
  { href: "/health-connect", tKey: "healthConnect", icon: Cable },
  { href: "/patient-portal", tKey: "patientPortal", icon: UserCircle },
  // ── INNOVATION ──
  { href: "/innovation", tKey: "innovation", icon: Rocket, sectionTKey: "sectionInnovation", badge: { text: "NEW", variant: "success" } },
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
    <AdaptiveProvider>
      <GlobalSearchProvider>
        <MediBotProvider>
          <DashboardShell user={user}>{children}</DashboardShell>
        </MediBotProvider>
      </GlobalSearchProvider>
    </AdaptiveProvider>
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

          {/* Clinical context mode switcher */}
          <ContextSwitcher className="hidden md:flex" />

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

      {/* ─────────────── Patient AI Chatbot (floating) ─────────────── */}
      <PatientChatbot floating />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sidebar content (shared between desktop aside and mobile sheet)
// ─────────────────────────────────────────────────────────────────

/** Group NAV items into sections for collapsible rendering */
function groupNavItems(nav: NavItemDef[]) {
  const sections: { tKey: string | null; items: NavItemDef[] }[] = [];
  for (const item of nav) {
    if (item.sectionTKey) {
      sections.push({ tKey: item.sectionTKey, items: [item] });
    } else {
      if (sections.length === 0) {
        sections.push({ tKey: null, items: [] });
      }
      sections[sections.length - 1].items.push(item);
    }
  }
  return sections;
}

const NAV_SECTIONS = groupNavItems(NAV);

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
  const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(new Set());

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV_SECTIONS.map((section, sIdx) => {
          const sectionKey = section.tKey ?? "__default";
          const isSectionCollapsed = collapsedSections.has(sectionKey);

          return (
            <div key={sectionKey}>
              {/* Section header */}
              {section.tKey && (
                <>
                  {collapsed ? (
                    <div className={cn("my-3 h-px bg-[color:var(--color-sidebar-border)]", sIdx === 0 && "mt-0")} />
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleSection(sectionKey)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)] transition-colors hover:text-[color:var(--color-foreground)]",
                        sIdx > 0 && "mt-4",
                      )}
                    >
                      <span>{t(section.tKey as Parameters<typeof t>[0])}</span>
                      <ChevronDown className={cn("size-3 transition-transform", isSectionCollapsed && "-rotate-90")} />
                    </button>
                  )}
                </>
              )}

              {/* Section items */}
              {(!isSectionCollapsed || collapsed) && (
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive =
                      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    const label = t(item.tKey as Parameters<typeof t>[0]);
                    return (
                      <Link
                        key={item.href}
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
                        {collapsed || !item.moduleKey ? (
                          <Icon className="size-[18px] shrink-0" strokeWidth={2} />
                        ) : (
                          <ModuleLogo module={item.moduleKey} height={24} maxWidth={160} sidebarMode className="shrink-0" />
                        )}
                        {!collapsed && (
                          <>
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
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Settings — always visible, including when sidebar is collapsed */}
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors mt-2",
            pathname.startsWith("/settings")
              ? "bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]"
              : "text-[color:var(--color-sidebar-foreground)] hover:bg-[color:var(--color-sidebar-accent)]",
            collapsed && "justify-center",
          )}
          title={collapsed ? t("settings") : undefined}
        >
          <Settings className="size-[18px]" strokeWidth={2} />
          {!collapsed && <span>{t("settings")}</span>}
        </Link>
      </nav>

      {/* Upgrade card */}
      {!collapsed && (
        <div className="m-3 rounded-2xl grad-brand p-4 text-white">
          <div className="text-xs opacity-90">{t("upgradeTagline")}</div>
          <div className="font-[family-name:var(--font-script)] text-xl">
            {t("upgradePro")}
          </div>
          <Link
            href="/settings"
            className="mt-3 flex w-full items-center justify-center rounded-lg bg-white/20 py-1.5 text-xs font-semibold backdrop-blur transition-colors hover:bg-white/30"
          >
            {t("learnMore")}
          </Link>
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
