"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  BellOff,
  CheckCheck,
  AlertTriangle,
  Info,
  Heart,
  Pill,
  FileText,
  Clock,
  Trash2,
  Settings,
  Smartphone,
  Mail,
  MessageSquare,
  Volume2,
} from "lucide-react";

interface Notification {
  id: string;
  patientId: number;
  type: string;
  severity: string;
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
  actionUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  channelsSent: string[];
  createdAt: string;
}

interface NotificationsPanelProps {
  patientId?: number;
  compact?: boolean;
}

export function NotificationsPanel({ patientId, compact = false }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "critical">("all");
  const [showSettings, setShowSettings] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!patientId) return;
    try {
      const res = await fetch(
        `/api/mediconnect/notifications?patientId=${patientId}&unreadOnly=${filter === "unread"}`
      );
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount);
      }
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    } finally {
      setLoading(false);
    }
  }, [patientId, filter]);

  useEffect(() => {
    fetchNotifications();
    const poll = setInterval(fetchNotifications, 15000);
    return () => clearInterval(poll);
  }, [fetchNotifications]);

  const markRead = async (notifId: string) => {
    try {
      await fetch("/api/mediconnect/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", notificationId: notifId }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error("Failed to mark read:", e);
    }
  };

  const markAllRead = async () => {
    if (!patientId) return;
    try {
      await fetch("/api/mediconnect/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read", patientId }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (e) {
      console.error("Failed to mark all read:", e);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "info": return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "reading_alert": return <Heart className="h-4 w-4 text-red-500" />;
      case "prescription": return <Pill className="h-4 w-4 text-green-500" />;
      case "lab_result": return <FileText className="h-4 w-4 text-blue-500" />;
      case "appointment": return <Clock className="h-4 w-4 text-purple-500" />;
      default: return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityBg = (severity: string, isRead: boolean) => {
    if (isRead) return "bg-gray-50 dark:bg-gray-900";
    switch (severity) {
      case "critical": return "bg-red-50 dark:bg-red-950 border-r-4 border-r-red-500";
      case "warning": return "bg-amber-50 dark:bg-amber-950 border-r-4 border-r-amber-500";
      default: return "bg-blue-50 dark:bg-blue-950 border-r-4 border-r-blue-500";
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return "الآن";
    if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} دقيقة`;
    if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} ساعة`;
    return date.toLocaleDateString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const filteredNotifs = notifications.filter((n) => {
    if (filter === "critical") return n.severity === "critical" || n.severity === "warning";
    if (filter === "unread") return !n.isRead;
    return true;
  });

  if (compact) {
    return (
      <div className="w-80 max-h-96 overflow-y-auto" dir="rtl">
        <div className="p-3 border-b flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-blue-600" />
            <span className="font-semibold text-sm">الإشعارات</span>
            {unreadCount > 0 && <Badge variant="destructive" className="text-xs">{unreadCount}</Badge>}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs">
              <CheckCheck className="h-3 w-3 ml-1" />
              قراءة الكل
            </Button>
          )}
        </div>
        {filteredNotifs.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            <BellOff className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            لا توجد إشعارات
          </div>
        ) : (
          filteredNotifs.slice(0, 10).map((notif) => (
            <div
              key={notif.id}
              onClick={() => !notif.isRead && markRead(notif.id)}
              className={`p-3 border-b cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${getSeverityBg(notif.severity, notif.isRead)}`}
            >
              <div className="flex items-start gap-2">
                {getSeverityIcon(notif.severity)}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${notif.isRead ? "text-gray-500" : "text-gray-900 dark:text-white"}`}>
                    {notif.titleAr || notif.title}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{notif.bodyAr || notif.body}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{formatTime(notif.createdAt)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <Card dir="rtl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">الإشعارات</CardTitle>
            {unreadCount > 0 && <Badge variant="destructive">{unreadCount} جديد</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllRead}>
                <CheckCheck className="h-4 w-4 ml-1" />
                قراءة الكل
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mt-3">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            الكل
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("unread")}
          >
            غير مقروء
          </Button>
          <Button
            variant={filter === "critical" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("critical")}
          >
            <AlertTriangle className="h-3 w-3 ml-1" />
            مهم
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-4 p-4 rounded-lg border bg-gray-50 dark:bg-gray-900">
            <h4 className="font-semibold text-sm mb-3">إعدادات الإشعارات</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">إشعارات التطبيق (Push)</span>
                </div>
                <Badge variant="outline" className="text-xs text-green-600">مفعّل</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">البريد الإلكتروني</span>
                </div>
                <Badge variant="outline" className="text-xs text-green-600">مفعّل</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">SMS / WhatsApp</span>
                </div>
                <Badge variant="outline" className="text-xs text-green-600">مفعّل</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">أصوات الإشعارات</span>
                </div>
                <Badge variant="outline" className="text-xs text-green-600">مفعّل</Badge>
              </div>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
          ) : filteredNotifs.length === 0 ? (
            <div className="text-center py-8">
              <BellOff className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">لا توجد إشعارات</p>
            </div>
          ) : (
            filteredNotifs.map((notif) => (
              <div
                key={notif.id}
                onClick={() => !notif.isRead && markRead(notif.id)}
                className={`p-3 rounded-lg cursor-pointer hover:shadow-sm transition-all ${getSeverityBg(notif.severity, notif.isRead)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getTypeIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${notif.isRead ? "text-gray-500" : "text-gray-900 dark:text-white"}`}>
                        {notif.titleAr || notif.title}
                      </p>
                      {!notif.isRead && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{notif.bodyAr || notif.body}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-gray-400">{formatTime(notif.createdAt)}</span>
                      {notif.channelsSent.map((ch) => (
                        <Badge key={ch} variant="outline" className="text-[9px] px-1 py-0">
                          {ch === "push" ? "📱" : ch === "email" ? "📧" : ch === "sms" ? "💬" : "🔔"} {ch}
                        </Badge>
                      ))}
                    </div>
                    {notif.actionUrl && (
                      <a
                        href={notif.actionUrl}
                        className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        عرض التفاصيل ←
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
