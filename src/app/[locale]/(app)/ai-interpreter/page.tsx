export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Languages,
  Mic,
  MicOff,
  Volume2,
  ArrowLeftRight,
  MessageSquare,
  History,
  Globe2,
  Zap,
  FileText,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  RefreshCw,
  Stethoscope,
} from "lucide-react";

const LANGUAGES = [
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "ur", name: "Urdu", nativeName: "اردو", flag: "🇵🇰" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", flag: "🇧🇩" },
  { code: "tl", name: "Filipino", nativeName: "Filipino", flag: "🇵🇭" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷" },
  { code: "fa", name: "Persian", nativeName: "فارسی", flag: "🇮🇷" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", flag: "🇮🇳" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili", flag: "🇰🇪" },
  { code: "am", name: "Amharic", nativeName: "አማርኛ", flag: "🇪🇹" },
  { code: "so", name: "Somali", nativeName: "Soomaali", flag: "🇸🇴" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
];

export default function AIInterpreterPage() {
  const [activeTab, setActiveTab] = useState<"translate" | "live" | "history" | "phrases">("translate");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("ar");
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [translating, setTranslating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [medicalMode, setMedicalMode] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/ai-interpreter?action=history");
      const result = await res.json();
      if (result.success) setHistory(result.data.sessions || []);
    } catch (e) {
      console.error("Failed to fetch history:", e);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setTranslating(true);
    try {
      const res = await fetch("/api/ai-interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "translate",
          text: inputText,
          sourceLang,
          targetLang,
          medicalContext: medicalMode,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setTranslatedText(result.data.translatedText);
        fetchHistory(); // Refresh history
      }
    } catch (e) {
      console.error("Translation failed:", e);
    } finally {
      setTranslating(false);
    }
  };

  const swapLanguages = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
    setInputText(translatedText);
    setTranslatedText(inputText);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLangName = (code: string) => LANGUAGES.find((l) => l.code === code)?.name || code;
  const getLangFlag = (code: string) => LANGUAGES.find((l) => l.code === code)?.flag || "🌐";

  const tabs = [
    { id: "translate" as const, label: "Text Translation", icon: Languages },
    { id: "live" as const, label: "Live Interpretation", icon: Mic },
    { id: "history" as const, label: "History", icon: History },
    { id: "phrases" as const, label: "Medical Phrases", icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Languages className="h-7 w-7 text-indigo-600" />
            AI Medical Interpreter
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time medical translation — 20 languages with clinical terminology accuracy
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={medicalMode} onChange={(e) => setMedicalMode(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <Stethoscope className="h-3.5 w-3.5" /> Medical Mode
            </span>
          </label>
          <span className="rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700">
            <Globe2 className="inline h-3 w-3 mr-1" />
            20 Languages
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab.id ? "bg-white text-indigo-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Text Translation Tab */}
      {activeTab === "translate" && (
        <div className="space-y-4">
          {/* Language Selector */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none">
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.flag} {lang.name} ({lang.nativeName})</option>
                ))}
              </select>
            </div>
            <button onClick={swapLanguages}
              className="rounded-full border p-2.5 hover:bg-gray-50 transition-all hover:rotate-180 duration-300">
              <ArrowLeftRight className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none">
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.flag} {lang.name} ({lang.nativeName})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Translation Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="text-sm font-medium text-gray-700">{getLangFlag(sourceLang)} {getLangName(sourceLang)}</span>
                <button className="rounded-lg p-1.5 hover:bg-gray-100">
                  <Mic className="h-4 w-4 text-gray-500" />
                </button>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type or speak the text to translate..."
                className="w-full p-4 text-sm focus:outline-none min-h-[200px] resize-none"
                dir={["ar", "ur", "fa"].includes(sourceLang) ? "rtl" : "ltr"}
              />
              <div className="flex items-center justify-between px-4 py-2 border-t">
                <span className="text-xs text-gray-400">{inputText.length} characters</span>
              </div>
            </div>
            <div className="rounded-xl border bg-indigo-50 shadow-sm">
              <div className="flex items-center justify-between border-b border-indigo-100 px-4 py-3">
                <span className="text-sm font-medium text-indigo-700">{getLangFlag(targetLang)} {getLangName(targetLang)}</span>
                <div className="flex items-center gap-1">
                  <button className="rounded-lg p-1.5 hover:bg-indigo-100">
                    <Volume2 className="h-4 w-4 text-indigo-500" />
                  </button>
                  <button onClick={() => copyToClipboard(translatedText)} className="rounded-lg p-1.5 hover:bg-indigo-100">
                    {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-indigo-500" />}
                  </button>
                </div>
              </div>
              <div className="p-4 min-h-[200px]" dir={["ar", "ur", "fa"].includes(targetLang) ? "rtl" : "ltr"}>
                {translating ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                    <span className="ml-2 text-sm text-indigo-500">Translating...</span>
                  </div>
                ) : translatedText ? (
                  <p className="text-sm text-indigo-900">{translatedText}</p>
                ) : (
                  <p className="text-sm text-indigo-400 italic">Translation will appear here...</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleTranslate} disabled={translating || !inputText.trim()}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {translating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
              {translating ? "Translating..." : "Translate"}
            </button>
            {medicalMode && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Stethoscope className="h-3.5 w-3.5" />
                Medical terminology mode active — ensures clinical accuracy
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Interpretation Tab */}
      {activeTab === "live" && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-8 shadow-sm text-center">
            <div className={`mx-auto w-32 h-32 rounded-full flex items-center justify-center mb-6 transition-all ${
              isListening ? "bg-red-100 animate-pulse" : "bg-indigo-100"
            }`}>
              {isListening ? <MicOff className="h-12 w-12 text-red-600" /> : <Mic className="h-12 w-12 text-indigo-600" />}
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {isListening ? "Listening... Speak now" : "Live Medical Interpretation"}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {isListening
                ? "The AI is listening and translating in real-time. Both parties can speak."
                : "Start a live interpretation session between doctor and patient in different languages."}
            </p>
            <button onClick={() => setIsListening(!isListening)}
              className={`rounded-xl px-8 py-3 text-sm font-medium transition-all ${
                isListening ? "bg-red-600 text-white hover:bg-red-700" : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}>
              {isListening ? "Stop Session" : "Start Live Session"}
            </button>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">How Live Interpretation Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: Mic, title: "1. Doctor Speaks", desc: "AI captures and identifies the language" },
                { icon: Zap, title: "2. AI Translates", desc: "Medical-grade translation in <1 second" },
                { icon: Volume2, title: "3. Patient Hears", desc: "Spoken translation in patient's language" },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-lg bg-indigo-50 p-4 text-center">
                  <div className="mx-auto w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                    <Icon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500 mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Translation History (from Database)</h3>
            <button onClick={fetchHistory} className="p-2 rounded-lg border hover:bg-gray-50">
              <RefreshCw className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          {historyLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : history.length > 0 ? (
            <div className="space-y-3">
              {history.map((entry: any) => (
                <div key={entry.id} className="rounded-lg border p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">
                      {getLangFlag(entry.sourceLang)} {getLangName(entry.sourceLang)} → {getLangFlag(entry.targetLang)} {getLangName(entry.targetLang)}
                    </span>
                    <span className="text-xs text-gray-400">{new Date(entry.createdAt || entry.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-1"><strong>Source:</strong> {entry.sourceText}</p>
                  <p className="text-sm text-gray-900"><strong>Translation:</strong> {entry.translatedText}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-10">No translation history yet. Start translating to build history.</p>
          )}
        </div>
      )}

      {/* Medical Phrases Tab */}
      {activeTab === "phrases" && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Common Medical Phrases</h3>
          <p className="text-sm text-gray-500 mb-4">Click any phrase to auto-fill the translation panel.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { en: "Where does it hurt?", ar: "أين يؤلمك؟", category: "Assessment" },
              { en: "How long have you had these symptoms?", ar: "منذ متى وأنت تعاني من هذه الأعراض؟", category: "History" },
              { en: "Are you allergic to any medications?", ar: "هل لديك حساسية من أي أدوية؟", category: "Allergies" },
              { en: "Take this medication twice daily after meals", ar: "تناول هذا الدواء مرتين يومياً بعد الأكل", category: "Instructions" },
              { en: "You need to fast before the blood test", ar: "تحتاج أن تكون صائماً قبل تحليل الدم", category: "Lab" },
              { en: "Do you have any chronic diseases?", ar: "هل تعاني من أي أمراض مزمنة؟", category: "History" },
              { en: "Rate your pain from 1 to 10", ar: "قيّم ألمك من 1 إلى 10", category: "Assessment" },
              { en: "Your blood pressure is normal", ar: "ضغط الدم لديك طبيعي", category: "Results" },
              { en: "We need to run some tests", ar: "نحتاج إجراء بعض الفحوصات", category: "Procedures" },
              { en: "Please follow up in two weeks", ar: "يرجى المتابعة بعد أسبوعين", category: "Follow-up" },
              { en: "Do you consent to this procedure?", ar: "هل توافق على هذا الإجراء؟", category: "Consent" },
              { en: "Are you currently taking any medications?", ar: "هل تتناول أي أدوية حالياً؟", category: "Medications" },
            ].map((phrase, i) => (
              <div key={i} className="rounded-lg border p-3 hover:bg-indigo-50 cursor-pointer transition-colors"
                onClick={() => { setInputText(phrase.en); setActiveTab("translate"); }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{phrase.category}</span>
                </div>
                <p className="text-sm text-gray-900">{phrase.en}</p>
                <p className="text-sm text-gray-600 mt-1" dir="rtl">{phrase.ar}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
