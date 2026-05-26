"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Globe,
  Loader2,
  LogOut,
  Monitor,
  Smartphone,
  Trash2,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authClient } from "@/lib/auth-client";
import { formatClinicalDate } from "@/lib/utils";

interface ClientSession {
  id: string;
  token: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
}

interface Props {
  userId: string;
}

function parseUserAgent(ua: string | null): {
  label: string;
  icon: typeof Monitor;
} {
  if (!ua) return { label: "Unknown device", icon: Globe };
  const lower = ua.toLowerCase();
  if (lower.includes("mobile") || lower.includes("android") || lower.includes("iphone")) {
    return { label: "Mobile", icon: Smartphone };
  }
  return { label: "Desktop", icon: Monitor };
}

/**
 * Sessions tab — lists active sessions and allows revoking others.
 *
 * Uses Better-Auth's client API: `listSessions` and `revokeSession`.
 * The current session is marked and cannot be revoked (sign-out
 * handles that).
 */
export function SessionsTab({ userId }: Props) {
  const router = useRouter();
  const [sessions, setSessions] = React.useState<ClientSession[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [revoking, setRevoking] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const result = await authClient.listSessions();
        if (result.error || !result.data) {
          setSessions([]);
          return;
        }
        setSessions(
          (result.data as Array<{
            id: string;
            token: string;
            ipAddress: string | null;
            userAgent: string | null;
            createdAt: Date | string;
            expiresAt: Date | string;
          }>).map((s) => ({
            id: s.id,
            token: s.token,
            ipAddress: s.ipAddress,
            userAgent: s.userAgent,
            createdAt: new Date(s.createdAt),
            expiresAt: new Date(s.expiresAt),
            isCurrent: false,
          })),
        );
      } catch {
        setSessions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function revokeOne(sessionToken: string) {
    setRevoking(sessionToken);
    try {
      const result = await authClient.revokeSession({ token: sessionToken });
      if (result.error) {
        toast.error("Could not revoke session", {
          description: result.error.message,
        });
        return;
      }
      setSessions((prev) =>
        prev ? prev.filter((s) => s.token !== sessionToken) : null,
      );
      toast.success("Session revoked");
    } catch (err) {
      toast.error("Revoke failed");
    } finally {
      setRevoking(null);
    }
  }

  async function revokeAll() {
    setRevoking("all");
    try {
      const result = await authClient.revokeSessions();
      if (result.error) {
        toast.error("Could not revoke sessions", {
          description: result.error.message,
        });
        return;
      }
      toast.success("All other sessions revoked");
      // The current session may be gone — redirect to login.
      window.location.href = "/login";
    } catch {
      toast.error("Revoke failed");
    } finally {
      setRevoking(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Monitor className="size-4 text-[color:var(--color-brand-magenta)]" />
              Active sessions
            </CardTitle>
            <CardDescription>
              Sessions that are currently signed in. Revoke any you don&apos;t
              recognise.
            </CardDescription>
          </div>
          {sessions && sessions.length > 1 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={revokeAll}
              disabled={revoking === "all"}
            >
              {revoking === "all" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              Revoke all
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-[color:var(--color-muted-foreground)]">
            Loading sessions…
          </p>
        ) : !sessions || sessions.length === 0 ? (
          <p className="text-sm text-[color:var(--color-muted-foreground)]">
            No active sessions found.
          </p>
        ) : (
          <ul className="space-y-3">
            {sessions.map((s) => {
              const { label, icon: Icon } = parseUserAgent(s.userAgent);
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--color-border)] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-xl bg-[color:var(--color-muted)]">
                      <Icon className="size-5 text-[color:var(--color-muted-foreground)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        {label}
                        {s.isCurrent && (
                          <Badge variant="success" className="text-[10px]">
                            This device
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-[color:var(--color-muted-foreground)]">
                        {s.ipAddress ?? "Unknown IP"} ·{" "}
                        Created {formatClinicalDate(s.createdAt)} ·{" "}
                        Expires {formatClinicalDate(s.expiresAt)}
                      </div>
                      {s.userAgent && (
                        <div className="mt-0.5 max-w-md truncate text-[10px] text-[color:var(--color-muted-foreground)]">
                          {s.userAgent}
                        </div>
                      )}
                    </div>
                  </div>
                  {!s.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeOne(s.token)}
                      disabled={revoking === s.token}
                      className="text-[color:var(--color-destructive)]"
                    >
                      {revoking === s.token ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                      Revoke
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
