"use client";

import * as React from "react";
import {
  Activity,
  Apple,
  Award,
  Brain,
  Check,
  Dumbbell,
  Flame,
  Heart,
  Loader2,
  Moon,
  Plus,
  Sparkles,
  Target,
  Droplets,
  Shield,
  Zap,
  Clock,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { usePatientContext } from "./patient-context-provider";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
interface HealthGoal {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  icon: string;
  progress: number; // 0-100
  milestones: Milestone[];
  recommendations: string[];
  startDate: string;
  targetDate?: string;
  status: "active" | "completed" | "paused";
}

interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  completedDate?: string;
}

type GoalCategory =
  | "weight_loss"
  | "muscle_gain"
  | "better_sleep"
  | "more_energy"
  | "heart_health"
  | "diabetes_control"
  | "stress_reduction"
  | "longevity"
  | "nutrition"
  | "fitness"
  | "mental_health"
  | "custom";

// ─────────────────────────────────────────────────────────────────
// Predefined Goals Library (Atheal-inspired)
// ─────────────────────────────────────────────────────────────────
interface GoalTemplate {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  category: GoalCategory;
  icon: string;
  color: string;
  milestones: string[];
  recommendations: string[];
}

const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: "weight_loss",
    title: "إنقاص الوزن",
    titleEn: "Weight Loss",
    description: "خسارة وزن صحية ومستدامة بدون حرمان",
    category: "weight_loss",
    icon: "⚖️",
    color: "from-orange-500 to-red-500",
    milestones: [
      "تسجيل الأكل يومياً لمدة أسبوع",
      "شرب 2 لتر ماء يومياً",
      "المشي 30 دقيقة يومياً",
      "خسارة أول 2 كيلو",
      "الحفاظ على الوزن الجديد لشهر",
    ],
    recommendations: [
      "قلل السكريات والمشروبات الغازية تدريجياً",
      "تناول البروتين في كل وجبة",
      "نام 7-8 ساعات — قلة النوم تزيد الجوع",
      "امشِ بعد كل وجبة 10 دقائق",
    ],
  },
  {
    id: "muscle_gain",
    title: "بناء العضلات",
    titleEn: "Build Muscle",
    description: "زيادة الكتلة العضلية وتحسين القوة",
    category: "muscle_gain",
    icon: "💪",
    color: "from-blue-500 to-indigo-500",
    milestones: [
      "حساب احتياجك من البروتين",
      "الالتزام بتمرين 3 مرات أسبوعياً",
      "زيادة البروتين إلى 1.6 جرام/كيلو",
      "زيادة الأوزان تدريجياً كل أسبوعين",
      "قياس محيط العضلات شهرياً",
    ],
    recommendations: [
      "تناول 1.6-2.2 جرام بروتين لكل كيلو من وزنك",
      "نم 7-9 ساعات — العضلات تنمو أثناء النوم",
      "اشرب ماء كافي (3+ لتر يومياً)",
      "لا تهمل الكربوهيدرات — هي وقود التمرين",
    ],
  },
  {
    id: "better_sleep",
    title: "تحسين النوم",
    titleEn: "Better Sleep",
    description: "نوم أعمق وأكثر راحة — استيقاظ بنشاط",
    category: "better_sleep",
    icon: "🌙",
    color: "from-indigo-500 to-purple-500",
    milestones: [
      "تحديد موعد ثابت للنوم",
      "إيقاف الشاشات قبل النوم بساعة",
      "تجربة تمارين التنفس قبل النوم",
      "النوم 7 ساعات متواصلة",
      "الاستيقاظ بدون منبه لمدة أسبوع",
    ],
    recommendations: [
      "حافظ على موعد نوم ثابت حتى في الإجازات",
      "اجعل الغرفة مظلمة وباردة (18-20°C)",
      "تجنب الكافيين بعد الساعة 2 ظهراً",
      "مارس تمارين التنفس 4-7-8 قبل النوم",
    ],
  },
  {
    id: "more_energy",
    title: "زيادة الطاقة",
    titleEn: "More Energy",
    description: "تخلص من الإرهاق واشعر بالنشاط طوال اليوم",
    category: "more_energy",
    icon: "⚡",
    color: "from-yellow-500 to-orange-500",
    milestones: [
      "فحص مستوى الحديد وفيتامين D",
      "شرب 2.5 لتر ماء يومياً",
      "النوم 7+ ساعات",
      "ممارسة رياضة خفيفة 20 دقيقة يومياً",
      "تقليل السكر المكرر",
    ],
    recommendations: [
      "افحص الحديد وفيتامين D — نقصهما أشهر سبب للإرهاق",
      "تناول وجبة إفطار غنية بالبروتين",
      "تحرك كل ساعة — لا تجلس أكثر من 60 دقيقة",
      "قلل الكافيين تدريجياً إذا تتجاوز 3 أكواب",
    ],
  },
  {
    id: "heart_health",
    title: "صحة القلب",
    titleEn: "Heart Health",
    description: "حافظ على قلبك قوياً وشرايينك نظيفة",
    category: "heart_health",
    icon: "❤️",
    color: "from-red-500 to-pink-500",
    milestones: [
      "فحص الكوليسترول والضغط",
      "تقليل الملح إلى أقل من 5 جرام يومياً",
      "المشي 150 دقيقة أسبوعياً",
      "إضافة أوميغا 3 للنظام الغذائي",
      "فحص القلب السنوي",
    ],
    recommendations: [
      "قلل الدهون المشبعة واستبدلها بزيت الزيتون",
      "تناول السمك مرتين أسبوعياً",
      "مارس رياضة هوائية 30 دقيقة 5 مرات أسبوعياً",
      "راقب ضغط الدم بانتظام",
    ],
  },
  {
    id: "diabetes_control",
    title: "التحكم بالسكر",
    titleEn: "Diabetes Control",
    description: "سيطر على مستوى السكر وعِش بصحة",
    category: "diabetes_control",
    icon: "🩸",
    color: "from-teal-500 to-cyan-500",
    milestones: [
      "قياس السكر يومياً وتسجيله",
      "تعلم حساب الكربوهيدرات",
      "المشي بعد كل وجبة 15 دقيقة",
      "تحقيق HbA1c أقل من 7%",
      "فحص القدمين والعيون سنوياً",
    ],
    recommendations: [
      "قس السكر قبل وبعد الوجبات لمعرفة تأثير الأطعمة",
      "استبدل الأرز الأبيض بالبني أو البرغل",
      "امشِ 15 دقيقة بعد كل وجبة رئيسية",
      "لا تفوت مواعيد الأدوية أبداً",
    ],
  },
  {
    id: "stress_reduction",
    title: "تقليل التوتر",
    titleEn: "Stress Reduction",
    description: "هدوء نفسي وصفاء ذهني — حياة أكثر سلاماً",
    category: "stress_reduction",
    icon: "🧘",
    color: "from-green-500 to-teal-500",
    milestones: [
      "تجربة التأمل 5 دقائق يومياً",
      "تحديد مصادر التوتر الرئيسية",
      "ممارسة تمارين التنفس عند التوتر",
      "تخصيص وقت يومي للراحة",
      "تقليل وقت الشاشات مساءً",
    ],
    recommendations: [
      "مارس التنفس العميق 3 مرات يومياً (دقيقتين)",
      "امشِ في الطبيعة 20 دقيقة يومياً",
      "قلل متابعة الأخبار السلبية",
      "تحدث مع شخص تثق به عن مشاعرك",
    ],
  },
  {
    id: "longevity",
    title: "طول العمر بصحة",
    titleEn: "Healthy Longevity",
    description: "عِش أطول وأصح — استثمر في مستقبلك",
    category: "longevity",
    icon: "🌿",
    color: "from-emerald-500 to-green-500",
    milestones: [
      "فحص شامل سنوي (100+ مؤشر)",
      "الحفاظ على وزن صحي (BMI 20-25)",
      "ممارسة رياضة متنوعة 5 مرات أسبوعياً",
      "تناول 5 حصص خضار وفواكه يومياً",
      "الحفاظ على علاقات اجتماعية نشطة",
    ],
    recommendations: [
      "اعمل فحص شامل كل سنة — الاكتشاف المبكر ينقذ حياتك",
      "تناول أطعمة ملونة ومتنوعة كل يوم",
      "مارس تمارين القوة + الهوائية + المرونة",
      "حافظ على علاقات اجتماعية قوية — العزلة تقصر العمر",
    ],
  },
];

