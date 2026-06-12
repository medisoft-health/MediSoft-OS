"use client";

/**
 * MediSport Phase 7 — CoachNotificationBell (shared, DB-backed)
 *
 * A self-contained notification bell for the coach dashboard. Polls the
 * `/api/sport?action=my-notifications` feed, shows an unread badge, and lets
 * the coach mark items as read. Used by both the standalone `(sport)` coach
 * page and (optionally) the integrated module — true mirroring.
 */

import * as React from "react";
import { Bell, CheckCheck, Activity, FlaskConical, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SportNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "body-measurement": Scale,
  "lab-result": FlaskConical,
  activity: Activity,
};

export function CoachNotificationBell({ locale = "en" }: { locale?: "ar" | "en" }) {
  const isAr = locale === "ar";
  const [items, setItems] = React.useState<SportNotification[]>([]);
  const [unread, setUnread] = React.useState(0);
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/sport?action=my-notifications");
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) {
        setItems(json.data || []);
        setUnread(json.unreadCount || 0);
      }
    } catch {
      /* silent */
    }
  }, []);

  React.useEffect(() => {
    load();
    const t = setInterval(load, 60_000); // poll every minute
    return () => clearInterval(t);
  }, [load]);

  const markAll = async () => {
    try {
      await fetch("/api/sport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-notifications-read" }),
      });
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    } catch {
      /* silent */
    }
  };

  const t = (ar: string, en: string) => (isAr ? ar : en);

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("الآن", "now");
    if (mins < 60) return t(`منذ ${mins} د`, `${mins}m ago`);
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t(`منذ ${hrs} س`, `${hrs}h ago`);
    const days = Math.floor(hrs / 24);
    return t(`منذ ${days} يوم`, `${days}d ago`);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} dir={isAr ? "rtl" : "ltr"}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t("الإشعارات", "Notifications")}>
          <Bell className="h-5 w-5 text-slate-600" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isAr ? "start" : "end"} className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold text-slate-800">{t("الإشعارات", "Notifications")}</span>
          {unread > 0 && (
            <button
              onClick={markAll}
              className="flex items-center gap-1 text-xs text-emerald-700 hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t("تعليم الكل كمقروء", "Mark all read")}
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-400">
              {t("لا توجد إشعارات بعد", "No notifications yet")}
            </p>
          ) : (
            items.map((n) => {
              const Icon = ICONS[n.type] || Bell;
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 border-b px-3 py-3 ${n.isRead ? "bg-white" : "bg-emerald-50/60"}`}
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <Icon className="h-4 w-4 text-emerald-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{n.title}</p>
                    {n.body && <p className="truncate text-xs text-slate-500">{n.body}</p>}
                    <p className="mt-0.5 text-[11px] text-slate-400">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default CoachNotificationBell;
