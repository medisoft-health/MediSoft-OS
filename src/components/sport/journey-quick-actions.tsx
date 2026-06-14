"use client";
import { useState, useRef, useEffect } from "react";

interface QuickActionsProps {
  onNoteAdded?: () => void;
}

type SheetType = "menu" | "note" | "food-ask" | "supplement-ask" | "inbody" | null;

export default function JourneyQuickActions({ onNoteAdded }: QuickActionsProps) {
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);
  const [noteContent, setNoteContent] = useState("");
  const [noteType, setNoteType] = useState("general");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setActiveSheet(null);
      }
    };
    if (activeSheet) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [activeSheet]);

  const saveNote = async () => {
    if (!noteContent.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/sport/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "quick-note", noteType, content: noteContent }),
      });
      if (res.ok) {
        setSuccess(true);
        setNoteContent("");
        onNoteAdded?.();
        setTimeout(() => { setSuccess(false); setActiveSheet(null); }, 1500);
      }
    } catch {}
    setSaving(false);
  };

  const QUICK_ACTIONS = [
    { id: "note", icon: "📝", label: "ملاحظة سريعة", sheet: "note" as SheetType },
    { id: "food", icon: "🍽️", label: "سؤال عن أكلة", sheet: "food-ask" as SheetType },
    { id: "supplement", icon: "💊", label: "سؤال عن مكمل", sheet: "supplement-ask" as SheetType },
    { id: "inbody", icon: "📊", label: "بيانات InBody", sheet: "inbody" as SheetType },
  ];

  const NOTE_TYPES = [
    { value: "general", label: "عام", icon: "📌" },
    { value: "food_question", label: "أكل", icon: "🍽️" },
    { value: "supplement_question", label: "مكمل", icon: "💊" },
    { value: "medication_question", label: "دواء", icon: "💉" },
    { value: "pain_report", label: "ألم", icon: "🤕" },
    { value: "progress_note", label: "تقدم", icon: "📈" },
  ];

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setActiveSheet(activeSheet ? null : "menu")}
        className={`fixed bottom-24 end-4 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          activeSheet ? "bg-red-500 rotate-45" : "bg-emerald-500 hover:bg-emerald-400"
        }`}
      >
        <span className="text-white text-2xl">+</span>
      </button>

      {/* Backdrop */}
      {activeSheet && (
        <div className="fixed inset-0 bg-black/50 z-40 animate-fadeIn" />
      )}

      {/* Bottom Sheet */}
      {activeSheet && (
        <div
          ref={sheetRef}
          className="fixed bottom-0 start-0 end-0 z-50 bg-gray-800 rounded-t-3xl border-t border-gray-700 animate-slideUp max-h-[80vh] overflow-y-auto"
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-gray-600" />
          </div>

          {/* Menu */}
          {activeSheet === "menu" && (
            <div className="p-4 pb-8">
              <h3 className="text-white font-bold text-lg mb-4 text-center">إضافة سريعة</h3>
              <div className="grid grid-cols-2 gap-3">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => setActiveSheet(action.sheet)}
                    className="p-5 rounded-xl bg-gray-700/50 border border-gray-600 hover:border-emerald-500 transition-all text-center"
                  >
                    <span className="text-3xl block mb-2">{action.icon}</span>
                    <span className="text-gray-300 text-sm">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Note Sheet */}
          {activeSheet === "note" && (
            <div className="p-4 pb-8">
              <h3 className="text-white font-bold text-lg mb-4">📝 ملاحظة سريعة</h3>
              
              {/* Note type selector */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {NOTE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setNoteType(t.value)}
                    className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                      noteType === t.value
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="اكتب ملاحظتك هنا... (مثلاً: أكلت وجبة غلط النهارده / حاسس بألم في الركبة)"
                className="w-full h-32 bg-gray-700 border border-gray-600 rounded-xl p-3 text-white placeholder-gray-500 resize-none focus:border-emerald-500 focus:outline-none"
                autoFocus
              />

              <button
                onClick={saveNote}
                disabled={!noteContent.trim() || saving}
                className="w-full mt-3 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 text-white font-bold rounded-xl transition-all"
              >
                {saving ? "جاري الحفظ..." : success ? "✅ تم!" : "حفظ"}
              </button>
            </div>
          )}

          {/* Food Ask Sheet */}
          {activeSheet === "food-ask" && (
            <div className="p-4 pb-8">
              <h3 className="text-white font-bold text-lg mb-2">🍽️ سؤال عن أكلة</h3>
              <p className="text-gray-400 text-sm mb-4">اسأل عن أي أكلة — هل مناسبة لهدفك؟</p>
              
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="مثال: أكلت شاورما النهارده، هل ده يأثر على الدايت؟"
                className="w-full h-28 bg-gray-700 border border-gray-600 rounded-xl p-3 text-white placeholder-gray-500 resize-none focus:border-emerald-500 focus:outline-none"
                autoFocus
              />

              <button
                onClick={() => { setNoteType("food_question"); saveNote(); }}
                disabled={!noteContent.trim() || saving}
                className="w-full mt-3 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 text-white font-bold rounded-xl transition-all"
              >
                {saving ? "جاري الإرسال..." : success ? "✅ تم!" : "إرسال السؤال"}
              </button>
              <p className="text-gray-500 text-xs mt-2 text-center">سيتم الرد عليك من MediSport Coach</p>
            </div>
          )}

          {/* Supplement Ask Sheet */}
          {activeSheet === "supplement-ask" && (
            <div className="p-4 pb-8">
              <h3 className="text-white font-bold text-lg mb-2">💊 سؤال عن مكمل</h3>
              <p className="text-gray-400 text-sm mb-4">اسأل عن أي مكمل غذائي — هل مناسب لك؟</p>
              
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="مثال: هل الكرياتين مناسب ليا؟ عندي ضغط خفيف"
                className="w-full h-28 bg-gray-700 border border-gray-600 rounded-xl p-3 text-white placeholder-gray-500 resize-none focus:border-emerald-500 focus:outline-none"
                autoFocus
              />

              <button
                onClick={() => { setNoteType("supplement_question"); saveNote(); }}
                disabled={!noteContent.trim() || saving}
                className="w-full mt-3 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 text-white font-bold rounded-xl transition-all"
              >
                {saving ? "جاري الإرسال..." : success ? "✅ تم!" : "إرسال السؤال"}
              </button>
              <p className="text-gray-500 text-xs mt-2 text-center">سيتم تحليل السؤال مع بياناتك الطبية</p>
            </div>
          )}

          {/* InBody Data Entry Sheet */}
          {activeSheet === "inbody" && (
            <InBodySheet onClose={() => setActiveSheet(null)} />
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
      `}</style>
    </>
  );
}

// ─── InBody Sub-Sheet ────────────────────────────────────────────────
function InBodySheet({ onClose }: { onClose: () => void }) {
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscleMass, setMuscleMass] = useState("");
  const [visceralFat, setVisceralFat] = useState("");
  const [bmi, setBmi] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const saveInBody = async () => {
    setSaving(true);
    try {
      // Save as body measurement
      const res = await fetch("/api/sport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-body-measurement",
          weight: parseFloat(weight) || null,
          bodyFatPct: parseFloat(bodyFat) || null,
          muscleMass: parseFloat(muscleMass) || null,
          visceralFat: parseFloat(visceralFat) || null,
          bmi: parseFloat(bmi) || null,
          source: "inbody",
        }),
      });
      if (res.ok) {
        setSuccess(true);
        // Also add journey event
        await fetch("/api/sport/journey", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "quick-note",
            noteType: "progress_note",
            content: `قياس InBody: الوزن ${weight}kg | الدهون ${bodyFat}% | العضلات ${muscleMass}kg`,
          }),
        });
        setTimeout(onClose, 1500);
      }
    } catch {}
    setSaving(false);
  };

  return (
    <div className="p-4 pb-8">
      <h3 className="text-white font-bold text-lg mb-4">📊 بيانات InBody</h3>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-gray-400 text-xs block mb-1">الوزن (kg)</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="75"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white text-center focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1">نسبة الدهون (%)</label>
          <input
            type="number"
            value={bodyFat}
            onChange={(e) => setBodyFat(e.target.value)}
            placeholder="20"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white text-center focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1">كتلة العضلات (kg)</label>
          <input
            type="number"
            value={muscleMass}
            onChange={(e) => setMuscleMass(e.target.value)}
            placeholder="35"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white text-center focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1">الدهون الحشوية</label>
          <input
            type="number"
            value={visceralFat}
            onChange={(e) => setVisceralFat(e.target.value)}
            placeholder="8"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white text-center focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="text-gray-400 text-xs block mb-1">BMI (اختياري)</label>
        <input
          type="number"
          value={bmi}
          onChange={(e) => setBmi(e.target.value)}
          placeholder="24.5"
          className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white text-center focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <button
        onClick={saveInBody}
        disabled={!weight || saving}
        className="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 text-white font-bold rounded-xl transition-all"
      >
        {saving ? "جاري الحفظ..." : success ? "✅ تم حفظ القياسات!" : "حفظ القياسات"}
      </button>
    </div>
  );
}
