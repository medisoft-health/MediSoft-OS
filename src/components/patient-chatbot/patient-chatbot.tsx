"use client";

import * as React from "react";
import {
  MessageCircle,
  Send,
  Bot,
  User,
  Stethoscope,
  Pill,
  FileText,
  Calendar,
  Heart,
  AlertTriangle,
  AlertCircle,
  Loader2,
  X,
  Minimize2,
  Maximize2,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  urgency?: "normal" | "attention" | "emergency";
  suggestedQuestions?: string[];
  timestamp: Date;
}

type ChatMode = "symptom_checker" | "health_advisor" | "medication_guide" | "report_explainer" | "appointment_guide";

interface PatientChatbotProps {
  patientId?: number;
  floating?: boolean;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────
//  Patient AI Chatbot Component
// ─────────────────────────────────────────────────────────────────
export function PatientChatbot({ patientId, floating = true, className }: PatientChatbotProps) {
  const [isOpen, setIsOpen] = React.useState(!floating);
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [mode, setMode] = React.useState<ChatMode>("health_advisor");
  const [showModeSelector, setShowModeSelector] = React.useState(true);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const modes: { key: ChatMode; label: string; icon: React.ReactNode; description: string; color: string }[] = [
    { key: "symptom_checker", label: "تقييم الأعراض", icon: <Stethoscope className="w-5 h-5" />, description: "وصف أعراضك وسأساعدك على فهمها", color: "bg-red-500/10 text-red-400 border-red-500/30" },
    { key: "health_advisor", label: "مستشار صحي", icon: <Heart className="w-5 h-5" />, description: "نصائح صحية عامة ونمط حياة", color: "bg-green-500/10 text-green-400 border-green-500/30" },
    { key: "medication_guide", label: "دليل الأدوية", icon: <Pill className="w-5 h-5" />, description: "أسئلة عن أدويتك وكيفية استخدامها", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
    { key: "report_explainer", label: "تفسير التقارير", icon: <FileText className="w-5 h-5" />, description: "شرح نتائج التحاليل والأشعة", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
    { key: "appointment_guide", label: "تحضير للموعد", icon: <Calendar className="w-5 h-5" />, description: "تحضير أسئلة ومستندات لزيارة الطبيب", color: "bg-teal-500/10 text-teal-400 border-teal-500/30" },
  ];

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function selectMode(selectedMode: ChatMode) {
    setMode(selectedMode);
    setShowModeSelector(false);
    const modeInfo = modes.find(m => m.key === selectedMode);
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: getWelcomeMessage(selectedMode),
      timestamp: new Date(),
    }]);
  }

  function getWelcomeMessage(m: ChatMode): string {
    switch (m) {
      case "symptom_checker":
        return "مرحباً! أنا المساعد الطبي الذكي في MediSoft.\n\nأخبرني عن الأعراض التي تشعر بها وسأساعدك على فهمها وتوجيهك للرعاية المناسبة.\n\n💡 يمكنك وصف:\n- ما تشعر به\n- متى بدأت الأعراض\n- هل هناك أعراض مصاحبة";
      case "health_advisor":
        return "مرحباً! أنا مستشارك الصحي الذكي.\n\nيمكنني مساعدتك في:\n- نصائح التغذية والرياضة\n- تحسين النوم\n- الصحة النفسية\n- الوقاية من الأمراض\n\nكيف يمكنني مساعدتك اليوم؟";
      case "medication_guide":
        return "مرحباً! أنا دليل الأدوية الذكي.\n\nيمكنني مساعدتك في:\n- شرح طريقة استخدام أدويتك\n- التحذيرات والآثار الجانبية\n- التفاعلات مع أدوية أو أطعمة أخرى\n- ماذا تفعل لو نسيت جرعة\n\nما الدواء الذي تريد أن تسأل عنه؟";
      case "report_explainer":
        return "مرحباً! أنا مفسر التقارير الطبية.\n\nأرسل لي نتائج تحاليلك أو أشعتك وسأشرحها لك بلغة بسيطة:\n- ما هو طبيعي وما يحتاج متابعة\n- ماذا تعني الأرقام\n- أسئلة يمكنك طرحها على طبيبك\n\nما التقرير الذي تريد فهمه؟";
      case "appointment_guide":
        return "مرحباً! سأساعدك في التحضير لموعدك الطبي.\n\nيمكنني مساعدتك في:\n- تحضير قائمة أسئلة للطبيب\n- تذكيرك بالمعلومات المهمة\n- نصائح ما قبل الزيارة\n- تنظيم المستندات المطلوبة\n\nمتى موعدك ومع أي تخصص؟";
    }
  }

