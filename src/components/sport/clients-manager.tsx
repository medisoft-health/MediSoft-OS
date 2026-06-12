"use client";

/**
 * Coach <-> Trainee linking — DB-backed (sport_coach_clients).
 * Shared between the standalone (sport) coach dashboard and the integrated
 * /medisport module so both stay mirrored.
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, Mail, Trash2, UserPlus, Users } from "lucide-react";
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

export function ClientsManager() {
  const t = useTranslations("SportClients");
  const [clients, setClients] = React.useState<Client[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [email, setEmail] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [msg, setMsg] = React.useState<{ type: "ok" | "err"; text: string } | null>(null);

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
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-sm font-bold text-white">
                  {(c.traineeName || "?").charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{c.traineeName || t("athlete")}</p>
                  <p className="truncate text-xs text-slate-400">{c.traineeEmail}</p>
                </div>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">{t("active")}</Badge>
                <button
                  onClick={() => removeClient(c.traineeId)}
                  className="text-slate-300 transition hover:text-rose-500"
                  aria-label={t("remove")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
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
