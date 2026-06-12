"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  actionUrl: string | null;
  actionLabel: string | null;
  read: boolean;
  createdAt: string;
}

const SEVERITY_ICON: Record<string, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🔵",
};

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `${days} يوم`;
}

export function NotificationBell() {
  const [count, setCount] = React.useState(0);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for unread count every 30 seconds
  const fetchCount = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/count");
      if (res.ok) {
        const data = await res.json();
        setCount(data.count ?? 0);
      }
    } catch { /* silent */ }
  }, []);

  React.useEffect(() => {
    fetchCount();
    intervalRef.current = setInterval(() => {
      if (document.visibilityState === "visible") fetchCount();
    }, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchCount]);

  async function loadNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }

  function handleOpen() {
    setOpen(!open);
    if (!open) loadNotifications();
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read" }),
    });
    setCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", notificationId: id }),
    });
    setCount((c) => Math.max(0, c - 1));
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button onClick={handleOpen} className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Notifications">
        <Bell className="size-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -end-0.5 flex size-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="absolute end-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg sm:w-96">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
              <span className="text-sm font-semibold text-gray-800">الإشعارات</span>
              {count > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                  <Check className="size-3" /> قراءة الكل
                </button>
              )}
            </div>

            {/* Content */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="py-8 text-center text-xs text-gray-400">جاري التحميل...</div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <span className="text-2xl">✨</span>
                  <p className="mt-1 text-xs text-gray-500">لا توجد إشعارات — كل شيء تمام!</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn("border-b border-gray-50 px-4 py-3 hover:bg-gray-50 transition-colors", !n.read && "bg-blue-50/30")}
                    onClick={() => { if (!n.read) markRead(n.id); }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5">{SEVERITY_ICON[n.severity] ?? "🔵"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-900">{n.title}</div>
                        <div className="text-[11px] text-gray-600 mt-0.5">{n.message}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[10px] text-gray-400">{timeAgo(n.createdAt)}</span>
                          {n.actionUrl && (
                            <Link href={n.actionUrl} onClick={() => setOpen(false)}
                              className="flex items-center gap-0.5 text-[10px] text-blue-600 hover:underline">
                              {n.actionLabel ?? "عرض"} <ExternalLink className="size-2.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                      {!n.read && <span className="mt-1 size-2 rounded-full bg-blue-500 shrink-0" />}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-4 py-2 text-center">
              <Link href="/notifications" onClick={() => setOpen(false)} className="text-xs text-blue-600 hover:underline">
                عرض كل الإشعارات
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
