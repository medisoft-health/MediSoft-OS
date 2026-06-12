"use client";

/**
 * Coach <-> Trainee linking — DB-backed (sport_coach_clients).
 * Shared between the standalone (sport) coach dashboard and the integrated
 * /medisport module so both stay mirrored.
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Activity as ActivityIcon,
  Apple,
  ChevronDown,
  FlaskConical,
  Loader2,
  Mail,
  Scale,
  Timer,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Client = {
  linkId: string;
  traineeId: string;
  traineeName: string | null;
  traineeEmail: string | null;
  status: string;
};

type ClientProgress = {
  latestBody: { weightKg: string | null; bodyFatPct: string | null; muscleMassKg: string | null; measuredAt: string } | null;
  latestBioAge: { biologicalAge: string; ageDelta: string } | null;
  activities7d: number;
  foodLogs7d: number;
  latestLab: { title: string; reportDate: string } | null;
};

function ClientProgressPanel({ traineeId }: { traineeId: string }) {
  const t = useTranslations("SportClients");
  const [data, setData] = React.useState<ClientProgress | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/sport?action=client-progress&traineeId=${traineeId}`);
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [traineeId]);

  if (loading) {
    return (
      <div className="flex justify-center py-4 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }
  if (!data) return <p className="py-3 text-center text-xs text-slate-400">{t("noProgress")}</p>;

  const stat = (icon: React.ReactNode, label: string, value: string) => (
    <div className="rounded-lg border border-slate-100 bg-white p-2 text-center">
      <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center text-emerald-600">{icon}</div>
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-800">{value}</p>
    </div>
  );

  return (
    <div className="grid grid-cols-3 gap-2 pt-1 sm:grid-cols-5">
      {stat(<Scale className="h-4 w-4" />, t("weight"), data.latestBody?.weightKg ? `${data.latestBody.weightKg}` : "—")}
      {stat(<Scale className="h-4 w-4" />, t("bodyFat"), data.latestBody?.bodyFatPct ? `${data.latestBody.bodyFatPct}%` : "—")}
      {stat(<Timer className="h-4 w-4" />, t("bioAge"), data.latestBioAge?.biologicalAge ? `${data.latestBioAge.biologicalAge}` : "—")}
      {stat(<ActivityIcon className="h-4 w-4" />, t("activities7d"), String(data.activities7d))}
      {stat(<Apple className="h-4 w-4" />, t("meals7d"), String(data.foodLogs7d))}
      <div className="col-span-3 rounded-lg border border-slate-100 bg-white p-2 sm:col-span-5">
        <p className="flex items-center gap-1 text-[11px] text-slate-500">
          <FlaskConical className="h-3.5 w-3.5 text-emerald-600" />
          {data.latestLab ? `${data.latestLab.title} · ${new Date(data.latestLab.reportDate).toLocaleDateString()}` : t("noLab")}
        </p>
      </div>
    </div>
  );
}

export function ClientsManager() {
  const t = useTranslations("SportClients");
  const [clients, setClients] = React.useState<Client[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [email, setEmail] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [msg, setMsg] = React.useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sport?action=my-clients");
      const json = await res.json();
      if (json.success) setClients(json.data.filter((c: Client) => c.status !== "ended"));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const addClient = async () => {
    const value = email.trim();
    if (!value) return;
    setAdding(true);
    setMsg(null);
    try {
      const res = await fetch("/api/sport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "coach-add-client", email: value }),
      });
      const json = await res.json();
      if (json.success) {
        setEmail("");
        setMsg({ type: "ok", text: t("added") });
        await load();
      } else if (json.error === "no_user") {
        setMsg({ type: "err", text: t("noUser") });
      } else if (json.error === "self_link") {
        setMsg({ type: "err", text: t("selfLink") });
      } else {
        setMsg({ type: "err", text: t("error") });
      }
    } catch {
      setMsg({ type: "err", text: t("error") });
    } finally {
      setAdding(false);
    }
  };

  const removeClient = async (traineeId: string) => {
    setClients((prev) => prev.filter((c) => c.traineeId !== traineeId));
    await fetch("/api/sport", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "coach-remove-client", traineeId }),
    });
  };

  return (
    <Card className="border-emerald-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5 text-emerald-600" /> {t("title")}
          <Badge variant="secondary" className="ms-auto bg-emerald-50 text-emerald-700">
            {clients.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add trainee by email */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                type="email"
                className="ps-9"
                onKeyDown={(e) => e.key === "Enter" && addClient()}
              />
            </div>
            <Button onClick={addClient} disabled={adding || !email.trim()} className="bg-emerald-600 hover:bg-emerald-700">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              <span className="ms-1 hidden sm:inline">{t("add")}</span>
            </Button>
          </div>
          {msg && (
            <p className={`text-xs ${msg.type === "ok" ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p>
          )}
        </div>

        {/* Client list */}
        {loading ? (
          <div className="flex justify-center py-6 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">{t("empty")}</p>
        ) : (
          <div className="space-y-2">
            {clients.map((c) => (
              <div
                key={c.linkId}
                className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-sm font-bold text-white">
                    {(c.traineeName || "?").charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{c.traineeName || t("athlete")}</p>
                    <p className="truncate text-xs text-slate-400">{c.traineeEmail}</p>
                  </div>
                  <button
                    onClick={() => setExpanded((p) => (p === c.traineeId ? null : c.traineeId))}
                    className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700 transition hover:bg-emerald-100"
                  >
                    {t("progress")}
                    <ChevronDown className={`h-3.5 w-3.5 transition ${expanded === c.traineeId ? "rotate-180" : ""}`} />
                  </button>
                  <button
                    onClick={() => removeClient(c.traineeId)}
                    className="text-slate-300 transition hover:text-rose-500"
                    aria-label={t("remove")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {expanded === c.traineeId && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <ClientProgressPanel traineeId={c.traineeId} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Trainee-side: shows the linked coach (if any). */
export function MyCoachCard() {
  const t = useTranslations("SportClients");
  const [coach, setCoach] = React.useState<{ coachName: string | null; coachEmail: string | null } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/sport?action=my-coach");
        const json = await res.json();
        if (json.success) setCoach(json.data);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !coach) return null;

  return (
    <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-emerald-700">{t("yourCoach")}</p>
          <p className="text-sm font-bold text-slate-900">{coach.coachName || t("coach")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
