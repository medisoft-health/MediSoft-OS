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

interface MediBotState {
  isOpen: boolean;
  mode: MediBotMode;
  patientContext: PatientContext | null;
  messages: ChatMessage[];
  isLoading: boolean;
}

interface MediBotActions {
  toggle: () => void;
  open: () => void;
  close: () => void;
  setMode: (mode: MediBotMode) => void;
  setPatientContext: (patient: PatientContext | null) => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
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

  // Auto-switch to patient mode when patient context is set
  React.useEffect(() => {
    if (patientContext) {
      setMode("patient");
    }
  }, [patientContext]);

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
        const res = await fetch("/api/medibot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            mode,
            patientContext: mode === "patient" ? patientContext : null,
            history: messages.slice(-10).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to get response");
        }

        const data = await res.json();

        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: "assistant",
          content: data.response,
          references: data.references || [],
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMsg]);
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
    [mode, patientContext, messages],
  );

  const clearMessages = React.useCallback(() => {
    setMessages([]);
  }, []);

  const value: MediBotContextType = {
    isOpen,
    mode,
    patientContext,
    messages,
    isLoading,
    toggle: () => setIsOpen((v) => !v),
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    setMode,
    setPatientContext,
    sendMessage,
    clearMessages,
  };

  return (
    <MediBotContext.Provider value={value}>
      {children}
    </MediBotContext.Provider>
  );
}