  async function sendMessage(text?: string) {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const conversationHistory = messages
        .filter(m => m.id !== "welcome")
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/patient-chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          mode,
          patientId,
          conversationHistory,
          locale: "ar",
        }),
      });

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response || "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.",
        urgency: data.urgency,
        suggestedQuestions: data.suggestedQuestions,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    setMessages([]);
    setShowModeSelector(true);
  }

  // Floating button (when closed)
  if (floating && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full shadow-lg shadow-teal-500/30 flex items-center justify-center hover:scale-110 transition-transform"
      >
        <MessageCircle className="w-6 h-6 text-white" />
        {messages.some(m => m.urgency === "emergency") && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
        )}
      </button>
    );
  }

  const chatContent = (
    <div className={cn(
      "flex flex-col bg-gray-900 border border-gray-700/50 overflow-hidden",
      floating ? "fixed bottom-6 left-6 z-50 w-[400px] h-[600px] rounded-2xl shadow-2xl" : "w-full h-full rounded-xl",
      isMinimized && floating && "h-14",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-teal-600/20 to-cyan-600/20 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">المساعد الطبي الذكي</p>
            <p className="text-[10px] text-gray-400">MediSoft Medical Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={resetChat} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/50" title="محادثة جديدة">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {floating && (
            <>
              <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/50">
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/50">
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Mode Selector */}
          {showModeSelector ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-center text-gray-300 text-sm mb-4">كيف يمكنني مساعدتك اليوم؟</p>
              {modes.map(m => (
                <button
                  key={m.key}
                  onClick={() => selectMode(m.key)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.02]",
                    m.color
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                    {m.icon}
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{m.label}</p>
                    <p className="text-xs opacity-70">{m.description}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => (
                  <div key={msg.id} className={cn("flex gap-2", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                      msg.role === "user" ? "bg-blue-500/20" : "bg-teal-500/20"
                    )}>
                      {msg.role === "user" ? <User className="w-3.5 h-3.5 text-blue-400" /> : <Bot className="w-3.5 h-3.5 text-teal-400" />}
                    </div>
                    <div className={cn(
                      "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm",
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : "bg-gray-800 text-gray-200 rounded-tl-sm border border-gray-700/50"
                    )}>
                      {/* Urgency badge */}
                      {msg.urgency === "emergency" && (
                        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-red-500/20 rounded-lg border border-red-500/30">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                          <span className="text-xs text-red-400 font-medium">حالة طارئة — توجه للطوارئ فوراً</span>
                        </div>
                      )}
                      {msg.urgency === "attention" && (
                        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                          <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
                          <span className="text-xs text-yellow-400 font-medium">يحتاج متابعة طبية</span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                      {/* Suggested questions */}
                      {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-gray-700/50 space-y-1.5">
                          {msg.suggestedQuestions.map((q, i) => (
                            <button
                              key={i}
                              onClick={() => sendMessage(q)}
                              className="block w-full text-right text-xs px-2.5 py-1.5 bg-teal-500/10 text-teal-400 rounded-lg hover:bg-teal-500/20 transition-colors"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-teal-500/20 flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5 text-teal-400" />
                    </div>
                    <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 border border-gray-700/50">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-gray-700/50">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="اكتب رسالتك..."
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500/50"
                    disabled={loading}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || loading}
                    className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 text-center mt-2">
                  المساعد الطبي لا يغني عن استشارة الطبيب المختص
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );

  return chatContent;
}
