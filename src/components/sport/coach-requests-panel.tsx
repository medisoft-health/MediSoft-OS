"use client";

/**
 * MediSport — Coach Requests Panel (Phase 8, discovery & linking)
 *
 * Shared mirrored component shown on the coach dashboard. Lists PENDING trainee
 * connection requests and lets the coach accept (creates an active coach↔client
 * link) or decline. Hidden entirely when there are no pending requests.
 *
 *   GET  /api/sport?action=my-coach-requests
 *   POST /api/sport { action: "respond-coach-request", requestId, accept }
 */

import * as React from "react";
import { UserPlus, Check, X, Loader2, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface IncomingRequest {
  id: string;
  traineeId: string;
  traineeName: string | null;
  traineeEmail: string | null;
  status: string;
  message: string | null;
  initiator: string;
  createdAt: string;
}

export function CoachRequestsPanel({ locale = "ar" }: { locale?: string }) {
  const isAr = locale === "ar";
  const [requests, setRequests] = React.useState<IncomingRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sport?action=my-coach-requests", {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setRequests(json.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const respond = async (requestId: string, accept: boolean) => {
    setBusy(requestId);
    try {
      const res = await fetch("/api/sport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "respond-coach-request",
          requestId,
          accept,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          accept
            ? isAr
              ? "تم قبول المتدرب وإضافته لقائمتك"
              : "Trainee accepted and added"
            : isAr
              ? "تم رفض الطلب"
              : "Request declined"
        );
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
      } else {
        toast.error(isAr ? "تعذّر تنفيذ الإجراء" : "Action failed");
      }
    } catch {
      toast.error(isAr ? "خطأ في الاتصال" : "Network error");
    } finally {
      setBusy(null);
    }
  };

  // Hidden when nothing pending (keeps the dashboard clean)
  if (loading) {
    return (
      <div className="flex items-center justify-center py-4 text-slate-300">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (requests.length === 0) return null;

  return (
    <Card className="border-emerald-200 bg-emerald-50/40">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Inbox className="h-4 w-4 text-emerald-600" />
          {isAr ? "طلبات تدريب جديدة" : "New coaching requests"}
          <Badge className="bg-emerald-600 text-white">{requests.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-4">
        {requests.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white p-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-800">
                {r.traineeName || r.traineeEmail || (isAr ? "متدرب" : "Trainee")}
              </p>
              {r.message && (
                <p className="truncate text-xs text-slate-500">{r.message}</p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                onClick={() => respond(r.id, true)}
                disabled={busy === r.id}
                className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {busy === r.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {isAr ? "قبول" : "Accept"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => respond(r.id, false)}
                disabled={busy === r.id}
                className="gap-1 border-slate-200 text-slate-500"
              >
                <X className="h-4 w-4" />
                {isAr ? "رفض" : "Decline"}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
