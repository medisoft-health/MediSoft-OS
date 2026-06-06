"use client";

import * as React from "react";
import Image from "next/image";
import {
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  User,
  Search,
  Send,
  Copy,
  FileText,
  Pill,
  Loader2,
  Sparkles,
  BookOpen,
  Stethoscope,
  FlaskConical,
  Trash2,
  Info,
  ClipboardList,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { cn, getInitials } from "@/lib/utils";
import { useMediBot, type ChatMessage } from "./medibot-provider";

// ─────────────────────────────────────────────────────────────────
// MediBot Panel — Persistent right-side column (matches agreed UI)
// ─────────────────────────────────────────────────────────────────
export function MediBotPanel() {
  const t = useTranslations("MediBot");
  const locale = useLocale();
  const {
    isOpen,
    mode,
    patientContext,
    messages,
    isLoading,
    toggle,
    setMode,
    sendMessage,
    clearMessages,
  } = useMediBot();

  const [input, setInput] = React.useState("");
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Collapsed state — floating expand button ───
  if (!isOpen) {
    return (
      <button
        onClick={toggle}
        className="fixed bottom-5 end-5 z-50 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg shadow-blue-900/30 transition-transform hover:scale-105"
        style={{
          background: "linear-gradient(135deg, #1A3B7A, #2563EB)",
        }}
        aria-label={t("openMediBot")}
      >
        <MessageSquare className="size-7 text-white" />
      </button>
    );
  }

  // ─── Expanded panel ───
  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col border-s border-[#E2E8F0] bg-white transition-all duration-300 dark:border-slate-700 dark:bg-slate-900">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4 dark:border-slate-700">
        <div className="flex items-center gap-1">
          <Image
            src="/brand/medibot-logo.png"
            alt="MediBot"
            width={120}
            height={32}
            className="h-7 w-auto"
            priority
          />
          <span className="ml-2 inline-flex size-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="flex size-8 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-red-500"
              title={t("clearChat")}
            >
              <Trash2 className="size-4" />
            </button>
          )}
          <button
            onClick={toggle}
            className="flex size-8 items-center justify-center rounded-lg bg-[#F1F5F9] transition-colors hover:bg-[#E2E8F0] dark:bg-slate-800 dark:hover:bg-slate-700"
            title={t("collapseMediBot")}
          >
            <ChevronRight className="size-4 text-[#64748B]" />
          </button>
        </div>
      </div>

      {/* ─── Mode Toggle ─── */}
      <div className="border-b border-[#F1F5F9] px-5 py-3 dark:border-slate-700/50">
        <div className="flex gap-1 rounded-xl bg-[#F1F5F9] p-1 dark:bg-slate-800">
          <button
            onClick={() => setMode("patient")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all",
              mode === "patient"
                ? "bg-white text-[#1A3B7A] shadow-sm dark:bg-slate-700 dark:text-blue-300"
                : "text-[#64748B] hover:text-[#1E293B] dark:hover:text-slate-300",
            )}
          >
            <User className="size-4" />
            {t("patientCase")}
          </button>
          <button
            onClick={() => setMode("general")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all",
              mode === "general"
                ? "bg-white text-[#1A3B7A] shadow-sm dark:bg-slate-700 dark:text-blue-300"
                : "text-[#64748B] hover:text-[#1E293B] dark:hover:text-slate-300",
            )}
          >
            <Search className="size-4" />
            {t("generalSearch")}
          </button>
        </div>
      </div>

      {/* ─── Patient Context Banner ─── */}
      {mode === "patient" && patientContext && (
        <div
          className="border-b border-[#E2E8F0] px-5 py-3 dark:border-slate-700"
          style={{
            background: "linear-gradient(135deg, #EFF6FF, #F0FDFA)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, #0D9488, #1A3B7A)",
              }}
            >
              {getInitials(`${patientContext.firstName} ${patientContext.lastName}`)}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-[13px] font-semibold text-[#1E293B] dark:text-slate-200">
                {patientContext.firstName} {patientContext.lastName}
              </h4>
              <p className="truncate text-[11px] text-[#64748B]">
                {patientContext.age}y {patientContext.sex} | {patientContext.conditions.slice(0, 2).join(", ")}
                {patientContext.medications.length > 0 &&
                  ` | ${patientContext.medications.slice(0, 2).join(", ")}`}
              </p>
            </div>
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-[#0D9488]" style={{ background: "rgba(13, 148, 136, 0.1)" }}>
            <Info className="size-3" />
            {t("patientContextLoaded")}
          </div>
        </div>
      )}

      {/* ─── Patient mode without context ─── */}
      {mode === "patient" && !patientContext && (
        <div className="border-b border-[#E2E8F0] bg-amber-50/60 px-5 py-3 dark:border-slate-700 dark:bg-amber-950/20">
          <p className="text-[12px] text-amber-700 dark:text-amber-400">
            <Stethoscope className="mb-0.5 mr-1 inline size-3.5" />
            {t("openPatientRecord")}
          </p>
        </div>
      )}

      {/* ─── Chat Area ─── */}
      <div className="medibot-chat flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <WelcomeState mode={mode} onQuickAction={sendMessage} />
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onFollowUp={sendMessage} />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* ─── Input Area ─── */}
      <div className="border-t border-[#E2E8F0] bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-end gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 transition-all focus-within:border-[#0D9488] focus-within:shadow-[0_0_0_3px_rgba(13,148,136,0.1)] dark:border-slate-600 dark:bg-slate-800">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("askMediBot")}
            rows={1}
            className="max-h-[100px] min-h-[20px] flex-1 resize-none bg-transparent text-[13px] leading-relaxed text-[#334155] outline-none placeholder:text-[#94A3B8] dark:text-slate-200 dark:placeholder:text-slate-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#1A3B7A] text-white transition-colors hover:bg-[#0D9488] disabled:opacity-40"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-[#94A3B8]">
          {isLoading
            ? (mode === "patient" ? t("patientModeFooterLoading") : t("generalModeFooterLoading"))
            : (mode === "patient" ? t("patientModeFooter") : t("generalModeFooter"))}
        </p>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .medibot-chat::-webkit-scrollbar {
          width: 4px;
        }
        .medibot-chat::-webkit-scrollbar-track {
          background: transparent;
        }
        .medibot-chat::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 2px;
        }
      `}</style>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────
// Welcome State
// ─────────────────────────────────────────────────────────────────
function WelcomeState({
  mode,
  onQuickAction,
}: {
  mode: "patient" | "general";
  onQuickAction: (text: string) => void;
}) {
  const t = useTranslations("MediBot");

  const patientQuickActions = [
    { icon: Stethoscope, text: t("quickSummarizePatient"), key: "quickSummarizePatient" },
    { icon: Pill, text: t("quickCheckDrugInteractions"), key: "quickCheckDrugInteractions" },
    { icon: FlaskConical, text: t("quickInterpretLabs"), key: "quickInterpretLabs" },
    { icon: BookOpen, text: t("quickSuggestTreatment"), key: "quickSuggestTreatment" },
  ];

  const generalQuickActions = [
    { icon: ClipboardList, text: t("quickHypertensionGuidelines"), key: "quickHypertensionGuidelines" },
    { icon: Pill, text: t("quickDrugInteractionsSGLT2"), key: "quickDrugInteractionsSGLT2" },
    { icon: BookOpen, text: t("quickGLP1Research"), key: "quickGLP1Research" },
    { icon: Stethoscope, text: t("quickChestPainDiagnosis"), key: "quickChestPainDiagnosis" },
  ];

  const actions = mode === "patient" ? patientQuickActions : generalQuickActions;

  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div
        className="mb-4 flex size-16 items-center justify-center rounded-2xl"
        style={{
          background: "linear-gradient(135deg, #EFF6FF, #F0FDFA)",
        }}
      >
        {mode === "patient" ? (
          <Stethoscope className="size-8 text-[#2563EB]" />
        ) : (
          <Search className="size-8 text-[#2563EB]" />
        )}
      </div>
      <h3 className="text-base font-semibold text-[#1E293B] dark:text-slate-200">
        {mode === "patient" ? t("patientCaseAssistant") : t("generalMedicalSearch")}
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[#64748B]">
        {mode === "patient"
          ? t("patientCaseDescription")
          : t("generalSearchDescription")}
      </p>
      <div className="mt-5 flex w-full flex-col gap-2">
        {actions.map((action) => (
          <button
            key={action.key}
            onClick={() => onQuickAction(action.text)}
            className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-left text-[13px] text-[#475569] transition-all hover:border-[#0D9488] hover:bg-[#F0FDFA] hover:text-[#0D9488] dark:border-slate-600 dark:bg-slate-800 dark:hover:border-teal-500 dark:hover:bg-teal-950/20 dark:hover:text-teal-400"
          >
            <action.icon className="size-4 shrink-0" />
            {action.text}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Message Bubble
// ─────────────────────────────────────────────────────────────────
function MessageBubble({
  message,
  onFollowUp,
}: {
  message: ChatMessage;
  onFollowUp: (text: string) => void;
}) {
  const t = useTranslations("MediBot");
  const isUser = message.role === "user";
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract follow-up suggestions from bot messages
  const followUpChips = React.useMemo(() => {
    if (isUser) return [];
    // Look for common follow-up patterns
    const content = message.content;
    const chips: string[] = [];
    // Check for bullet-style suggestions at the end
    const lines = content.split("\n");
    let inSuggestions = false;
    for (const line of lines) {
      if (line.toLowerCase().includes("follow-up") || line.toLowerCase().includes("you might also ask")) {
        inSuggestions = true;
        continue;
      }
      if (inSuggestions && line.trim().startsWith("-")) {
        chips.push(line.trim().replace(/^-\s*/, ""));
      }
    }
    return chips.slice(0, 3);
  }, [message.content, isUser]);

  return (
    <div
      className={cn(
        "flex gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isUser && "flex-row-reverse",
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
          isUser
            ? "text-white"
            : "text-[#2563EB]",
        )}
        style={
          isUser
            ? { background: "linear-gradient(135deg, #1A3B7A, #2563EB)" }
            : { background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)" }
        }
      >
        {isUser ? (
          "Dr"
        ) : (
          <MessageSquare className="size-3.5" />
        )}
      </div>

      {/* Content */}
      <div className={cn("max-w-[85%] space-y-2", isUser && "text-right")}>
        <div
          className={cn(
            "rounded-xl px-4 py-3 text-[13px] leading-relaxed",
            isUser
              ? "rounded-tr-sm bg-[#1A3B7A] text-white"
              : "rounded-tl-sm border border-[#E2E8F0] bg-[#F8FAFC] text-[#334155] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
          )}
        >
          <div
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{
              __html: formatBotMessage(message.content),
            }}
          />

          {/* References */}
          {!isUser && message.references && message.references.length > 0 && (
            <div className="mt-3 border-t border-[#E2E8F0] pt-3 dark:border-slate-600">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                {t("references")}
              </p>
              {message.references.map((ref) => (
                <p
                  key={ref.num}
                  className="flex items-start gap-1.5 py-0.5 text-[11px] text-[#0D9488] cursor-pointer hover:underline"
                >
                  <span className="shrink-0 font-semibold">[{ref.num}]</span>
                  <span>{ref.text}</span>
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons for bot messages */}
        {!isUser && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] text-[#64748B] transition-colors hover:border-[#0D9488] hover:text-[#0D9488] dark:border-slate-600 dark:bg-slate-800"
            >
              <Copy className="size-3" />
              {copied ? t("copied") : t("copyLabel")}
            </button>
            <button className="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] text-[#64748B] transition-colors hover:border-[#0D9488] hover:text-[#0D9488] dark:border-slate-600 dark:bg-slate-800">
              <FileText className="size-3" />
              {t("appendToNote")}
            </button>
            <button className="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] text-[#64748B] transition-colors hover:border-[#0D9488] hover:text-[#0D9488] dark:border-slate-600 dark:bg-slate-800">
              <Pill className="size-3" />
              {t("sendToPharmaX")}
            </button>
          </div>
        )}

        {/* Follow-up chips */}
        {!isUser && followUpChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {followUpChips.map((chip) => (
              <button
                key={chip}
                onClick={() => onFollowUp(chip)}
                className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-[11px] text-[#475569] transition-all hover:border-[#E91E8C] hover:bg-[#FDF2F8] hover:text-[#E91E8C] dark:border-slate-600 dark:bg-slate-800"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Typing Indicator
// ─────────────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <div
        className="grid size-7 shrink-0 place-items-center rounded-full text-[#2563EB]"
        style={{
          background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)",
        }}
      >
        <MessageSquare className="size-3.5" />
      </div>
      <div className="rounded-xl rounded-tl-sm border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 dark:border-slate-600 dark:bg-slate-800">
        <div className="flex gap-1">
          <span className="size-1.5 animate-bounce rounded-full bg-[#94A3B8] [animation-delay:0ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-[#94A3B8] [animation-delay:150ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-[#94A3B8] [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Format bot message (bold, newlines, inline citations)
// ─────────────────────────────────────────────────────────────────
function formatBotMessage(content: string): string {
  const formatted = content
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Inline citations [1], [2], etc. — teal numbered circles
    .replace(
      /\[(\d+)\]/g,
      '<span class="inline-flex items-center justify-center size-[18px] rounded-full bg-[#0D9488] text-[10px] font-semibold text-white mx-0.5 align-middle cursor-pointer hover:bg-[#0F766E]">$1</span>',
    )
    // Line breaks
    .replace(/\n/g, "<br/>");
  return formatted;
}
