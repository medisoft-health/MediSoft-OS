import { requireSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { getNotifications } from "@/lib/notifications/notification-engine";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getTranslations } from "next-intl/server";


export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata = { title: "Notifications | MediSoft C-OS" };

export default async function NotificationsPage() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");

  const t = await getTranslations("Notifications");
  const notifications = await getNotifications(session.user.id, { limit: 50 });

  const severityIcon: Record<string, string> = { critical: "🔴", high: "🟠", medium: "🟡", low: "🔵" };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-600">{notifications.length} {t("notificationCount")}</p>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <span className="text-3xl">✨</span>
            <p className="mt-2 text-sm text-gray-500">{t("noNotifications")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card key={n.id} className={n.read ? "opacity-60" : ""}>
              <CardContent className="flex items-start gap-3 p-4">
                <span className="text-lg mt-0.5">{severityIcon[n.severity] ?? "🔵"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{n.title}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{n.message}</div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="text-[10px] text-gray-400">{n.createdAt.toLocaleDateString("ar-SA")}</span>
                    {n.actionUrl && (
                      <Link href={n.actionUrl} className="text-[10px] text-blue-600 hover:underline">
                        {n.actionLabel ?? t("viewAction")}
                      </Link>
                    )}
                    <Badge variant="outline" className="text-[9px]">{n.type}</Badge>
                  </div>
                </div>
                {!n.read && <span className="size-2.5 rounded-full bg-blue-500 shrink-0 mt-2" />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