// ─────────────────────────────────────────────────────────────────
// Category Icons Map
// ─────────────────────────────────────────────────────────────────
const categoryIconMap: Record<GoalCategory, React.ReactNode> = {
  weight_loss: <Flame className="size-5" />,
  muscle_gain: <Dumbbell className="size-5" />,
  better_sleep: <Moon className="size-5" />,
  more_energy: <Zap className="size-5" />,
  heart_health: <Heart className="size-5" />,
  diabetes_control: <Droplets className="size-5" />,
  stress_reduction: <Brain className="size-5" />,
  longevity: <Shield className="size-5" />,
  nutrition: <Apple className="size-5" />,
  fitness: <Activity className="size-5" />,
  mental_health: <Brain className="size-5" />,
  custom: <Target className="size-5" />,
};

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────
export function HealthGoalsDashboard() {
  const { patient, mode } = usePatientContext();
  const [goals, setGoals] = React.useState<HealthGoal[]>([]);
  const [showGoalPicker, setShowGoalPicker] = React.useState(false);
  const [selectedGoal, setSelectedGoal] = React.useState<HealthGoal | null>(null);
  const [aiLoading, setAiLoading] = React.useState(false);

  // Storage key based on patient
  const storageKey = React.useMemo(() => {
    if (mode === "patient" && patient) return `medisoft_goals_${patient.id}`;
    if (mode === "self") return `medisoft_goals_self`;
    return `medisoft_goals_guest`;
  }, [mode, patient]);

  // Load goals from localStorage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setGoals(JSON.parse(saved));
    } catch {}
  }, [storageKey]);

  // Save goals to localStorage
  const saveGoals = (newGoals: HealthGoal[]) => {
    setGoals(newGoals);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newGoals));
    } catch {}
  };

  // Add a goal from template
  const addGoal = (template: GoalTemplate) => {
    const newGoal: HealthGoal = {
      id: `goal_${Date.now()}`,
      title: template.title,
      description: template.description,
      category: template.category,
      icon: template.icon,
      progress: 0,
      milestones: template.milestones.map((m, i) => ({
        id: `ms_${i}`,
        title: m,
        completed: false,
      })),
      recommendations: template.recommendations,
      startDate: new Date().toISOString(),
      status: "active",
    };
    saveGoals([...goals, newGoal]);
    setShowGoalPicker(false);
  };

  // Toggle milestone completion
  const toggleMilestone = (goalId: string, milestoneId: string) => {
    const updated = goals.map((g) => {
      if (g.id !== goalId) return g;
      const milestones = g.milestones.map((m) =>
        m.id === milestoneId
          ? { ...m, completed: !m.completed, completedDate: !m.completed ? new Date().toISOString() : undefined }
          : m
      );
      const completedCount = milestones.filter((m) => m.completed).length;
      const progress = Math.round((completedCount / milestones.length) * 100);
      const status = progress === 100 ? "completed" as const : "active" as const;
      return { ...g, milestones, progress, status };
    });
    saveGoals(updated);
  };

  // Remove a goal
  const removeGoal = (goalId: string) => {
    saveGoals(goals.filter((g) => g.id !== goalId));
    if (selectedGoal?.id === goalId) setSelectedGoal(null);
  };

  // Get AI personalized recommendations
  const getAiRecommendations = async (goalId: string) => {
    if (!patient) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/patient-360/goal-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          goalCategory: goals.find((g) => g.id === goalId)?.category,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const updated = goals.map((g) =>
          g.id === goalId ? { ...g, recommendations: data.recommendations } : g
        );
        saveGoals(updated);
      }
    } catch {}
    setAiLoading(false);
  };

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Target className="size-5 text-sky-600" />
            أهدافي الصحية
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            اختر أهدافك وتابع تقدمك — النظام يربط توصياتك بأهدافك
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowGoalPicker(true)}
          className="gap-1.5 bg-sky-600 hover:bg-sky-700"
        >
          <Plus className="size-3.5" />
          هدف جديد
        </Button>
      </div>

      {/* Goal Picker Modal */}
      {showGoalPicker && (
        <Card className="border-2 border-sky-200 bg-sky-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">اختر هدفك الصحي</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowGoalPicker(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <CardDescription className="text-xs">
              اختر من الأهداف الجاهزة — النظام سيخصص التوصيات لك
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {GOAL_TEMPLATES.filter(
                (t) => !goals.some((g) => g.category === t.category && g.status === "active")
              ).map((template) => (
                <button
                  key={template.id}
                  onClick={() => addGoal(template)}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 text-center transition-all hover:border-sky-300 hover:shadow-md"
                >
                  <span className="text-2xl">{template.icon}</span>
                  <span className="text-xs font-bold text-gray-800">{template.title}</span>
                  <span className="text-[10px] text-gray-500 line-clamp-2">{template.description}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Goals */}
      {activeGoals.length === 0 && !showGoalPicker && (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Target className="size-12 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-600">لم تحدد أهدافاً صحية بعد</p>
            <p className="text-xs text-gray-400 mt-1">
              اختر أهدافك وسيربط النظام كل توصياتك الطبية بها
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowGoalPicker(true)}
              className="mt-4 gap-1.5"
            >
              <Plus className="size-3.5" />
              اختر هدفك الأول
            </Button>
          </CardContent>
        </Card>
      )}

      {activeGoals.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {activeGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onToggleMilestone={toggleMilestone}
              onRemove={removeGoal}
              onSelect={() => setSelectedGoal(selectedGoal?.id === goal.id ? null : goal)}
              isSelected={selectedGoal?.id === goal.id}
              onGetAi={() => getAiRecommendations(goal.id)}
              aiLoading={aiLoading}
            />
          ))}
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-700">
            <Award className="size-4 text-amber-500" />
            أهداف محققة ({completedGoals.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {completedGoals.map((goal) => (
              <div
                key={goal.id}
                className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3"
              >
                <span className="text-xl">{goal.icon}</span>
                <div>
                  <p className="text-xs font-bold text-emerald-800">{goal.title}</p>
                  <p className="text-[10px] text-emerald-600">تم تحقيقه ✓</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Goal Detail */}
      {selectedGoal && (
        <Card className="border-sky-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="text-lg">{selectedGoal.icon}</span>
                {selectedGoal.title} — التوصيات
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedGoal(null)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedGoal.recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg bg-gray-50 p-3"
              >
                <div className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700">
                  {i + 1}
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">{rec}</p>
              </div>
            ))}
            {mode === "patient" && patient && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => getAiRecommendations(selectedGoal.id)}
                disabled={aiLoading}
                className="w-full gap-1.5"
              >
                {aiLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                توصيات مخصصة بناءً على ملفك الطبي
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Goal Card
// ─────────────────────────────────────────────────────────────────
interface GoalCardProps {
  goal: HealthGoal;
  onToggleMilestone: (goalId: string, milestoneId: string) => void;
  onRemove: (goalId: string) => void;
  onSelect: () => void;
  isSelected: boolean;
  onGetAi: () => void;
  aiLoading: boolean;
}

function GoalCard({
  goal,
  onToggleMilestone,
  onRemove,
  onSelect,
  isSelected,
}: GoalCardProps) {
  const completedMilestones = goal.milestones.filter((m) => m.completed).length;

  return (
    <Card
      className={cn(
        "transition-all cursor-pointer hover:shadow-md",
        isSelected && "ring-2 ring-sky-400 border-sky-300"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        {/* Goal Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{goal.icon}</span>
            <div>
              <h4 className="text-sm font-bold text-gray-800">{goal.title}</h4>
              <p className="text-[10px] text-gray-500">{goal.description}</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(goal.id);
            }}
            className="text-gray-300 hover:text-red-400 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500">التقدم</span>
            <span className="text-[10px] font-bold text-sky-700">{goal.progress}%</span>
          </div>
          <Progress value={goal.progress} className="h-2" />
        </div>

        {/* Milestones */}
        <div className="space-y-1.5">
          {goal.milestones.slice(0, 3).map((milestone) => (
            <div
              key={milestone.id}
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => onToggleMilestone(goal.id, milestone.id)}
                className={cn(
                  "flex size-4 items-center justify-center rounded border transition-colors",
                  milestone.completed
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-gray-300 hover:border-sky-400"
                )}
              >
                {milestone.completed && <Check className="size-2.5" />}
              </button>
              <span
                className={cn(
                  "text-[11px]",
                  milestone.completed ? "text-gray-400 line-through" : "text-gray-700"
                )}
              >
                {milestone.title}
              </span>
            </div>
          ))}
          {goal.milestones.length > 3 && (
            <p className="text-[10px] text-gray-400 pr-6">
              +{goal.milestones.length - 3} خطوات أخرى
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2">
          <span className="text-[10px] text-gray-400">
            {completedMilestones}/{goal.milestones.length} خطوات
          </span>
          <Badge variant="outline" className="text-[9px] gap-1">
            <Clock className="size-2.5" />
            {new Date(goal.startDate).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
