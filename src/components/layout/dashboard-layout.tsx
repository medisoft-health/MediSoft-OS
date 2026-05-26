"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import {
  GlobalSearchProvider,
  useGlobalSearch,
} from "@/components/global-search";
import { LocaleSwitcher } from "@/components/clinical/locale-switcher";
import { ModuleLogo, type ModuleKey } from "@/components/brand/module-logo";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** When set, shows the real brand logo instead of the Lucide icon (expanded sidebar only). */
  moduleKey?: ModuleKey;
  badge?: { text: string; variant: "info" | "warning" | "success" };
  ai?: boolean;
};

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  {
    href: "/mediscript",
    label: "MediScript",
    icon: Mic,
    moduleKey: "mediscript",
    ai: true,
    badge: { text: "AI", variant: "info" },
  },
  { href: "/pharmax", label: "PharmaX", icon: Pill, moduleKey: "pharmax", ai: true },
  { href: "/medilab", label: "MediLab", icon: FlaskConical, moduleKey: "medilab", ai: true },
  { href: "/mediscan", label: "MediScan", icon: ScanLine, moduleKey: "mediscan", ai: true },
  { href: "/diagnosis", label: "Diagnosis", icon: Brain, ai: true },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
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
      <DashboardShell user={user}>{children}</DashboardShell>
    </GlobalSearchProvider>
  );
}

function DashboardShell({ children, user }: DashboardLayoutProps) {
  const pathname = usePathname();
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
          : "Could not sign out. Please try again.";
      toast.error(message);
      setSigningOut(false);
    }
  }, [signingOut]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[color:var(--color-background)]">
      {/* ─────────────── Desktop sidebar ─────────────── */}
      <aside
        className={cn(
          "hidden h-full lg:flex flex-col border-e border-[color:var(--color-sidebar-border)] bg-[color:var(--color-sidebar)] transition-[width] duration-200",
          collapsed ? "w-[72px]" : "w-[260px]",
        )}
        aria-label="Primary navigation"
      >
        <SidebarContent
          collapsed={collapsed}
          pathname={pathname}
          user={user}
          signingOut={signingOut}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* ─────────────── Mobile sidebar (drawer) ─────────────── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[280px] gap-0 border-e border-[color:var(--color-sidebar-border)] bg-[color:var(--color-sidebar)] p-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Main navigation</SheetTitle>
            <SheetDescription>MediSoft clinical modules</SheetDescription>
          </SheetHeader>
          <SidebarContent
            collapsed={false}
            pathname={pathname}
            user={user}
            signingOut={signingOut}
            onSignOut={handleSignOut}
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
            aria-label="Open navigation"
            className="lg:hidden"
          >
            <Menu className="size-5" />
          </Button>

          {/* Desktop collapse toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Toggle sidebar"
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
      </div>
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
}: {
  collapsed: boolean;
  pathname: string;
  user?: DashboardLayoutProps["user"];
  signingOut: boolean;
  onSignOut: () => void;
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
        {!collapsed && (
          <div className="mb-2 mt-1 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
            Clinical
          </div>
        )}
        {NAV.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
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
              title={collapsed ? item.label : undefined}
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
                <ModuleLogo module={item.moduleKey} height={20} className="shrink-0" />
              )}
              {!collapsed && (
                <>
                  {/* Hide the text label when showing a module logo — the logo IS the label */}
                  {!item.moduleKey && (
                    <span className="flex-1 truncate">{item.label}</span>
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

        {!collapsed && (
          <>
            <div className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
              System
            </div>
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                pathname.startsWith("/settings")
                  ? "bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]"
                  : "text-[color:var(--color-sidebar-foreground)] hover:bg-[color:var(--color-sidebar-accent)]",
              )}
            >
              <Settings className="size-[18px]" strokeWidth={2} />
              <span>Settings</span>
            </Link>
          </>
        )}
      </nav>

      {/* Upgrade card */}
      {!collapsed && (
        <div className="m-3 rounded-2xl grad-brand p-4 text-white">
          <div className="text-xs opacity-90">Inspiring Minds</div>
          <div className="font-[family-name:var(--font-script)] text-xl">
            Upgrade Pro
          </div>
          <button className="mt-3 w-full rounded-lg bg-white/20 py-1.5 text-xs font-semibold backdrop-blur transition-colors hover:bg-white/30">
            Learn more
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
                {user?.name ?? "Sign in"}
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
              aria-label="Sign out"
              title="Sign out"
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
      aria-label="Open global search"
    >
      <Search className="size-4 shrink-0" />
      <span className="hidden truncate sm:inline">Search patients…</span>
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
