"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Flame,
  MessageCircle,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface CheckInData {
  date: string;
  mood: number;
  energy: number;
  sleep: number;
  soreness: number;
  hydration: number;
  coachResponse: string;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCheckIn: string;
  totalCheckIns: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
  requirement: string;
  category: "streak" | "training" | "nutrition" | "sleep" | "milestone";
}

interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  reward: string;
  expiresIn: number; // days
}

interface JourneyMilestone {
  date: string;
  title: string;
  description: string;
  type: "start" | "achievement" | "record" | "milestone" | "progress";
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const MOOD_OPTIONS = [
  { value: 1, emoji: "😫", label: "سيء جداً" },
  { value: 2, emoji: "😟", label: "مش كويس" },
  { value: 3, emoji: "😐", label: "عادي" },
  { value: 4, emoji: "🙂", label: "كويس" },
  { value: 5, emoji: "😄", label: "ممتاز" },
];

const ENERGY_OPTIONS = [
  { value: 1, emoji: "🪫", label: "منهك" },
  { value: 2, emoji: "🔋", label: "تعبان" },
  { value: 3, emoji: "🔋🔋", label: "عادي" },
  { value: 4, emoji: "⚡", label: "نشيط" },
  { value: 5, emoji: "⚡⚡", label: "طاقة عالية" },
];

const SLEEP_OPTIONS = [
  { value: 1, emoji: "😵", label: "أقل من 4 ساعات" },
  { value: 2, emoji: "😪", label: "4-5 ساعات" },
  { value: 3, emoji: "😐", label: "6 ساعات" },
  { value: 4, emoji: "😴", label: "7-8 ساعات" },
  { value: 5, emoji: "💤", label: "8+ ساعات" },
];

const SORENESS_OPTIONS = [
  { value: 1, emoji: "🔥🔥", label: "ألم شديد" },
  { value: 2, emoji: "🔥", label: "ألم متوسط" },
  { value: 3, emoji: "😐", label: "خفيف" },
  { value: 4, emoji: "💪", label: "مرتاح" },
  { value: 5, emoji: "💪💪", label: "ممتاز" },
];

const HYDRATION_OPTIONS = [
  { value: 1, emoji: "🏜️", label: "ناسي أشرب" },
  { value: 2, emoji: "💧", label: "لتر واحد" },
  { value: 3, emoji: "💧💧", label: "2 لتر" },
  { value: 4, emoji: "💧💧💧", label: "3 لتر" },
  { value: 5, emoji: "🌊", label: "3+ لتر" },
];

const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: "first_checkin", title: "البداية", description: "أول تسجيل يومي", icon: "🌟", unlockedAt: null, requirement: "سجل أول check-in", category: "streak" },
  { id: "streak_3", title: "3 أيام متتالية", description: "حافظت 3 أيام!", icon: "🔥", unlockedAt: null, requirement: "3 أيام streak", category: "streak" },
  { id: "streak_7", title: "أسبوع كامل!", description: "7 أيام بدون انقطاع", icon: "⭐", unlockedAt: null, requirement: "7 أيام streak", category: "streak" },
  { id: "streak_14", title: "أسبوعين!", description: "14 يوم متواصل — ده إنجاز حقيقي", icon: "🏅", unlockedAt: null, requirement: "14 يوم streak", category: "streak" },
  { id: "streak_30", title: "شهر كامل!", description: "30 يوم — انت من الـ 5% اللي بيكملوا!", icon: "🏆", unlockedAt: null, requirement: "30 يوم streak", category: "streak" },
  { id: "streak_60", title: "شهرين!", description: "60 يوم — أسطورة!", icon: "👑", unlockedAt: null, requirement: "60 يوم streak", category: "streak" },
  { id: "streak_100", title: "100 يوم!", description: "مئة يوم — انت بطل حقيقي", icon: "💎", unlockedAt: null, requirement: "100 يوم streak", category: "streak" },
  { id: "early_bird", title: "الطائر المبكر", description: "سجلت قبل الساعة 7 صباحاً", icon: "🐦", unlockedAt: null, requirement: "Check-in قبل 7 صباحاً", category: "training" },
  { id: "night_owl", title: "بومة الليل", description: "سجلت تمرين بعد 10 مساءً", icon: "🦉", unlockedAt: null, requirement: "تمرين بعد 10 مساءً", category: "training" },
  { id: "hydration_hero", title: "بطل الترطيب", description: "شربت 3+ لتر 7 أيام متتالية", icon: "💦", unlockedAt: null, requirement: "3+ لتر × 7 أيام", category: "nutrition" },
  { id: "sleep_champion", title: "بطل النوم", description: "نمت 7+ ساعات 7 أيام متتالية", icon: "😴", unlockedAt: null, requirement: "7+ ساعات × 7 أيام", category: "sleep" },
  { id: "perfect_week", title: "أسبوع مثالي", description: "كل المؤشرات 4+ لأسبوع كامل", icon: "✨", unlockedAt: null, requirement: "كل المؤشرات ممتازة × 7 أيام", category: "milestone" },
  { id: "comeback", title: "العودة القوية", description: "رجعت بعد انقطاع وكملت 3 أيام", icon: "🔄", unlockedAt: null, requirement: "عودة بعد انقطاع + 3 أيام", category: "milestone" },
  { id: "total_10", title: "10 تسجيلات", description: "سجلت 10 مرات — عادة جديدة!", icon: "🎯", unlockedAt: null, requirement: "10 check-ins إجمالي", category: "milestone" },
  { id: "total_50", title: "50 تسجيل!", description: "نصف المئة — ده التزام حقيقي", icon: "🎖️", unlockedAt: null, requirement: "50 check-in إجمالي", category: "milestone" },
];

const COACH_RESPONSES: Record<string, string[]> = {
  great: [
    "ممتاز يا بطل! 💪 جسمك في حالة رائعة النهارده. استغل الطاقة دي في تمرين قوي!",
    "يوم مثالي! 🌟 كل المؤشرات عالية — ده وقت مناسب لتمرين شدة عالية.",
    "ماشاء الله عليك! 🔥 استمر على الروتين ده — واضح إنه شغال معاك.",
  ],
  good: [
    "يوم كويس! 👍 جسمك جاهز للتمرين. بس خلي بالك من الترطيب.",
    "حالتك كويسة النهارده! 💪 تمرين متوسط الشدة هيكون مثالي.",
    "ممتاز إنك سجلت! 🙂 حاول تنام أبكر شوية بكره عشان تحس بفرق أكبر.",
  ],
  moderate: [
    "يوم عادي — وده مش مشكلة! 😊 حتى تمرين خفيف (30 دقيقة مشي) هيحسن مزاجك.",
    "جسمك محتاج شوية اهتمام النهارده. 🧘 يوجا أو stretching هيكون أفضل من تمرين ثقيل.",
    "مفيش مشكلة! 💚 مش كل يوم لازم يكون مثالي. المهم إنك سجلت وبتتابع.",
  ],
  low: [
    "يوم صعب — وده طبيعي! 🤗 جسمك بيقولك محتاج راحة. خد يوم rest وارجع أقوى بكره.",
    "خد بالك من نفسك النهارده! 💙 اشرب مياه كتير، نام بدري، وبكره هتحس بفرق كبير.",
    "الراحة جزء من التقدم! 🌙 جسمك بيبني العضلات وقت الراحة مش وقت التمرين.",
  ],
};

