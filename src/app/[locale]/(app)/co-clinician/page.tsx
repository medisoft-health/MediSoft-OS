"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  MessageCircle,
  Send,
  Bot,
  User,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Globe,
  Sparkles,
} from "lucide-react";

interface Message {
  role: "assistant" | "patient";
  content: string;
  timestamp: string;
}

interface Summary {
  chiefComplaint: string;
  historyOfPresentIllness: string;
  pertinentPositives: string[];
  pertinentNegatives: string[];
  riskFactors: string[];
  suggestedDifferentials: string[];
  recommendedExams: string[];
  recommendedTests: string[];
  urgencyLevel: string;
  completenessScore: number;
  physicianNotes: string;
}

export default function CoClinician() {
  const t = useTranslations("AIAgents");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [isComplete, setIsComplete] = React.useState(false);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [language, setLanguage] = React.useState<"en" | "ar">("en");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startSession = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/google-health/co-clinician", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          patientId: "demo-patient",
          language,
        }),
      });
      const data = await res.json();
      setSessionId(data.sessionId);
      setMessages([
        {
          role: "assistant",
          content: data.greeting,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error("Failed to start session:", err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !sessionId || loading) return;

    const userMsg: Message = {
      role: "patient",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/google-health/co-clinician", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "message",
          sessionId,
          message: userMsg.content,
        }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          timestamp: new Date().toISOString(),
        },
      ]);

      if (data.isComplete) {
        setIsComplete(true);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="border-b border-[color:var(--color-border)] bg-[color:var(--color-card)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white">
              <MessageCircle className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{t("clinicalCoPilot")}</h1>
              <p className="text-xs text-[color:var(--color-muted-foreground)]">
                {t("clinicalCoPilotDesc")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage(language === "en" ? "ar" : "en")}
              className="flex items-center gap-1.5 rounded-lg border border-[color:var(--color-border)] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[color:var(--color-muted)]/50"
            >
              <Globe className="size-3.5" />
              {language === "en" ? "English" : "العربية"}
            </button>
            {sessionId && (
              <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600">
                <span className="size-1.5 animate-pulse rounded-full bg-green-500" />
                {t("sessionActive")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {!sessionId ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-md text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white">
                <Bot className="size-8" />
              </div>
              <h2 className="mb-2 text-xl font-bold">{t("startPreVisitInterview")}</h2>
              <p className="mb-6 text-sm text-[color:var(--color-muted-foreground)]">
                {t("coCliniciandesc")}
              </p>
              <div className="mb-6 grid grid-cols-2 gap-3 text-left text-xs">
                <Feature icon={MessageCircle} text={t("structuredInterview")} />
                <Feature icon={FileText} text={t("autoGeneratedSummary")} />
                <Feature icon={Globe} text={t("arabicEnglish")} />
                <Feature icon={Sparkles} text={t("aiRiskAssessment")} />
              </div>
              <button
                onClick={startSession}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MessageCircle className="size-4" />
                )}
                {t("startInterview")}
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === "patient" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                    msg.role === "assistant"
                      ? "bg-gradient-to-br from-orange-500 to-red-500 text-white"
                      : "bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <Bot className="size-4" />
                  ) : (
                    <User className="size-4" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "assistant"
                      ? "bg-[color:var(--color-muted)]/50"
                      : "bg-[color:var(--color-brand-pink)]/10"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-white">
                  <Bot className="size-4" />
                </div>
                <div className="rounded-2xl bg-[color:var(--color-muted)]/50 px-4 py-3">
                  <Loader2 className="size-4 animate-spin text-[color:var(--color-muted-foreground)]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Summary Panel (when complete) */}
      {isComplete && summary && (
        <div className="border-t border-[color:var(--color-border)] bg-green-500/5 p-4">
          <div className="mx-auto max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-700">
              <CheckCircle2 className="size-4" />
              {t("interviewComplete")}
            </div>
            <div className="grid gap-3 text-xs md:grid-cols-3">
              <div className="rounded-lg bg-white/80 p-3 dark:bg-black/20">
                <div className="mb-1 font-semibold">{t("chiefComplaint")}</div>
                <div className="text-[color:var(--color-muted-foreground)]">
                  {summary.chiefComplaint}
                </div>
              </div>
              <div className="rounded-lg bg-white/80 p-3 dark:bg-black/20">
                <div className="mb-1 font-semibold">{t("urgency")}</div>
                <div className={`font-medium ${
                  summary.urgencyLevel === "urgent" || summary.urgencyLevel === "emergency"
                    ? "text-red-600"
                    : summary.urgencyLevel === "semi-urgent"
                    ? "text-orange-600"
                    : "text-green-600"
                }`}>
                  {summary.urgencyLevel?.toUpperCase()}
                </div>
              </div>
              <div className="rounded-lg bg-white/80 p-3 dark:bg-black/20">
                <div className="mb-1 font-semibold">{t("completeness")}</div>
                <div className="text-[color:var(--color-muted-foreground)]">
                  {summary.completenessScore}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      {sessionId && !isComplete && (
        <div className="border-t border-[color:var(--color-border)] bg-[color:var(--color-card)] p-4">
          <div className="mx-auto flex max-w-2xl gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={language === "ar" ? "اكتب ردك هنا..." : "Type your response..."}
              className="flex-1 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-4 py-3 text-sm outline-none transition-colors focus:border-[color:var(--color-brand-pink)]"
              dir={language === "ar" ? "rtl" : "ltr"}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Feature({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-[color:var(--color-muted)]/30 px-3 py-2">
      <Icon className="size-3.5 text-orange-500" />
      <span>{text}</span>
    </div>
  );
}
