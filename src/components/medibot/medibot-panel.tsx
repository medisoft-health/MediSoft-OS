"use client";

import * as React from "react";
import {
  MessageSquare,
  ChevronRight,
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
  X,
  Trash2,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useMediBot, type ChatMessage } from "./medibot-provider";

// ─────────────────────────────────────────────────────────────────
// MediBot Panel — Persistent sidebar
// ─────────────────────────────────────────────────────────────────
export function MediBotPanel() {
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
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

  // Collapsed state — floating button
  if (!isOpen) {
    return (
      <button
        onClick={toggle}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1A3B7A] to-[#2563EB] text-white shadow-lg shadow-blue-900/30 transition-transform hover:scale-105"
        aria-label="Open MediBot"
      >
        <MessageSquare className="size-7" />
      </button>
    );
  }

  return (
    <aside className="flex h-full w-[360px] flex-col border-s border-[color:var(--color-border)] bg-[color:var(--color-card)]">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-3.5">
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-[#E91E8C]">Medi</span>
          <span className="text-lg font-bold text-[#1A3B7A]">Bot</span>
          <MessageSquare className="size-5 text-[#2563EB]" />
          <span className="ml-1.5 inline-flex size-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
              title="Clear chat"
            >
              <Trash2 className="size-4" />
            </button>
          )}
          <button
            onClick={toggle}
            className="flex size-8 items-center justify-center rounded-lg bg-muted/50 transition-colors hover:bg-muted"
            title="Collapse MediBot"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* ─── Mode Toggle ─── */}
      <div className="border-b border-[color:var(--color-border)]/50 px-5 py-3">
        <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
          <button
            onClick={() => setMode("patient")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all",
              mode === "patient"
                ? "bg-[color:var(--color-card)] text-[#1A3B7A] shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <User className="size-4" />
            Patient Case
          </button>
          <button
            onClick={() => setMode("general")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all",
              mode === "general"
                ? "bg-[color:var(--color-card)] text-[#1A3B7A] shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Search className="size-4" />
            General Search
          </button>
        </div>
      </div>

      {/* ─── Patient Context Banner ─── */}
      {mode === "patient" && patientContext && (
        <div className="border-b border-[color:var(--color-border)]/50 bg-gradient-to-r from-blue-50/80 to-teal-50/80 px-5 py-3 dark:from-blue-950/20 dark:to-teal-950/20">
          <div className="flex items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal-600 to-[#1A3B7A] text-[13px] font-semibold text-white">
              {getInitials(`${patientContext.firstName} ${patientContext.lastName}`)}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-[13px] font-semibold text-foreground">
                {patientContext.firstName} {patientContext.lastName}
              </h4>
              <p className="truncate text-[11px] text-muted-foreground">
                {patientContext.age}y {patientContext.sex} | {patientContext.conditions.slice(0, 2).join(", ")}
              </p>
            </div>
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-teal-100/60 px-2 py-1 text-[11px] font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
            <Sparkles className="size-3" />
            Full patient context loaded
          </div>
        </div>
      )}

      {/* ─── Patient mode without context ─── */}
      {mode === "patient" && !patientContext && (
        <div className="border-b border-[color:var(--color-border)]/50 bg-amber-50/60 px-5 py-3 dark:bg-amber-950/20">
          <p className="text-[12px] text-amber-700 dark:text-amber-400">
            <Stethoscope className="mb-0.5 mr-1 inline size-3.5" />
            Open a patient record to enable patient-specific AI assistance.
          </p>
        </div>
      )}

      {/* ─── Chat Area ─── */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <WelcomeState mode={mode} onQuickAction={sendMessage} />
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* ─── Input Area ─── */}
      <div className="border-t border-[color:var(--color-border)] bg-[color:var(--color-card)] px-5 py-4">
        <div className="flex items-end gap-2 rounded-xl border border-[color:var(--color-border)] bg-muted/30 px-3 py-2 transition-colors focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/10">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask MediBot..."
            rows={1}
            className="max-h-[120px] min-h-[20px] flex-1 resize-none bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#1A3B7A] text-white transition-colors hover:bg-teal-600 disabled:opacity-40"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {mode === "patient"
            ? "MediBot uses patient context • Citations from PubMed & guidelines"
            : "General medical search • 40M+ studies & guidelines"}
        </p>
      </div>
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
  const patientQuickActions = [
    { icon: Stethoscope, text: "Summarize this patient's current status" },
    { icon: Pill, text: "Check for drug interactions" },
    { icon: FlaskConical, text: "Interpret latest lab results" },
    { icon: BookOpen, text: "Suggest treatment based on guidelines" },
  ];

  const generalQuickActions = [
    { icon: BookOpen, text: "Latest guidelines for hypertension management" },
    { icon: Pill, text: "Drug interactions: SGLT2i + ACE inhibitors" },
    { icon: FlaskConical, text: "New research on GLP-1 receptor agonists" },
    { icon: Stethoscope, text: "Differential diagnosis for chest pain" },
  ];

  const actions = mode === "patient" ? patientQuickActions : generalQuickActions;

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-950/30 dark:to-teal-950/30">
        {mode === "patient" ? (
          <Stethoscope className="size-8 text-[#2563EB]" />
        ) : (
          <Search className="size-8 text-[#2563EB]" />
        )}
      </div>
      <h3 className="text-base font-semibold text-foreground">
        {mode === "patient" ? "Patient Case Assistant" : "General Medical Search"}
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        {mode === "patient"
          ? "Ask questions about this patient and get AI-powered clinical insights with evidence."
          : "Ask any medical question and get evidence-based answers with citations from studies and guidelines."}
      </p>
      <div className="mt-5 flex w-full flex-col gap-2">
        {actions.map((action) => (
          <button
            key={action.text}
            onClick={() => onQuickAction(action.text)}
            className="flex items-center gap-3 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-4 py-3 text-left text-[13px] text-muted-foreground transition-all hover:border-teal-500/50 hover:bg-teal-50/50 hover:text-teal-700 dark:hover:bg-teal-950/20 dark:hover:text-teal-400"
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
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  return (
    <div className={cn("flex gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
          isUser
            ? "bg-gradient-to-br from-[#1A3B7A] to-[#2563EB] text-white"
            : "bg-gradient-to-br from-blue-50 to-blue-100 text-[#2563EB] dark:from-blue-950/50 dark:to-blue-900/50",
        )}
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
              : "rounded-tl-sm border border-[color:var(--color-border)] bg-muted/30 text-foreground",
          )}
        >
          <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatBotMessage(message.content) }} />

          {/* References */}
          {!isUser && message.references && message.references.length > 0 && (
            <div className="mt-3 border-t border-[color:var(--color-border)]/50 pt-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                References
              </p>
              {message.references.map((ref) => (
                <p
                  key={ref.num}
                  className="py-0.5 text-[11px] text-teal-600 dark:text-teal-400"
                >
                  <span className="font-semibold">[{ref.num}]</span> {ref.text}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons for bot messages */}
        {!isUser && (
          <div className="flex gap-1.5">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-md border border-[color:var(--color-border)] px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-teal-500 hover:text-teal-600"
            >
              <Copy className="size-3" /> Copy
            </button>
            <button className="inline-flex items-center gap-1 rounded-md border border-[color:var(--color-border)] px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-teal-500 hover:text-teal-600">
              <FileText className="size-3" /> Add to Note
            </button>
            <button className="inline-flex items-center gap-1 rounded-md border border-[color:var(--color-border)] px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-teal-500 hover:text-teal-600">
              <Pill className="size-3" /> PharmaX
            </button>
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
      <div className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-50 to-blue-100 text-[#2563EB] dark:from-blue-950/50 dark:to-blue-900/50">
        <MessageSquare className="size-3.5" />
      </div>
      <div className="rounded-xl rounded-tl-sm border border-[color:var(--color-border)] bg-muted/30 px-4 py-3">
        <div className="flex gap-1">
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Format bot message (bold, newlines, inline citations)
// ─────────────────────────────────────────────────────────────────
function formatBotMessage(content: string): string {
  let formatted = content
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Inline citations [1], [2], etc.
    .replace(/\[(\d+)\]/g, '<span class="inline-flex items-center justify-center size-4 rounded-full bg-teal-600 text-[9px] font-bold text-white mx-0.5 align-middle">$1</span>')
    // Line breaks
    .replace(/\n/g, '<br/>');
  return formatted;
}