const WEEKLY_PLAN_TEMPLATE = [
  { day: "السبت", type: "تمرين قوة", intensity: "عالية", note: "Upper Body + Core", icon: "💪" },
  { day: "الأحد", type: "كارديو", intensity: "متوسطة", note: "30-40 دقيقة جري/دراجة", icon: "🏃" },
  { day: "الاثنين", type: "راحة نشطة", intensity: "خفيفة", note: "مشي 30 دقيقة + stretching", icon: "🧘" },
  { day: "الثلاثاء", type: "تمرين قوة", intensity: "عالية", note: "Lower Body + Core", icon: "🦵" },
  { day: "الأربعاء", type: "كارديو + HIIT", intensity: "عالية", note: "20 دقيقة intervals", icon: "⚡" },
  { day: "الخميس", type: "تمرين قوة", intensity: "متوسطة", note: "Full Body خفيف", icon: "🏋️" },
  { day: "الجمعة", type: "راحة كاملة", intensity: "—", note: "تعافي + نوم كافي", icon: "😴" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getStreakData(): StreakData {
  const saved = localStorage.getItem("medisport-streak");
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return { currentStreak: 0, longestStreak: 0, lastCheckIn: "", totalCheckIns: 0 };
}

function saveStreakData(data: StreakData) {
  localStorage.setItem("medisport-streak", JSON.stringify(data));
}

function getCheckInHistory(): CheckInData[] {
  const saved = localStorage.getItem("medisport-checkins");
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return [];
}

function saveCheckInHistory(history: CheckInData[]) {
  localStorage.setItem("medisport-checkins", JSON.stringify(history));
}

function getAchievements(): Achievement[] {
  const saved = localStorage.getItem("medisport-achievements");
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return ALL_ACHIEVEMENTS;
}

function saveAchievements(achievements: Achievement[]) {
  localStorage.setItem("medisport-achievements", JSON.stringify(achievements));
}

function getCoachResponse(mood: number, energy: number, sleep: number, soreness: number): string {
  const avg = (mood + energy + sleep + soreness) / 4;
  let category: string;
  if (avg >= 4.5) category = "great";
  else if (avg >= 3.5) category = "good";
  else if (avg >= 2.5) category = "moderate";
  else category = "low";
  
  const responses = COACH_RESPONSES[category];
  return responses[Math.floor(Math.random() * responses.length)];
}

function checkNewAchievements(streak: StreakData, history: CheckInData[]): string[] {
  const achievements = getAchievements();
  const newlyUnlocked: string[] = [];
  const now = new Date().toISOString();

  // Check streak achievements
  const streakAchievements: Record<string, number> = {
    first_checkin: 1, streak_3: 3, streak_7: 7, streak_14: 14, streak_30: 30, streak_60: 60, streak_100: 100,
  };
  for (const [id, required] of Object.entries(streakAchievements)) {
    const ach = achievements.find(a => a.id === id);
    if (ach && !ach.unlockedAt && streak.currentStreak >= required) {
      ach.unlockedAt = now;
      newlyUnlocked.push(ach.title);
    }
  }

  // Check total check-ins
  if (streak.totalCheckIns >= 10) {
    const ach = achievements.find(a => a.id === "total_10");
    if (ach && !ach.unlockedAt) { ach.unlockedAt = now; newlyUnlocked.push(ach.title); }
  }
  if (streak.totalCheckIns >= 50) {
    const ach = achievements.find(a => a.id === "total_50");
    if (ach && !ach.unlockedAt) { ach.unlockedAt = now; newlyUnlocked.push(ach.title); }
  }

  // Check early bird
  const hour = new Date().getHours();
  if (hour < 7) {
    const ach = achievements.find(a => a.id === "early_bird");
    if (ach && !ach.unlockedAt) { ach.unlockedAt = now; newlyUnlocked.push(ach.title); }
  }

  // Check hydration hero (7 days of 5 hydration)
  const last7 = history.slice(-7);
  if (last7.length >= 7 && last7.every(c => c.hydration >= 4)) {
    const ach = achievements.find(a => a.id === "hydration_hero");
    if (ach && !ach.unlockedAt) { ach.unlockedAt = now; newlyUnlocked.push(ach.title); }
  }

  // Check sleep champion
  if (last7.length >= 7 && last7.every(c => c.sleep >= 4)) {
    const ach = achievements.find(a => a.id === "sleep_champion");
    if (ach && !ach.unlockedAt) { ach.unlockedAt = now; newlyUnlocked.push(ach.title); }
  }

  // Check perfect week
  if (last7.length >= 7 && last7.every(c => c.mood >= 4 && c.energy >= 4 && c.sleep >= 4 && c.soreness >= 4)) {
    const ach = achievements.find(a => a.id === "perfect_week");
    if (ach && !ach.unlockedAt) { ach.unlockedAt = now; newlyUnlocked.push(ach.title); }
  }

  saveAchievements(achievements);
  return newlyUnlocked;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Daily Check-in Component
// ═══════════════════════════════════════════════════════════════════════════════

export function DailyCheckIn() {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState(0); // 0=greeting, 1=mood, 2=energy, 3=sleep, 4=soreness, 5=hydration, 6=result
  const [mood, setMood] = React.useState(0);
  const [energy, setEnergy] = React.useState(0);
  const [sleep, setSleep] = React.useState(0);
  const [soreness, setSoreness] = React.useState(0);
  const [hydration, setHydration] = React.useState(0);
  const [coachMessage, setCoachMessage] = React.useState("");
  const [todayDone, setTodayDone] = React.useState(false);
  const [showCelebration, setShowCelebration] = React.useState(false);
  const [streak, setStreak] = React.useState<StreakData>({ currentStreak: 0, longestStreak: 0, lastCheckIn: "", totalCheckIns: 0 });

  React.useEffect(() => {
    const s = getStreakData();
    setStreak(s);
    if (s.lastCheckIn === getToday()) {
      setTodayDone(true);
    }
  }, []);

  const handleOpen = () => {
    if (todayDone) {
      toast.info("سجلت النهارده بالفعل! 👍 ارجع بكره");
      return;
    }
    setStep(0);
    setMood(0);
    setEnergy(0);
    setSleep(0);
    setSoreness(0);
    setHydration(0);
    setOpen(true);
  };

  const handleSelect = (value: number) => {
    if (step === 1) { setMood(value); setTimeout(() => setStep(2), 300); }
    else if (step === 2) { setEnergy(value); setTimeout(() => setStep(3), 300); }
    else if (step === 3) { setSleep(value); setTimeout(() => setStep(4), 300); }
    else if (step === 4) { setSoreness(value); setTimeout(() => setStep(5), 300); }
    else if (step === 5) {
      setHydration(value);
      // Generate coach response and save
      setTimeout(() => {
        const response = getCoachResponse(mood, energy, sleep, soreness);
        setCoachMessage(response);

        // Update streak
        const today = getToday();
        const currentStreak = getStreakData();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        let newStreak: StreakData;
        if (currentStreak.lastCheckIn === yesterdayStr) {
          // Continuing streak
          newStreak = {
            currentStreak: currentStreak.currentStreak + 1,
            longestStreak: Math.max(currentStreak.longestStreak, currentStreak.currentStreak + 1),
            lastCheckIn: today,
            totalCheckIns: currentStreak.totalCheckIns + 1,
          };
        } else if (currentStreak.lastCheckIn === today) {
          // Already checked in today
          newStreak = currentStreak;
        } else {
          // Streak broken
          newStreak = {
            currentStreak: 1,
            longestStreak: Math.max(currentStreak.longestStreak, 1),
            lastCheckIn: today,
            totalCheckIns: currentStreak.totalCheckIns + 1,
          };
        }

        saveStreakData(newStreak);
        setStreak(newStreak);

        // Save check-in
        const history = getCheckInHistory();
        history.push({
          date: today,
          mood,
          energy,
          sleep,
          soreness,
          hydration: value,
          coachResponse: response,
        });
        saveCheckInHistory(history);

        // Check achievements
        const newAchievements = checkNewAchievements(newStreak, history);
        if (newAchievements.length > 0) {
          setTimeout(() => {
            setShowCelebration(true);
            newAchievements.forEach(a => toast.success(`🏆 إنجاز جديد: ${a}`));
            setTimeout(() => setShowCelebration(false), 3000);
          }, 1000);
        }

        setTodayDone(true);
        setStep(6);
      }, 300);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "صباح الخير";
    if (hour < 17) return "مساء الخير";
    return "مساء النور";
  };

  const getStepQuestion = () => {
    switch (step) {
      case 1: return "إزي مزاجك النهارده؟ 😊";
      case 2: return "مستوى طاقتك إيه؟ ⚡";
      case 3: return "نمت كويس أمبارح؟ 😴";
      case 4: return "في أي ألم عضلي؟ 💪";
      case 5: return "شربت مياه قد إيه؟ 💧";
      default: return "";
    }
  };

  const getOptions = () => {
    switch (step) {
      case 1: return MOOD_OPTIONS;
      case 2: return ENERGY_OPTIONS;
      case 3: return SLEEP_OPTIONS;
      case 4: return SORENESS_OPTIONS;
      case 5: return HYDRATION_OPTIONS;
      default: return [];
    }
  };

  return (
    <>
      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
          <div className="animate-bounce text-6xl">🎉</div>
          <div className="absolute top-1/4 left-1/4 animate-ping text-4xl">⭐</div>
          <div className="absolute top-1/3 right-1/4 animate-ping text-4xl delay-100">🏆</div>
          <div className="absolute bottom-1/3 left-1/3 animate-ping text-4xl delay-200">✨</div>
        </div>
      )}

      {/* Check-in Trigger Card */}
      <Card
        className={`cursor-pointer transition-all duration-300 hover:shadow-md ${
          todayDone
            ? "border-green-200 bg-gradient-to-r from-green-50 to-emerald-50"
            : "border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 hover:border-blue-400"
        }`}
        onClick={handleOpen}
      >
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${todayDone ? "bg-green-100" : "bg-blue-100 animate-pulse"}`}>
              {todayDone ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <MessageCircle className="h-6 w-6 text-blue-600" />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm">
                {todayDone ? "تم تسجيل يومك ✓" : "سجل يومك — 30 ثانية بس!"}
              </p>
              <p className="text-xs text-muted-foreground">
                {todayDone ? "ارجع بكره عشان تحافظ على الـ Streak!" : "المدرب مستنيك يسألك كام سؤال سريع"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {streak.currentStreak > 0 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 gap-1">
                <Flame className="h-3 w-3" />
                {streak.currentStreak}
              </Badge>
            )}
            {!todayDone && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          </div>
        </CardContent>
      </Card>

      {/* Check-in Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl" hideClose={step === 6}>
          <div className="flex flex-col items-center justify-center h-full px-4">
            {/* Step 0: Greeting */}
            {step === 0 && (
              <div className="text-center space-y-6 animate-in fade-in duration-500">
                <div className="text-5xl">👋</div>
                <h2 className="text-2xl font-bold">{getGreeting()}!</h2>
                <p className="text-muted-foreground">خليني أسألك كام سؤال سريع عشان أعرف حالتك النهارده</p>
                {streak.currentStreak > 0 && (
                  <div className="flex items-center justify-center gap-2 text-orange-600">
                    <Flame className="h-5 w-5" />
                    <span className="font-bold">{streak.currentStreak} يوم متواصل!</span>
                  </div>
                )}
                <Button onClick={() => setStep(1)} className="mt-4 bg-blue-600 hover:bg-blue-700 px-8 py-6 text-lg rounded-2xl">
                  يلا نبدأ! 🚀
                </Button>
              </div>
            )}

            {/* Steps 1-5: Questions */}
            {step >= 1 && step <= 5 && (
              <div className="text-center space-y-6 w-full max-w-sm animate-in fade-in slide-in-from-right duration-300">
                {/* Progress dots */}
                <div className="flex items-center justify-center gap-2">
                  {[1,2,3,4,5].map(s => (
                    <div key={s} className={`h-2 rounded-full transition-all ${s <= step ? "w-8 bg-blue-600" : "w-4 bg-gray-200"}`} />
                  ))}
                </div>

                {/* Coach avatar + question */}
                <div className="space-y-3">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl shadow-lg">
                    🏋️
                  </div>
                  <h3 className="text-xl font-bold">{getStepQuestion()}</h3>
                </div>

                {/* Options */}
                <div className="grid grid-cols-5 gap-2">
                  {getOptions().map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleSelect(opt.value)}
                      className="flex flex-col items-center gap-1 rounded-2xl border-2 border-transparent bg-muted/50 p-3 transition-all hover:border-blue-400 hover:bg-blue-50 hover:scale-105 active:scale-95"
                    >
                      <span className="text-2xl">{opt.emoji}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 6: Result */}
            {step === 6 && (
              <div className="text-center space-y-6 w-full max-w-sm animate-in fade-in zoom-in duration-500">
                <div className="text-5xl animate-bounce">🎉</div>
                <h2 className="text-xl font-bold">تم! شكراً يا بطل</h2>
                
                {/* Coach Response */}
                <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 text-right">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        🏋️
                      </div>
                      <div>
                        <p className="text-xs font-medium text-blue-700 mb-1">MediSport Coach</p>
                        <p className="text-sm text-blue-900 leading-relaxed">{coachMessage}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Streak */}
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-orange-600">
                      <Flame className="h-6 w-6" />
                      <span className="text-3xl font-bold">{streak.currentStreak}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">يوم متواصل</p>
                  </div>
                  <div className="h-10 w-px bg-gray-200" />
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-purple-600">
                      <Trophy className="h-5 w-5" />
                      <span className="text-2xl font-bold">{streak.longestStreak}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">أعلى streak</p>
                  </div>
                  <div className="h-10 w-px bg-gray-200" />
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-green-600">
                      <Star className="h-5 w-5" />
                      <span className="text-2xl font-bold">{streak.totalCheckIns}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">إجمالي</p>
                  </div>
                </div>

                {/* Today's Summary */}
                <div className="grid grid-cols-5 gap-2 pt-2">
                  <div className="text-center">
                    <span className="text-lg">{MOOD_OPTIONS[mood - 1]?.emoji}</span>
                    <p className="text-[10px] text-muted-foreground">مزاج</p>
                  </div>
                  <div className="text-center">
                    <span className="text-lg">{ENERGY_OPTIONS[energy - 1]?.emoji}</span>
                    <p className="text-[10px] text-muted-foreground">طاقة</p>
                  </div>
                  <div className="text-center">
                    <span className="text-lg">{SLEEP_OPTIONS[sleep - 1]?.emoji}</span>
                    <p className="text-[10px] text-muted-foreground">نوم</p>
                  </div>
                  <div className="text-center">
                    <span className="text-lg">{SORENESS_OPTIONS[soreness - 1]?.emoji}</span>
                    <p className="text-[10px] text-muted-foreground">عضلات</p>
                  </div>
                  <div className="text-center">
                    <span className="text-lg">{HYDRATION_OPTIONS[hydration - 1]?.emoji}</span>
                    <p className="text-[10px] text-muted-foreground">مياه</p>
                  </div>
                </div>

                <Button onClick={() => setOpen(false)} className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg rounded-2xl">
                  تمام! 👍
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Streak Display Component
// ═══════════════════════════════════════════════════════════════════════════════

export function StreakDisplay() {
  const [streak, setStreak] = React.useState<StreakData>({ currentStreak: 0, longestStreak: 0, lastCheckIn: "", totalCheckIns: 0 });

  React.useEffect(() => {
    setStreak(getStreakData());
  }, []);

  if (streak.totalCheckIns === 0) return null;

  // Generate last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const history = getCheckInHistory();
  const checkedDays = new Set(history.map(h => h.date));

  return (
    <Card className="border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <span className="font-bold text-sm">{streak.currentStreak} يوم Streak</span>
          </div>
          <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
            أعلى: {streak.longestStreak} يوم
          </Badge>
        </div>
        {/* 7-day calendar */}
        <div className="grid grid-cols-7 gap-1">
          {last7Days.map((day, i) => {
            const isChecked = checkedDays.has(day);
            const isToday = day === getToday();
            const dayName = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"][new Date(day).getDay()];
            return (
              <div key={day} className="text-center">
                <p className="text-[9px] text-muted-foreground mb-1">{dayName}</p>
                <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                  isChecked ? "bg-orange-500 text-white" : isToday ? "border-2 border-orange-300 bg-orange-50" : "bg-gray-100"
                }`}>
                  {isChecked ? "✓" : new Date(day).getDate()}
                </div>
              </div>
            );
          })}
        </div>
        {/* Motivational message */}
        {streak.currentStreak >= 7 && (
          <p className="text-xs text-orange-700 mt-3 text-center font-medium">
            🔥 {streak.currentStreak} يوم! انت أقوى من {Math.min(95, 50 + streak.currentStreak)}% من المستخدمين!
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Journey Timeline Component
// ═══════════════════════════════════════════════════════════════════════════════

export function JourneyTimeline() {
  const [history, setHistory] = React.useState<CheckInData[]>([]);
  const [streak, setStreak] = React.useState<StreakData>({ currentStreak: 0, longestStreak: 0, lastCheckIn: "", totalCheckIns: 0 });

  React.useEffect(() => {
    setHistory(getCheckInHistory());
    setStreak(getStreakData());
  }, []);

  if (history.length === 0) return null;

  const firstDay = history[0]?.date || getToday();
  const daysSinceStart = Math.floor((Date.now() - new Date(firstDay).getTime()) / 86400000) + 1;

  // Generate milestones from history
  const milestones: JourneyMilestone[] = [
    { date: firstDay, title: "بداية الرحلة! 🚀", description: "أول يوم ليك في MediSport", type: "start" },
  ];

  if (streak.totalCheckIns >= 3) {
    milestones.push({ date: history[2]?.date || "", title: "3 تسجيلات! 🌟", description: "بدأت تبني عادة جديدة", type: "achievement" });
  }
  if (streak.totalCheckIns >= 7) {
    milestones.push({ date: history[6]?.date || "", title: "أسبوع كامل! ⭐", description: "أول أسبوع — إنجاز حقيقي!", type: "milestone" });
  }
  if (streak.longestStreak >= 14) {
    milestones.push({ date: "", title: "أسبوعين streak! 🏅", description: "14 يوم بدون انقطاع", type: "record" });
  }
  if (streak.totalCheckIns >= 30) {
    milestones.push({ date: "", title: "شهر كامل! 🏆", description: "30 تسجيل — انت ملتزم فعلاً", type: "milestone" });
  }

  // Calculate averages for last 7 days
  const last7 = history.slice(-7);
  const avgMood = last7.length > 0 ? (last7.reduce((s, c) => s + c.mood, 0) / last7.length).toFixed(1) : "—";
  const avgEnergy = last7.length > 0 ? (last7.reduce((s, c) => s + c.energy, 0) / last7.length).toFixed(1) : "—";
  const avgSleep = last7.length > 0 ? (last7.reduce((s, c) => s + c.sleep, 0) / last7.length).toFixed(1) : "—";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          رحلتك
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-blue-50 p-2">
            <p className="text-lg font-bold text-blue-700">{daysSinceStart}</p>
            <p className="text-[10px] text-muted-foreground">يوم من البداية</p>
          </div>
          <div className="rounded-lg bg-green-50 p-2">
            <p className="text-lg font-bold text-green-700">{streak.totalCheckIns}</p>
            <p className="text-[10px] text-muted-foreground">تسجيل</p>
          </div>
          <div className="rounded-lg bg-purple-50 p-2">
            <p className="text-lg font-bold text-purple-700">{Math.round((streak.totalCheckIns / daysSinceStart) * 100)}%</p>
            <p className="text-[10px] text-muted-foreground">التزام</p>
          </div>
        </div>

        {/* Averages */}
        <div className="flex items-center justify-around rounded-lg bg-muted/30 p-3">
          <div className="text-center">
            <p className="text-sm font-bold">{avgMood}</p>
            <p className="text-[10px] text-muted-foreground">مزاج</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold">{avgEnergy}</p>
            <p className="text-[10px] text-muted-foreground">طاقة</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold">{avgSleep}</p>
            <p className="text-[10px] text-muted-foreground">نوم</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-3 border-r-2 border-blue-200 pr-4 mr-2">
          {milestones.slice().reverse().map((m, i) => (
            <div key={i} className="relative">
              <div className={`absolute -right-[21px] top-1 h-3 w-3 rounded-full ${
                m.type === "start" ? "bg-green-500" : m.type === "milestone" ? "bg-purple-500" : m.type === "record" ? "bg-orange-500" : "bg-blue-500"
              }`} />
              <div>
                <p className="text-sm font-medium">{m.title}</p>
                <p className="text-xs text-muted-foreground">{m.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Weekly Challenge Component
// ═══════════════════════════════════════════════════════════════════════════════

export function WeeklyChallenges() {
  const [challenges, setChallenges] = React.useState<WeeklyChallenge[]>([]);

  React.useEffect(() => {
    // Generate challenges based on user data
    const history = getCheckInHistory();
    const last7 = history.slice(-7);
    
    const generatedChallenges: WeeklyChallenge[] = [];
    
    // Sleep challenge if sleep is low
    const avgSleep = last7.length > 0 ? last7.reduce((s, c) => s + c.sleep, 0) / last7.length : 3;
    if (avgSleep < 4) {
      generatedChallenges.push({
        id: "sleep_challenge",
        title: "تحدي النوم 😴",
        description: "نام 7+ ساعات 5 أيام هذا الأسبوع",
        target: 5,
        current: last7.filter(c => c.sleep >= 4).length,
        unit: "أيام",
        reward: "🏅 بطل النوم",
        expiresIn: 7 - new Date().getDay(),
      });
    }

    // Hydration challenge
    const avgHydration = last7.length > 0 ? last7.reduce((s, c) => s + c.hydration, 0) / last7.length : 3;
    if (avgHydration < 4) {
      generatedChallenges.push({
        id: "hydration_challenge",
        title: "تحدي الترطيب 💧",
        description: "اشرب 3+ لتر مياه 5 أيام",
        target: 5,
        current: last7.filter(c => c.hydration >= 4).length,
        unit: "أيام",
        reward: "🏅 الجسم المرطب",
        expiresIn: 7 - new Date().getDay(),
      });
    }

    // Streak challenge
    const streak = getStreakData();
    if (streak.currentStreak < 7) {
      generatedChallenges.push({
        id: "streak_challenge",
        title: "تحدي الاستمرارية 🔥",
        description: "سجل يومك 7 أيام متتالية",
        target: 7,
        current: streak.currentStreak,
        unit: "أيام",
        reward: "🏅 أسبوع كامل",
        expiresIn: 7,
      });
    }

    // Mood challenge
    generatedChallenges.push({
      id: "mood_challenge",
      title: "تحدي الإيجابية 😄",
      description: "خلي مزاجك 4+ لمدة 4 أيام",
      target: 4,
      current: last7.filter(c => c.mood >= 4).length,
      unit: "أيام",
      reward: "🏅 المتفائل",
      expiresIn: 7 - new Date().getDay(),
    });

    setChallenges(generatedChallenges.slice(0, 3)); // Max 3 challenges
  }, []);

  if (challenges.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-purple-600" />
          تحديات الأسبوع
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {challenges.map((challenge) => {
          const progress = Math.min(100, (challenge.current / challenge.target) * 100);
          const isComplete = challenge.current >= challenge.target;
          return (
            <div key={challenge.id} className={`rounded-xl p-3 ${isComplete ? "bg-green-50 border border-green-200" : "bg-muted/30"}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">{challenge.title}</p>
                {isComplete ? (
                  <Badge className="bg-green-100 text-green-700 text-xs">مكتمل! ✓</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">باقي {challenge.expiresIn} أيام</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-2">{challenge.description}</p>
              {/* Progress bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isComplete ? "bg-green-500" : "bg-blue-500"}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs font-medium">{challenge.current}/{challenge.target}</span>
              </div>
              {isComplete && (
                <p className="text-xs text-green-700 mt-1 font-medium">🎉 مبروك! حصلت على: {challenge.reward}</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Achievements Component
// ═══════════════════════════════════════════════════════════════════════════════

export function AchievementsDisplay() {
  const [open, setOpen] = React.useState(false);
  const [achievements, setAchievements] = React.useState<Achievement[]>([]);

  React.useEffect(() => {
    setAchievements(getAchievements());
  }, []);

  const unlocked = achievements.filter(a => a.unlockedAt);
  const locked = achievements.filter(a => !a.unlockedAt);

  if (achievements.length === 0) return null;

  return (
    <>
      {/* Compact display */}
      <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => setOpen(true)}>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <Award className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">إنجازاتي</p>
              <p className="text-xs text-muted-foreground">{unlocked.length}/{achievements.length} مفتوح</p>
            </div>
          </div>
          <div className="flex -space-x-1">
            {unlocked.slice(0, 5).map((a, i) => (
              <span key={i} className="text-lg">{a.icon}</span>
            ))}
            {unlocked.length > 5 && <span className="text-xs text-muted-foreground ml-2">+{unlocked.length - 5}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Full achievements sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader className="text-center pb-4">
            <SheetTitle className="flex items-center justify-center gap-2">
              <Award className="h-5 w-5 text-amber-600" />
              إنجازاتي ({unlocked.length}/{achievements.length})
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto max-h-[calc(80vh-100px)] space-y-4 px-2">
            {/* Unlocked */}
            {unlocked.length > 0 && (
              <div>
                <p className="text-sm font-medium text-green-700 mb-2">✓ مفتوح ({unlocked.length})</p>
                <div className="grid grid-cols-3 gap-2">
                  {unlocked.map(a => (
                    <div key={a.id} className="text-center rounded-xl bg-gradient-to-b from-amber-50 to-yellow-50 border border-amber-200 p-3">
                      <span className="text-3xl block mb-1">{a.icon}</span>
                      <p className="text-[11px] font-medium leading-tight">{a.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Locked */}
            {locked.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">🔒 مقفول ({locked.length})</p>
                <div className="grid grid-cols-3 gap-2">
                  {locked.map(a => (
                    <div key={a.id} className="text-center rounded-xl bg-gray-50 border border-gray-200 p-3 opacity-60">
                      <span className="text-3xl block mb-1 grayscale">🔒</span>
                      <p className="text-[11px] font-medium leading-tight">{a.title}</p>
                      <p className="text-[9px] text-muted-foreground">{a.requirement}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Weekly Plan Component
// ═══════════════════════════════════════════════════════════════════════════════

export function WeeklyPlan() {
  const today = new Date().getDay(); // 0=Sunday

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4 text-indigo-600" />
          خطة الأسبوع
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {WEEKLY_PLAN_TEMPLATE.map((day, i) => {
            // Map: Saturday=0 in our array, but getDay() Saturday=6
            const dayIndex = (i + 6) % 7; // Adjust for Saturday start
            const isToday = dayIndex === today;
            const isPast = dayIndex < today;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-lg p-2 transition-all ${
                  isToday ? "bg-blue-50 border border-blue-200 shadow-sm" : isPast ? "opacity-50" : ""
                }`}
              >
                <span className="text-lg">{day.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${isToday ? "text-blue-700" : ""}`}>{day.day}</p>
                    {isToday && <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">اليوم</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{day.type} — {day.note}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${
                  day.intensity === "عالية" ? "border-red-200 text-red-600" :
                  day.intensity === "متوسطة" ? "border-yellow-200 text-yellow-700" :
                  day.intensity === "خفيفة" ? "border-green-200 text-green-600" : "border-gray-200"
                }`}>
                  {day.intensity}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Smart Notifications Component
// ═══════════════════════════════════════════════════════════════════════════════

export function SmartNotifications() {
  const [notifications, setNotifications] = React.useState<Array<{ id: string; message: string; icon: string; type: string; time: string }>>([]);

  React.useEffect(() => {
    const history = getCheckInHistory();
    const streak = getStreakData();
    const now = new Date();
    const hour = now.getHours();
    const notifs: Array<{ id: string; message: string; icon: string; type: string; time: string }> = [];

    // Generate contextual notifications
    if (hour < 10 && streak.lastCheckIn !== getToday()) {
      notifs.push({ id: "morning", message: "صباح الخير! سجل يومك في 30 ثانية 💪", icon: "☀️", type: "reminder", time: "الآن" });
    }

    if (streak.currentStreak > 0 && streak.lastCheckIn !== getToday()) {
      notifs.push({ id: "streak_warn", message: `عندك ${streak.currentStreak} يوم streak — متكسرهاش! 🔥`, icon: "⚠️", type: "warning", time: "تذكير" });
    }

    const last = history[history.length - 1];
    if (last) {
      if (last.sleep <= 2) {
        notifs.push({ id: "sleep_tip", message: "نومك أمبارح كان قليل — حاول تنام بدري النهارده 🌙", icon: "😴", type: "tip", time: "نصيحة" });
      }
      if (last.hydration <= 2) {
        notifs.push({ id: "water_tip", message: "تذكير: اشرب مياه! هدفك 3 لتر يومياً 💧", icon: "💧", type: "tip", time: "تذكير" });
      }
      if (last.soreness <= 2) {
        notifs.push({ id: "recovery_tip", message: "عضلاتك متعبة — خد يوم راحة أو تمرين خفيف 🧘", icon: "🩹", type: "tip", time: "نصيحة" });
      }
    }

    if (streak.currentStreak >= 7) {
      notifs.push({ id: "motivation", message: `${streak.currentStreak} يوم متواصل! انت من الـ ${Math.max(5, 100 - streak.currentStreak)}% الأفضل 🏆`, icon: "🌟", type: "motivation", time: "إنجاز" });
    }

    setNotifications(notifs.slice(0, 4));
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="space-y-2">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
            notif.type === "warning" ? "bg-amber-50" :
            notif.type === "motivation" ? "bg-purple-50" :
            notif.type === "tip" ? "bg-blue-50" : "bg-green-50"
          }`}
        >
          <span className="text-lg shrink-0">{notif.icon}</span>
          <div className="flex-1">
            <p className="text-sm">{notif.message}</p>
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">{notif.time}</span>
        </div>
      ))}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// Before/After Visual + Body Measurements Tracker
// ═══════════════════════════════════════════════════════════════════════════════

interface BodyMeasurement {
  date: string;
  weight: number;
  chest: number;
  waist: number;
  hips: number;
  arm: number;
  thigh: number;
  bodyFat: number;
  notes: string;
}

function getBodyMeasurements(): BodyMeasurement[] {
  const saved = localStorage.getItem("medisport-measurements");
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return [];
}

function saveBodyMeasurements(data: BodyMeasurement[]) {
  localStorage.setItem("medisport-measurements", JSON.stringify(data));
}

export function BeforeAfterTracker() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [measurements, setMeasurements] = React.useState<BodyMeasurement[]>([]);
  const [showForm, setShowForm] = React.useState(false);
  const [compareMode, setCompareMode] = React.useState(false);
  const [selectedIndices, setSelectedIndices] = React.useState<[number, number]>([0, 0]);
  const [form, setForm] = React.useState({
    weight: "", chest: "", waist: "", hips: "", arm: "", thigh: "", bodyFat: "", notes: ""
  });

  React.useEffect(() => {
    setMeasurements(getBodyMeasurements());
  }, []);

  const handleSave = () => {
    const newMeasurement: BodyMeasurement = {
      date: getToday(),
      weight: parseFloat(form.weight) || 0,
      chest: parseFloat(form.chest) || 0,
      waist: parseFloat(form.waist) || 0,
      hips: parseFloat(form.hips) || 0,
      arm: parseFloat(form.arm) || 0,
      thigh: parseFloat(form.thigh) || 0,
      bodyFat: parseFloat(form.bodyFat) || 0,
      notes: form.notes,
    };
    const updated = [...measurements, newMeasurement];
    setMeasurements(updated);
    saveBodyMeasurements(updated);
    setForm({ weight: "", chest: "", waist: "", hips: "", arm: "", thigh: "", bodyFat: "", notes: "" });
    setShowForm(false);
    toast.success("تم حفظ القياسات! 📏");
  };

  const getChange = (current: number, previous: number) => {
    const diff = current - previous;
    if (diff === 0) return { text: "ثابت", color: "text-gray-500", arrow: "→" };
    if (diff > 0) return { text: `+${diff.toFixed(1)}`, color: "text-red-500", arrow: "↑" };
    return { text: `${diff.toFixed(1)}`, color: "text-green-500", arrow: "↓" };
  };

  const getWaistChange = (current: number, previous: number) => {
    const diff = current - previous;
    if (diff === 0) return { text: "ثابت", color: "text-gray-500", arrow: "→" };
    if (diff < 0) return { text: `${diff.toFixed(1)}`, color: "text-green-500", arrow: "↓" };
    return { text: `+${diff.toFixed(1)}`, color: "text-red-500", arrow: "↑" };
  };

  const latest = measurements.length > 0 ? measurements[measurements.length - 1] : null;
  const first = measurements.length > 0 ? measurements[0] : null;

  const BODY_PARTS = [
    { key: "chest", label: "الصدر", icon: "💪", unit: "سم" },
    { key: "waist", label: "الوسط", icon: "📏", unit: "سم" },
    { key: "hips", label: "الأرداف", icon: "🦵", unit: "سم" },
    { key: "arm", label: "الذراع", icon: "💪", unit: "سم" },
    { key: "thigh", label: "الفخذ", icon: "🦵", unit: "سم" },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Card className="cursor-pointer border-2 border-dashed border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 transition-all hover:border-violet-400 hover:shadow-lg">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-2xl text-white shadow-lg">
              📸
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-violet-900">قبل وبعد — تتبع التغيير</h3>
              <p className="text-xs text-violet-600">سجل قياساتك وشوف رحلة التحول بصرياً</p>
            </div>
            <div className="flex flex-col items-center">
              {measurements.length > 0 ? (
                <>
                  <span className="text-2xl font-bold text-violet-700">{measurements.length}</span>
                  <span className="text-[10px] text-violet-500">قياس</span>
                </>
              ) : (
                <Badge className="bg-violet-500 text-white">ابدأ</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-center pb-4">
          <SheetTitle className="text-xl">📸 قبل وبعد — تتبع التغيير</SheetTitle>
        </SheetHeader>

        {/* Summary Cards */}
        {latest && first && measurements.length >= 2 && (
          <div className="mb-6 space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                من {first.date} إلى {latest.date} ({measurements.length} قياس)
              </p>
            </div>

            {/* Weight Progress */}
            <div className="rounded-2xl bg-gradient-to-r from-violet-100 to-fuchsia-100 p-4">
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">البداية</p>
                  <p className="text-2xl font-bold text-violet-700">{first.weight}</p>
                  <p className="text-xs">كجم</p>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-3xl">→</span>
                  <span className={`text-sm font-bold ${getChange(latest.weight, first.weight).color}`}>
                    {getChange(latest.weight, first.weight).text} كجم
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">الآن</p>
                  <p className="text-2xl font-bold text-violet-700">{latest.weight}</p>
                  <p className="text-xs">كجم</p>
                </div>
              </div>
            </div>

            {/* Body Fat Progress */}
            {first.bodyFat > 0 && latest.bodyFat > 0 && (
              <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">نسبة الدهون (البداية)</p>
                    <p className="text-xl font-bold text-amber-700">{first.bodyFat}%</p>
                  </div>
                  <span className={`text-lg font-bold ${getWaistChange(latest.bodyFat, first.bodyFat).color}`}>
                    {getWaistChange(latest.bodyFat, first.bodyFat).arrow} {getWaistChange(latest.bodyFat, first.bodyFat).text}%
                  </span>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">نسبة الدهون (الآن)</p>
                    <p className="text-xl font-bold text-amber-700">{latest.bodyFat}%</p>
                  </div>
                </div>
              </div>
            )}

            {/* Body Measurements Comparison */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-center">📏 مقارنة القياسات</h4>
              <div className="grid grid-cols-1 gap-2">
                {BODY_PARTS.map(part => {
                  const currentVal = latest[part.key as keyof BodyMeasurement] as number;
                  const firstVal = first[part.key as keyof BodyMeasurement] as number;
                  if (!currentVal || !firstVal) return null;
                  const change = part.key === "waist" ? getWaistChange(currentVal, firstVal) : getChange(firstVal, currentVal);
                  return (
                    <div key={part.key} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm border">
                      <div className="flex items-center gap-2">
                        <span>{part.icon}</span>
                        <span className="text-sm font-medium">{part.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{firstVal} {part.unit}</span>
                        <span className="text-lg">{change.arrow}</span>
                        <span className="text-sm font-bold">{currentVal} {part.unit}</span>
                        <span className={`text-xs font-bold ${change.color}`}>{change.text}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Compare Any Two */}
            {measurements.length >= 3 && (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setCompareMode(!compareMode)}
                >
                  {compareMode ? "إخفاء المقارنة" : "🔄 قارن بين أي قياسين"}
                </Button>
                {compareMode && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-center mb-1">القياس الأول</p>
                      <div className="space-y-1">
                        {measurements.map((m, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedIndices([i, selectedIndices[1]])}
                            className={`w-full rounded-lg p-2 text-xs text-center transition-all ${
                              selectedIndices[0] === i ? "bg-violet-500 text-white" : "bg-gray-100 hover:bg-gray-200"
                            }`}
                          >
                            {m.date} ({m.weight} كجم)
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-center mb-1">القياس الثاني</p>
                      <div className="space-y-1">
                        {measurements.map((m, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedIndices([selectedIndices[0], i])}
                            className={`w-full rounded-lg p-2 text-xs text-center transition-all ${
                              selectedIndices[1] === i ? "bg-fuchsia-500 text-white" : "bg-gray-100 hover:bg-gray-200"
                            }`}
                          >
                            {m.date} ({m.weight} كجم)
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Measurement History */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-center">📋 سجل القياسات</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {[...measurements].reverse().map((m, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-sm">
                    <div>
                      <p className="font-medium">{m.date}</p>
                      {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                    </div>
                    <div className="text-left">
                      <p className="font-bold">{m.weight} كجم</p>
                      {m.bodyFat > 0 && <p className="text-xs text-muted-foreground">دهون: {m.bodyFat}%</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {measurements.length < 2 && !showForm && (
          <div className="text-center py-8 space-y-4">
            <div className="text-6xl">📏</div>
            <h3 className="text-lg font-bold">ابدأ تتبع تغييرك!</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              سجل قياسات جسمك بانتظام (كل أسبوع أو أسبوعين) وشوف التغيير بصرياً.
              {measurements.length === 1 && " عندك قياس واحد — سجل التاني عشان نقارن!"}
            </p>
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto text-center">
              <div className="rounded-xl bg-violet-50 p-3">
                <span className="text-2xl">📊</span>
                <p className="text-[10px] mt-1">مقارنة بصرية</p>
              </div>
              <div className="rounded-xl bg-fuchsia-50 p-3">
                <span className="text-2xl">📈</span>
                <p className="text-[10px] mt-1">تتبع التقدم</p>
              </div>
              <div className="rounded-xl bg-pink-50 p-3">
                <span className="text-2xl">🎯</span>
                <p className="text-[10px] mt-1">حقق هدفك</p>
              </div>
            </div>
          </div>
        )}

        {/* Add Measurement Form */}
        {showForm ? (
          <div className="space-y-4 mt-4">
            <h4 className="text-sm font-semibold text-center">📝 سجل قياسات جديدة</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">الوزن (كجم) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.weight}
                  onChange={e => setForm({ ...form, weight: e.target.value })}
                  className="w-full rounded-xl border p-2 text-center text-lg font-bold"
                  placeholder="75.5"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">نسبة الدهون (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.bodyFat}
                  onChange={e => setForm({ ...form, bodyFat: e.target.value })}
                  className="w-full rounded-xl border p-2 text-center text-lg font-bold"
                  placeholder="20.0"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">الصدر (سم)</label>
                <input
                  type="number"
                  step="0.5"
                  value={form.chest}
                  onChange={e => setForm({ ...form, chest: e.target.value })}
                  className="w-full rounded-xl border p-2 text-center"
                  placeholder="100"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">الوسط (سم)</label>
                <input
                  type="number"
                  step="0.5"
                  value={form.waist}
                  onChange={e => setForm({ ...form, waist: e.target.value })}
                  className="w-full rounded-xl border p-2 text-center"
                  placeholder="85"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">الأرداف (سم)</label>
                <input
                  type="number"
                  step="0.5"
                  value={form.hips}
                  onChange={e => setForm({ ...form, hips: e.target.value })}
                  className="w-full rounded-xl border p-2 text-center"
                  placeholder="95"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">الذراع (سم)</label>
                <input
                  type="number"
                  step="0.5"
                  value={form.arm}
                  onChange={e => setForm({ ...form, arm: e.target.value })}
                  className="w-full rounded-xl border p-2 text-center"
                  placeholder="35"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">الفخذ (سم)</label>
                <input
                  type="number"
                  step="0.5"
                  value={form.thigh}
                  onChange={e => setForm({ ...form, thigh: e.target.value })}
                  className="w-full rounded-xl border p-2 text-center"
                  placeholder="55"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">ملاحظات</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-xl border p-2 text-center text-sm"
                  placeholder="بعد تمرين / صيام..."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={!form.weight} className="flex-1 bg-violet-600 hover:bg-violet-700">
                💾 حفظ القياسات
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                إلغاء
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full mt-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-600 hover:to-fuchsia-600"
          >
            ➕ سجل قياسات جديدة
          </Button>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mood/Energy/Sleep Visual Chart (Line Chart using pure CSS/SVG)
// ═══════════════════════════════════════════════════════════════════════════════

export function MoodEnergyChart() {
  const [history, setHistory] = React.useState<CheckInData[]>([]);
  const [period, setPeriod] = React.useState<7 | 14 | 30>(7);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    setHistory(getCheckInHistory());
  }, []);

  const recentData = history.slice(-period);

  // Calculate averages
  const avgMood = recentData.length > 0 ? (recentData.reduce((s, d) => s + d.mood, 0) / recentData.length).toFixed(1) : "—";
  const avgEnergy = recentData.length > 0 ? (recentData.reduce((s, d) => s + d.energy, 0) / recentData.length).toFixed(1) : "—";
  const avgSleep = recentData.length > 0 ? (recentData.reduce((s, d) => s + d.sleep, 0) / recentData.length).toFixed(1) : "—";
  const avgSoreness = recentData.length > 0 ? (recentData.reduce((s, d) => s + d.soreness, 0) / recentData.length).toFixed(1) : "—";
  const avgHydration = recentData.length > 0 ? (recentData.reduce((s, d) => s + d.hydration, 0) / recentData.length).toFixed(1) : "—";

  // Trend calculation
  const getTrend = (key: keyof CheckInData) => {
    if (recentData.length < 3) return "neutral";
    const recent3 = recentData.slice(-3);
    const older3 = recentData.slice(-6, -3);
    if (older3.length === 0) return "neutral";
    const recentAvg = recent3.reduce((s, d) => s + (d[key] as number), 0) / recent3.length;
    const olderAvg = older3.reduce((s, d) => s + (d[key] as number), 0) / older3.length;
    if (recentAvg > olderAvg + 0.3) return "up";
    if (recentAvg < olderAvg - 0.3) return "down";
    return "neutral";
  };

  const trendIcon = (trend: string) => {
    if (trend === "up") return "📈";
    if (trend === "down") return "📉";
    return "➡️";
  };

  const trendColor = (trend: string, positive: boolean = true) => {
    if (trend === "up") return positive ? "text-green-600" : "text-red-600";
    if (trend === "down") return positive ? "text-red-600" : "text-green-600";
    return "text-gray-500";
  };

  // SVG Chart rendering
  const chartWidth = 320;
  const chartHeight = 120;
  const padding = 20;

  const renderLine = (data: number[], color: string) => {
    if (data.length < 2) return null;
    const maxVal = 5;
    const minVal = 1;
    const xStep = (chartWidth - padding * 2) / (data.length - 1);
    const yScale = (chartHeight - padding * 2) / (maxVal - minVal);

    const points = data.map((val, i) => ({
      x: padding + i * xStep,
      y: chartHeight - padding - (val - minVal) * yScale,
    }));

    const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    return (
      <g>
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={color} stroke="white" strokeWidth="1.5" />
        ))}
      </g>
    );
  };

  const METRICS = [
    { key: "mood" as keyof CheckInData, label: "المزاج", emoji: "😊", color: "#8b5cf6", avg: avgMood },
    { key: "energy" as keyof CheckInData, label: "الطاقة", emoji: "⚡", color: "#f59e0b", avg: avgEnergy },
    { key: "sleep" as keyof CheckInData, label: "النوم", emoji: "😴", color: "#3b82f6", avg: avgSleep },
    { key: "soreness" as keyof CheckInData, label: "الألم العضلي", emoji: "💪", color: "#ef4444", avg: avgSoreness },
    { key: "hydration" as keyof CheckInData, label: "الترطيب", emoji: "💧", color: "#06b6d4", avg: avgHydration },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Card className="cursor-pointer border-2 border-dashed border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50 transition-all hover:border-cyan-400 hover:shadow-lg">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 text-2xl text-white shadow-lg">
              📊
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-cyan-900">تحليل المزاج والطاقة</h3>
              <p className="text-xs text-cyan-600">شوف الـ trends بتاعتك على مدار الأيام</p>
            </div>
            <div className="flex flex-col items-center">
              {history.length > 0 ? (
                <>
                  <span className="text-2xl font-bold text-cyan-700">{history.length}</span>
                  <span className="text-[10px] text-cyan-500">يوم</span>
                </>
              ) : (
                <Badge className="bg-cyan-500 text-white">سجل أولاً</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-center pb-4">
          <SheetTitle className="text-xl">📊 تحليل المزاج والطاقة</SheetTitle>
        </SheetHeader>

        {history.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="text-6xl">📊</div>
            <h3 className="text-lg font-bold">مفيش بيانات لسه!</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              سجل يومك من خلال «سجل يومك» وهنبدأ نعرضلك الـ trends هنا.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Period Selector */}
            <div className="flex justify-center gap-2">
              {([7, 14, 30] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    period === p ? "bg-cyan-500 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {p} يوم
                </button>
              ))}
            </div>

            {/* Average Cards */}
            <div className="grid grid-cols-5 gap-2">
              {METRICS.map(m => {
                const trend = getTrend(m.key);
                const isNegative = m.key === "soreness";
                return (
                  <div key={m.key} className="text-center rounded-xl bg-white p-2 shadow-sm border">
                    <span className="text-lg">{m.emoji}</span>
                    <p className="text-lg font-bold mt-1" style={{ color: m.color }}>{m.avg}</p>
                    <p className="text-[9px] text-muted-foreground">{m.label}</p>
                    <span className={`text-xs ${trendColor(trend, !isNegative)}`}>{trendIcon(trend)}</span>
                  </div>
                );
              })}
            </div>

            {/* SVG Chart */}
            <div className="rounded-2xl bg-white p-4 shadow-sm border">
              <h4 className="text-sm font-semibold text-center mb-3">📈 الاتجاهات (آخر {period} يوم)</h4>
              <div className="flex justify-center overflow-x-auto">
                <svg width={chartWidth} height={chartHeight + 10} className="mx-auto">
                  {/* Grid lines */}
                  {[1, 2, 3, 4, 5].map(v => {
                    const y = chartHeight - padding - ((v - 1) / 4) * (chartHeight - padding * 2);
                    return (
                      <g key={v}>
                        <line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="#e5e7eb" strokeWidth="0.5" />
                        <text x={padding - 5} y={y + 3} textAnchor="end" fontSize="8" fill="#9ca3af">{v}</text>
                      </g>
                    );
                  })}
                  {/* Date labels */}
                  {recentData.map((d, i) => {
                    if (recentData.length > 10 && i % 3 !== 0) return null;
                    const x = padding + i * ((chartWidth - padding * 2) / Math.max(recentData.length - 1, 1));
                    return (
                      <text key={i} x={x} y={chartHeight + 5} textAnchor="middle" fontSize="7" fill="#9ca3af">
                        {d.date.slice(5)}
                      </text>
                    );
                  })}
                  {/* Lines */}
                  {renderLine(recentData.map(d => d.mood), "#8b5cf6")}
                  {renderLine(recentData.map(d => d.energy), "#f59e0b")}
                  {renderLine(recentData.map(d => d.sleep), "#3b82f6")}
                </svg>
              </div>
              {/* Legend */}
              <div className="flex justify-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-4 rounded-full" style={{ backgroundColor: "#8b5cf6" }} />
                  <span className="text-[10px]">المزاج</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-4 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                  <span className="text-[10px]">الطاقة</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-4 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
                  <span className="text-[10px]">النوم</span>
                </div>
              </div>
            </div>

            {/* Soreness + Hydration Chart */}
            <div className="rounded-2xl bg-white p-4 shadow-sm border">
              <h4 className="text-sm font-semibold text-center mb-3">💪💧 الألم العضلي والترطيب</h4>
              <div className="flex justify-center overflow-x-auto">
                <svg width={chartWidth} height={chartHeight + 10} className="mx-auto">
                  {[1, 2, 3, 4, 5].map(v => {
                    const y = chartHeight - padding - ((v - 1) / 4) * (chartHeight - padding * 2);
                    return (
                      <g key={v}>
                        <line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="#e5e7eb" strokeWidth="0.5" />
                        <text x={padding - 5} y={y + 3} textAnchor="end" fontSize="8" fill="#9ca3af">{v}</text>
                      </g>
                    );
                  })}
                  {renderLine(recentData.map(d => d.soreness), "#ef4444")}
                  {renderLine(recentData.map(d => d.hydration), "#06b6d4")}
                </svg>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-4 rounded-full" style={{ backgroundColor: "#ef4444" }} />
                  <span className="text-[10px]">الألم العضلي</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-4 rounded-full" style={{ backgroundColor: "#06b6d4" }} />
                  <span className="text-[10px]">الترطيب</span>
                </div>
              </div>
            </div>

            {/* Daily Breakdown Table */}
            <div className="rounded-2xl bg-white p-4 shadow-sm border">
              <h4 className="text-sm font-semibold text-center mb-3">📋 تفاصيل يومية</h4>
              <div className="overflow-x-auto max-h-48">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="p-1.5 text-right">التاريخ</th>
                      <th className="p-1.5">😊</th>
                      <th className="p-1.5">⚡</th>
                      <th className="p-1.5">😴</th>
                      <th className="p-1.5">💪</th>
                      <th className="p-1.5">💧</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...recentData].reverse().map((d, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-1.5 text-right font-medium">{d.date.slice(5)}</td>
                        <td className="p-1.5 text-center">{d.mood}/5</td>
                        <td className="p-1.5 text-center">{d.energy}/5</td>
                        <td className="p-1.5 text-center">{d.sleep}/5</td>
                        <td className="p-1.5 text-center">{d.soreness}/5</td>
                        <td className="p-1.5 text-center">{d.hydration}/5</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI Insight */}
            <div className="rounded-2xl bg-gradient-to-r from-cyan-50 to-blue-50 p-4 border border-cyan-200">
              <div className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-cyan-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-cyan-800">تحليل AI</h4>
                  <p className="text-xs text-cyan-700 mt-1">
                    {recentData.length >= 3 ? (
                      <>
                        بناءً على آخر {recentData.length} يوم: متوسط مزاجك {avgMood}/5 وطاقتك {avgEnergy}/5.
                        {parseFloat(avgMood as string) >= 4 && parseFloat(avgEnergy as string) >= 4
                          ? " أداء ممتاز! استمر على الروتين ده — واضح إنه بيشتغل معاك. 💪"
                          : parseFloat(avgSleep as string) < 3
                          ? " نومك يحتاج تحسين — هذا يؤثر على كل شيء آخر. حاول النوم 7-8 ساعات. 😴"
                          : parseFloat(avgSoreness as string) >= 4
                          ? " الألم العضلي عالي — خد يوم أو اتنين راحة وركز على الـ stretching. 🧘"
                          : " حالتك مستقرة. حاول تزود الترطيب وتنام أبكر عشان تشوف تحسن أكبر. 💚"
                        }
                      </>
                    ) : (
                      "سجل 3 أيام على الأقل عشان نقدر نحللك الـ trends بشكل دقيق."
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
