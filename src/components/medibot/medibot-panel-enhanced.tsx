"use client";

import * as React from "react";
import Image from "next/image";
import {
  MessageSquare,
  ChevronRight,
  Send,
  Copy,
  FileText,
  Pill,
  Loader2,
  Sparkles,
  BookOpen,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediBot, type ChatMessage } from "./medibot-provider";
import { usePageContext } from "./use-page-context";

/**
 * Enhanced MediBot Panel — Context-aware Medical Intelligence assistant.
 *
 * Improvements over original:
 * 1. Context-aware quick actions based on current page/module
 * 2. Suggested prompts that change per module
 * 3. Visual indicator of current context
 * 4. Smooth animations and micro-interactions
 * 5. Dark mode support
 * 6. Better message rendering with actions
 */

export function MediBotPanelEnhanced() {
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

  const pageContext = usePageContext();
  const [input, setInput] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(true);
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

  // Hide suggestions after first message
  React.useEffect(() => {
    if (messages.length > 0) setShowSuggestions(false);
  }, [messages.length]);

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

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
    setShowSuggestions(false);
  };

  // ─── Collapsed state — floating expand button ───
  if (!isOpen) {
    return (
      <button
        onClick={toggle}
        className={cn(
          "fixed bottom-5 end-5 z-50 flex h-14 w-14 items-center justify-center",
          "rounded-2xl shadow-lg shadow-blue-900/30",
          "transition-all duration-300 hover:scale-105 hover:shadow-xl",
          "bg-gradient-to-br from-[#1A3B7A] to-[#2563EB]"
        )}
        aria-label="Open MediBot"
      >
        <MessageSquare className="size-7 text-white" />
        {/* Context indicator dot */}
        {pageContext.module !== "other" && (
          <span className="absolute -top-1 -end-1 size-3 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
        )}
      </button>
    );
  }

  // ─── Expanded panel ───
  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col border-s border-slate-200 bg-white transition-all duration-300 dark:border-slate-700 dark:bg-slate-900">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Image
            src="/brand/medibot-logo.png"
            alt="MediBot"
            width={100}
            height={28}
            className="dark:brightness-110 dark:contrast-125"
          />
          {/* Context badge */}
          {pageContext.module !== "other" && pageContext.module !== "dashboard" && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {pageContext.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearMessages}
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
            title="Clear chat"
          >
            <Trash2 className="size-4" />
          </button>
          <button
            onClick={toggle}
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
            title="Collapse"
          >
            <ChevronRight className="size-4 rtl:rotate-180" />
          </button>
        </div>
      </div>

      {/* ─── Mode Switcher ─── */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setMode("patient")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-all",
            mode === "patient"
              ? "text-blue-700 border-b-2 border-blue-600 bg-blue-50/50 dark:text-blue-300 dark:bg-blue-900/20"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          )}
        >
          <Stethoscope className="size-3.5" />
          Patient Case
        </button>
        <button
          onClick={() => setMode("general")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-all",
            mode === "general"
              ? "text-blue-700 border-b-2 border-blue-600 bg-blue-50/50 dark:text-blue-300 dark:bg-blue-900/20"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          )}
        >
          <BookOpen className="size-3.5" />
          General Search
        </button>
      </div>

      {/* ─── Patient Context Banner ─── */}
      {mode === "patient" && patientContext && (
        <div className="mx-4 mt-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-3 border border-blue-100 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
              {patientContext.firstName[0]}
              {patientContext.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {patientContext.firstName} {patientContext.lastName}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {patientContext.age}y • {patientContext.sex} •{" "}
                {patientContext.conditions.length} conditions
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Context-Aware Quick Actions ─── */}
      {showSuggestions && pageContext.quickActions.length > 0 && (
        <div className="px-4 pt-3 animate-fade-in">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 font-medium">
            Quick Actions — {pageContext.title}
          </p>
          <div className="space-y-1.5">
            {pageContext.quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => handleQuickAction(action.prompt)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-start text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="text-base">{action.icon}</span>
                <span className="font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Chat Messages ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && !showSuggestions && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-3">
              <Sparkles className="size-7 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Medical Intelligence Ready
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[200px]">
              {pageContext.contextHint}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start gap-2 animate-fade-in">
            <div className="size-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0">
              <Sparkles className="size-3.5 text-white" />
            </div>
            <div className="rounded-xl rounded-tl-sm bg-slate-100 dark:bg-slate-800 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="size-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="size-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="size-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ─── Suggested Prompts (contextual) ─── */}
      {messages.length > 0 && pageContext.suggestedPrompts.length > 0 && (
        <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-none">
          {pageContext.suggestedPrompts.slice(0, 3).map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleQuickAction(prompt)}
              className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* ─── Input Area ─── */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-end gap-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-400 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === "patient" && patientContext
                ? `Ask about ${patientContext.firstName}...`
                : "Ask Medical Intelligence..."
            }
            className="flex-1 resize-none bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none max-h-[100px]"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg transition-all",
              input.trim() && !isLoading
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                : "text-slate-300 dark:text-slate-600"
            )}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

/**
 * Message Bubble — Renders a single chat message with actions.
 */
function MessageBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-blue-600 px-4 py-2.5 text-sm text-white">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 group">
      <div className="size-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="size-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="rounded-xl rounded-tl-sm bg-slate-100 dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
          {message.content}
        </div>

        {/* References */}
        {message.references && message.references.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {message.references.map((ref) => (
              <span
                key={ref.num}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              >
                [{ref.num}] {ref.text}
              </span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Copy className="size-3" />
            {copied ? "Copied!" : "Copy"}
          </button>
          <button className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <FileText className="size-3" />
            Add to Note
          </button>
          <button className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Pill className="size-3" />
            PharmaX
          </button>
        </div>
      </div>
    </div>
  );
}
