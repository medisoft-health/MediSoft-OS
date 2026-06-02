"use client";

import * as React from "react";
import {
  Bot,
  Loader2,
  Maximize2,
  Minimize2,
  Send,
  Stethoscope,
  User,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface Props {
  /** If set, auto-inject patient context. */
  patientId?: number;
}

export function MedibotDrawer({ patientId }: Props) {
  const t = useTranslations("MediBot");
  const locale = useLocale();
  const [open, setOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMsg[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<"physician" | "patient">("physician");
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  React.useEffect(() => { scrollToBottom(); }, [messages]);

  async function sendMessage(text?: string) {
    const msg = text ?? input.trim();
    if (!msg || loading) return;

    const userMsg: ChatMsg = { role: "user", content: msg, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setSuggestions([]);

    try {
      const res = await fetch("/api/medibot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          sessionId: sessionId ?? undefined,
          mode,
          patientId: patientId ?? undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (!sessionId && data.sessionId) setSessionId(data.sessionId);
        setMessages((prev) => [...prev, data.message]);
        setSuggestions(data.suggestedFollowUps ?? []);
      } else {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: `Error: ${err.error ?? t("drawerErrorFallback")}`,
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: t("drawerConnectionError"),
        timestamp: new Date().toISOString(),
      }]);
    }
    setLoading(false);
  }

  function newChat() {
    setMessages([]);
    setSessionId(null);
    setSuggestions([]);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 end-6 z-50 flex size-14 items-center justify-center rounded-full bg-[color:var(--color-brand-magenta)] text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
        aria-label={t("openMediBot")}
      >
        <Bot className="size-6" />
      </button>
    );
  }

  return (
    <div className={cn(
      "fixed z-50 flex flex-col bg-white border border-gray-200 shadow-2xl transition-all duration-300",
      expanded
        ? "inset-4 rounded-2xl"
        : "bottom-4 end-4 w-96 h-[600px] rounded-2xl max-h-[85vh]",
    )}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="size-5 text-[color:var(--color-brand-magenta)]" />
          <span className="text-sm font-bold text-gray-800">{t("title")}</span>
          {/* Mode toggle */}
          <div className="flex rounded-full border border-gray-200 overflow-hidden ms-2">
            <button onClick={() => setMode("physician")}
              className={cn("px-2 py-0.5 text-[10px] font-medium transition-colors",
                mode === "physician" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50")}>
              <Stethoscope className="inline size-3 me-0.5" />{t("drawerPhysician")}
            </button>
            <button onClick={() => setMode("patient")}
              className={cn("px-2 py-0.5 text-[10px] font-medium transition-colors",
                mode === "patient" ? "bg-emerald-600 text-white" : "text-gray-500 hover:bg-gray-50")}>
              <User className="inline size-3 me-0.5" />{t("drawerPatient")}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setExpanded(!expanded)} className="rounded p-1 text-gray-400 hover:bg-gray-100" aria-label={t("drawerToggleSize")}>
            {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
          <button onClick={() => setOpen(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100" aria-label={t("drawerClose")}>
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Bot className="size-10 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-700">
              {mode === "physician" ? t("drawerPhysicianWelcome") : t("drawerPatientWelcome")}
            </p>
            <p className="text-xs text-gray-400 mt-1 max-w-[250px]">
              {mode === "physician"
                ? t("drawerPhysicianHint")
                : t("drawerPatientHint")}
            </p>
            {patientId && (
              <span className="mt-2 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] text-blue-600">
                {t("drawerPatientContextActive")}
              </span>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-pink)]/10">
                <Bot className="size-4 text-[color:var(--color-brand-magenta)]" />
              </div>
            )}
            <div className={cn(
              "max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed",
              msg.role === "user"
                ? "bg-blue-600 text-white rounded-br-sm"
                : "bg-gray-100 text-gray-800 rounded-bl-sm",
            )}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-pink)]/10">
              <Bot className="size-4 text-[color:var(--color-brand-magenta)]" />
            </div>
            <div className="rounded-xl bg-gray-100 px-3 py-2">
              <Loader2 className="size-4 animate-spin text-gray-400" />
            </div>
          </div>
        )}

        {/* Suggested follow-ups */}
        {suggestions.length > 0 && !loading && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => sendMessage(s)}
                className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 px-3 py-2 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={t("askMediBot")}
            className="flex-1 resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[color:var(--color-brand-magenta)] focus:ring-1 focus:ring-[color:var(--color-brand-magenta)]/20 max-h-20"
            rows={1}
            disabled={loading}
          />
          <Button variant="brand" size="icon" onClick={() => sendMessage()} disabled={!input.trim() || loading} className="shrink-0 size-9 rounded-lg">
            <Send className="size-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <button onClick={newChat} className="text-[10px] text-gray-400 hover:text-gray-600">
            + {t("newConversation")}
          </button>
          <span className="text-[9px] text-gray-300">{t("drawerPoweredBy")}</span>
        </div>
      </div>
    </div>
  );
}
