"use client";

import * as React from "react";

export type MediBotMode = "patient" | "general";

export interface PatientContext {
  id: number;
  firstName: string;
  lastName: string;
  age: number;
  sex: string;
  conditions: string[];
  medications: string[];
  allergies: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  references?: Array<{ num: number; text: string }>;
  timestamp: Date;
}

export interface SessionSummary {
  id: string;
  title: string | null;
  mode: string;
  patientId: number | null;
  createdAt: string;
  metadata: { totalMessages?: number; lastTopic?: string } | null;
}

interface MediBotState {
  isOpen: boolean;
  mode: MediBotMode;
  patientContext: PatientContext | null;
  messages: ChatMessage[];
  isLoading: boolean;
  sessionId: string | null;
  sessions: SessionSummary[];
  sessionsLoading: boolean;
}

interface MediBotActions {
  toggle: () => void;
  open: () => void;
  close: () => void;
  setMode: (mode: MediBotMode) => void;
  setPatientContext: (patient: PatientContext | null) => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  fetchSessions: () => Promise<void>;
  loadSession: (id: string) => Promise<void>;
  startNewSession: () => void;
}

type MediBotContextType = MediBotState & MediBotActions;

const MediBotContext = React.createContext<MediBotContextType | null>(null);

export function useMediBot() {
  const ctx = React.useContext(MediBotContext);
  if (!ctx) throw new Error("useMediBot must be used within MediBotProvider");
  return ctx;
}

export function MediBotProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(true);
  const [mode, setMode] = React.useState<MediBotMode>("general");
  const [patientContext, setPatientContext] = React.useState<PatientContext | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [sessions, setSessions] = React.useState<SessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = React.useState(false);

  // Auto-switch to patient mode when patient context is set
  React.useEffect(() => {
    if (patientContext) {
      setMode("patient");
    }
  }, [patientContext]);

  // Fetch sessions on mount
  const fetchSessions = React.useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch("/api/medibot/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions ?? []);
      }
    } catch {
      // Silently fail — sessions sidebar is non-critical
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  // Load a specific session's messages
  const loadSession = React.useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/medibot/sessions?id=${id}`);
      if (!res.ok) return;
      const session = await res.json();
      setSessionId(session.id);
      setMode(session.mode === "patient" ? "patient" : "general");
      const msgs: ChatMessage[] = (session.messages ?? []).map(
        (m: { role: string; content: string; timestamp: string }, i: number) => ({
          id: `${m.role}-${i}-${Date.now()}`,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: new Date(m.timestamp),
        }),
      );
      setMessages(msgs);
    } catch {
      // ignore
    }
  }, []);

  // Start a fresh session (clears state, session will be created on first message)
  const startNewSession = React.useCallback(() => {
    setSessionId(null);
    setMessages([]);
  }, []);

  const sendMessage = React.useCallback(
    async (content: string) => {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        // Map front-end mode to API mode ("general" -> "physician")
        const apiMode = mode === "patient" ? "patient" : "physician";

        const res = await fetch("/api/medibot/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            mode: apiMode,
            sessionId: sessionId ?? undefined,
            patientId: patientContext?.id,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to get response");
        }

        const data = await res.json();

        // Track the session id returned by the server
        if (data.sessionId) {
          setSessionId(data.sessionId);
        }

        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: "assistant",
          content: data.message?.content ?? data.response ?? "",
          references: data.references || [],
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMsg]);

        // Refresh sessions list so the sidebar picks up the new/updated session
        void fetchSessions();
      } catch {
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "I apologize, but I encountered an error processing your request. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [mode, patientContext, sessionId, fetchSessions],
  );

  const clearMessages = React.useCallback(() => {
    setMessages([]);
    setSessionId(null);
  }, []);

  const value: MediBotContextType = {
    isOpen,
    mode,
    patientContext,
    messages,
    isLoading,
    sessionId,
    sessions,
    sessionsLoading,
    toggle: () => setIsOpen((v) => !v),
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    setMode,
    setPatientContext,
    sendMessage,
    clearMessages,
    fetchSessions,
    loadSession,
    startNewSession,
  };

  return (
    <MediBotContext.Provider value={value}>
      {children}
    </MediBotContext.Provider>
  );
}
