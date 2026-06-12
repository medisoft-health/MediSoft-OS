"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  Flame,
  Lightbulb,
  Lock,
  Play,
  Sparkles,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Lesson {
  id: string;
  titleAr: string;
  titleEn: string;
  category: LessonCategory;
  duration: number; // minutes
  difficulty: "beginner" | "intermediate" | "advanced";
  contentAr: string;
  contentEn: string;
  keyPointsAr: string[];
  keyPointsEn: string[];
  completed: boolean;
  locked: boolean;
}

type LessonCategory = "nutrition" | "training" | "recovery" | "mindset" | "injury_prevention";

const LESSON_CATEGORIES: Record<LessonCategory, { ar: string; en: string; icon: string; color: string }> = {
  nutrition: { ar: "التغذية", en: "Nutrition", icon: "🥗", color: "emerald" },
  training: { ar: "التدريب", en: "Training", icon: "💪", color: "blue" },
  recovery: { ar: "الاستشفاء", en: "Recovery", icon: "🧘", color: "purple" },
  mindset: { ar: "العقلية", en: "Mindset", icon: "🧠", color: "orange" },
  injury_prevention: { ar: "الوقاية من الإصابات", en: "Injury Prevention", icon: "🛡️", color: "red" },
};

/**
 * MediSport — Micro-Lessons Engine
 *
 * Features:
 * - Daily lesson recommendations (2-5 min each)
 * - 5 categories: Nutrition, Training, Recovery, Mindset, Injury Prevention
 * - Progress tracking with streaks
 * - Lesson content with key takeaways
 * - Difficulty levels and unlock system
 */
export default function MicroLessonsPage() {
  const t = useTranslations("SportStandalone");
  const tLesson = useTranslations("SportLessons");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const [selectedLesson, setSelectedLesson] = React.useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = React.useState<Set<string>>(new Set(["1", "2", "3"]));
  const [streak, setStreak] = React.useState(5);

  // Lesson database
  const lessons: Lesson[] = [
    {
      id: "1",
      titleAr: "أهمية البروتين بعد التمرين",
      titleEn: "Post-Workout Protein Timing",
      category: "nutrition",
      duration: 3,
      difficulty: "beginner",
      contentAr: "يعتبر تناول البروتين خلال 30-60 دقيقة بعد التمرين من أهم العوامل لبناء العضلات وتسريع الاستشفاء. يحتاج الجسم إلى 20-40 غرام من البروتين عالي الجودة لتحفيز عملية تخليق البروتين العضلي. المصادر المثالية تشمل مصل اللبن (واي بروتين)، البيض، أو صدر الدجاج.",
      contentEn: "Consuming protein within 30-60 minutes post-workout is crucial for muscle building and recovery. Your body needs 20-40g of high-quality protein to stimulate muscle protein synthesis. Ideal sources include whey protein, eggs, or chicken breast.",
      keyPointsAr: ["تناول 20-40 غرام بروتين خلال ساعة من التمرين", "واي بروتين هو الأسرع امتصاصاً", "الجمع بين البروتين والكربوهيدرات يعزز الاستشفاء"],
      keyPointsEn: ["Consume 20-40g protein within 1 hour of training", "Whey protein is the fastest absorbing", "Combining protein with carbs enhances recovery"],
      completed: true,
      locked: false,
    },
    {
      id: "2",
      titleAr: "تقنية التنفس 4-7-8 للاسترخاء",
      titleEn: "4-7-8 Breathing Technique",
      category: "recovery",
      duration: 2,
      difficulty: "beginner",
      contentAr: "تقنية التنفس 4-7-8 هي طريقة فعالة لتهدئة الجهاز العصبي وتحسين جودة النوم. استنشق لمدة 4 ثوانٍ، احبس النفس 7 ثوانٍ، ثم ازفر ببطء لمدة 8 ثوانٍ. كرر 4 مرات قبل النوم.",
      contentEn: "The 4-7-8 breathing technique effectively calms the nervous system and improves sleep quality. Inhale for 4 seconds, hold for 7 seconds, then exhale slowly for 8 seconds. Repeat 4 times before bed.",
      keyPointsAr: ["استنشق 4 ثوانٍ، احبس 7، ازفر 8", "مارسها قبل النوم يومياً", "تقلل هرمون الكورتيزول"],
      keyPointsEn: ["Inhale 4s, hold 7s, exhale 8s", "Practice daily before sleep", "Reduces cortisol levels"],
      completed: true,
      locked: false,
    },
    {
      id: "3",
      titleAr: "التحميل التدريجي للأوزان",
      titleEn: "Progressive Overload Principle",
      category: "training",
      duration: 4,
      difficulty: "beginner",
      contentAr: "مبدأ التحميل التدريجي هو أساس بناء القوة والعضلات. يعني زيادة الحمل التدريبي تدريجياً عبر الوقت — سواء بزيادة الوزن، التكرارات، المجموعات، أو تقليل فترات الراحة. القاعدة: زد 2.5-5% كل أسبوعين.",
      contentEn: "Progressive overload is the foundation of strength and muscle building. It means gradually increasing training stimulus over time — through weight, reps, sets, or reduced rest periods. Rule: increase 2.5-5% every two weeks.",
      keyPointsAr: ["زد الحمل 2.5-5% كل أسبوعين", "يمكن التقدم بالتكرارات أو المجموعات", "سجل أرقامك في كل تمرين"],
      keyPointsEn: ["Increase load 2.5-5% every 2 weeks", "Progress via reps or sets too", "Log your numbers every session"],
      completed: true,
      locked: false,
    },
    {
      id: "4",
      titleAr: "الكربوهيدرات قبل التمرين",
      titleEn: "Pre-Workout Carbohydrates",
      category: "nutrition",
      duration: 3,
      difficulty: "beginner",
      contentAr: "تناول الكربوهيدرات قبل التمرين بـ 60-90 دقيقة يوفر الطاقة اللازمة للأداء الأمثل. اختر كربوهيدرات معتدلة المؤشر الجلايسيمي مثل الشوفان، الموز، أو الأرز. الكمية المثالية: 1-2 غرام لكل كيلوغرام من وزن الجسم.",
      contentEn: "Consuming carbohydrates 60-90 minutes before training provides energy for optimal performance. Choose moderate glycemic index carbs like oats, banana, or rice. Ideal amount: 1-2g per kg of body weight.",
      keyPointsAr: ["تناول الكربوهيدرات قبل 60-90 دقيقة", "1-2 غ/كغ من وزن الجسم", "الشوفان والموز خيارات مثالية"],
      keyPointsEn: ["Eat carbs 60-90 min before training", "1-2g per kg body weight", "Oats and banana are ideal choices"],
      completed: false,
      locked: false,
    },
    {
      id: "5",
      titleAr: "قوة التصور الذهني",
      titleEn: "Power of Visualization",
      category: "mindset",
      duration: 3,
      difficulty: "intermediate",
      contentAr: "التصور الذهني أداة قوية يستخدمها الرياضيون المحترفون. تخيل نفسك تؤدي التمرين بشكل مثالي قبل البدء — هذا ينشط نفس المسارات العصبية المستخدمة أثناء الأداء الفعلي ويحسن الأداء بنسبة 10-15%.",
      contentEn: "Mental visualization is a powerful tool used by professional athletes. Imagine yourself performing the exercise perfectly before starting — this activates the same neural pathways used during actual performance and improves results by 10-15%.",
      keyPointsAr: ["تخيل الأداء المثالي قبل كل تمرين", "ينشط نفس المسارات العصبية", "يحسن الأداء 10-15%"],
      keyPointsEn: ["Visualize perfect execution before each set", "Activates same neural pathways", "Improves performance 10-15%"],
      completed: false,
      locked: false,
    },
    {
      id: "6",
      titleAr: "إحماء المفاصل الديناميكي",
      titleEn: "Dynamic Joint Warm-Up",
      category: "injury_prevention",
      duration: 4,
      difficulty: "beginner",
      contentAr: "الإحماء الديناميكي يجهز المفاصل والعضلات للتمرين ويقلل خطر الإصابة بنسبة 50%. ابدأ بدوائر المفاصل (الرقبة، الكتف، الورك، الركبة، الكاحل) ثم انتقل لحركات ديناميكية مثل الاندفاع والقرفصاء بوزن الجسم.",
      contentEn: "Dynamic warm-up prepares joints and muscles for training, reducing injury risk by 50%. Start with joint circles (neck, shoulders, hips, knees, ankles) then progress to dynamic movements like lunges and bodyweight squats.",
      keyPointsAr: ["5-10 دقائق إحماء قبل كل تمرين", "ابدأ بدوائر المفاصل", "يقلل خطر الإصابة 50%"],
      keyPointsEn: ["5-10 min warm-up before every session", "Start with joint circles", "Reduces injury risk by 50%"],
      completed: false,
      locked: false,
    },
    {
      id: "7",
      titleAr: "أهمية النوم العميق للرياضيين",
      titleEn: "Deep Sleep for Athletes",
      category: "recovery",
      duration: 4,
      difficulty: "intermediate",
      contentAr: "النوم العميق هو المرحلة التي يفرز فيها هرمون النمو بنسبة 70%. الرياضيون يحتاجون 8-10 ساعات نوم. لتحسين جودة النوم: حافظ على درجة حرارة الغرفة 18-20°م، تجنب الشاشات ساعة قبل النوم، والتزم بموعد ثابت.",
      contentEn: "Deep sleep is when 70% of growth hormone is released. Athletes need 8-10 hours of sleep. To improve quality: keep room temperature at 18-20°C, avoid screens 1 hour before bed, and maintain a consistent schedule.",
      keyPointsAr: ["8-10 ساعات نوم للرياضيين", "70% من هرمون النمو يُفرز أثناء النوم العميق", "درجة حرارة الغرفة 18-20°م"],
      keyPointsEn: ["8-10 hours sleep for athletes", "70% of growth hormone released during deep sleep", "Room temperature 18-20°C"],
      completed: false,
      locked: false,
    },
    {
      id: "8",
      titleAr: "تقنية التدريب المتقطع عالي الشدة",
      titleEn: "HIIT Training Technique",
      category: "training",
      duration: 5,
      difficulty: "advanced",
      contentAr: "التدريب المتقطع عالي الشدة (HIIT) يحرق دهوناً أكثر بـ 25-30% مقارنة بالتمارين المستمرة. النسبة المثالية: 30 ثانية عمل مكثف / 60 ثانية راحة. ابدأ بـ 4 جولات وزد تدريجياً إلى 8-10.",
      contentEn: "High-Intensity Interval Training (HIIT) burns 25-30% more fat than steady-state cardio. Ideal ratio: 30 seconds intense work / 60 seconds rest. Start with 4 rounds and gradually increase to 8-10.",
      keyPointsAr: ["30 ثانية عمل / 60 ثانية راحة", "يحرق دهوناً أكثر بـ 25-30%", "ابدأ بـ 4 جولات"],
      keyPointsEn: ["30s work / 60s rest ratio", "Burns 25-30% more fat", "Start with 4 rounds"],
      completed: false,
      locked: true,
    },
  ];

  const todayLesson = lessons.find((l) => !l.completed && !l.locked);
  const completedCount = completedLessons.size;
  const totalLessons = lessons.length;

  const handleCompleteLesson = (lessonId: string) => {
    setCompletedLessons((prev) => new Set([...prev, lessonId]));
    setSelectedLesson(null);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${locale}/trainee`}>
          <Button variant="ghost" size="icon" className="rounded-lg">
            <ArrowLeft className={`h-5 w-5 ${isRtl ? "rotate-180" : ""}`} />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{tLesson("title")}</h1>
          <p className="text-sm text-slate-500">{tLesson("subtitle")}</p>
        </div>
      </div>

      {/* Lesson Viewer Modal */}
      {selectedLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg border-0 shadow-2xl rounded-2xl max-h-[80vh] overflow-y-auto">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <Badge variant="secondary" className="text-xs">
                  {LESSON_CATEGORIES[selectedLesson.category][locale === "ar" ? "ar" : "en"]}
                </Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedLesson(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <h2 className="text-lg font-bold text-slate-900 mb-2">
                {locale === "ar" ? selectedLesson.titleAr : selectedLesson.titleEn}
              </h2>

              <div className="flex items-center gap-3 mb-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {selectedLesson.duration} {tLesson("minutes")}
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {tLesson(selectedLesson.difficulty)}
                </span>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed mb-4">
                {locale === "ar" ? selectedLesson.contentAr : selectedLesson.contentEn}
              </p>

              <div className="bg-emerald-50 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  {tLesson("keyTakeaways")}
                </h3>
                <ul className="space-y-2">
                  {(locale === "ar" ? selectedLesson.keyPointsAr : selectedLesson.keyPointsEn).map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-emerald-700">
                      <Check className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {!completedLessons.has(selectedLesson.id) && (
                <Button
                  onClick={() => handleCompleteLesson(selectedLesson.id)}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg"
                >
                  <Check className="h-4 w-4 me-2" />
                  {tLesson("markComplete")}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Streak & Progress */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className="border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50">
          <CardContent className="p-3 text-center">
            <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
            <div className="text-xl font-bold text-orange-700">{streak}</div>
            <div className="text-[10px] text-orange-600">{tLesson("dayStreak")}</div>
          </CardContent>
        </Card>
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-3 text-center">
            <Trophy className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
            <div className="text-xl font-bold text-emerald-700">{completedCount}/{totalLessons}</div>
            <div className="text-[10px] text-emerald-600">{tLesson("completed")}</div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Lesson */}
      {todayLesson && (
        <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-semibold text-emerald-700">{tLesson("todayLesson")}</span>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">
              {locale === "ar" ? todayLesson.titleAr : todayLesson.titleEn}
            </h3>
            <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
              <span>{todayLesson.duration} {tLesson("minutes")}</span>
              <span>{LESSON_CATEGORIES[todayLesson.category][locale === "ar" ? "ar" : "en"]}</span>
            </div>
            <Button
              onClick={() => setSelectedLesson(todayLesson)}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
            >
              <Play className="h-3.5 w-3.5 me-1.5" />
              {tLesson("startLesson")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* All Lessons by Category */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="bg-slate-100 rounded-lg p-1 w-full flex-wrap h-auto">
          <TabsTrigger value="all" className="rounded-md text-xs flex-1">
            {tLesson("all")}
          </TabsTrigger>
          {(Object.entries(LESSON_CATEGORIES) as [LessonCategory, typeof LESSON_CATEGORIES[LessonCategory]][]).map(
            ([key, cat]) => (
              <TabsTrigger key={key} value={key} className="rounded-md text-xs flex-1">
                <span className="me-1">{cat.icon}</span>
                {locale === "ar" ? cat.ar : cat.en}
              </TabsTrigger>
            )
          )}
        </TabsList>

        <TabsContent value="all" className="space-y-2">
          {lessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              locale={locale}
              isCompleted={completedLessons.has(lesson.id)}
              tLesson={tLesson}
              onClick={() => !lesson.locked && setSelectedLesson(lesson)}
            />
          ))}
        </TabsContent>

        {(Object.keys(LESSON_CATEGORIES) as LessonCategory[]).map((cat) => (
          <TabsContent key={cat} value={cat} className="space-y-2">
            {lessons
              .filter((l) => l.category === cat)
              .map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  locale={locale}
                  isCompleted={completedLessons.has(lesson.id)}
                  tLesson={tLesson}
                  onClick={() => !lesson.locked && setSelectedLesson(lesson)}
                />
              ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

function LessonCard({
  lesson,
  locale,
  isCompleted,
  tLesson,
  onClick,
}: {
  lesson: Lesson;
  locale: string;
  isCompleted: boolean;
  tLesson: ReturnType<typeof useTranslations>;
  onClick: () => void;
}) {
  const isRtl = locale === "ar";

  return (
    <button
      onClick={onClick}
      disabled={lesson.locked}
      className={`w-full text-start p-3 rounded-lg border transition-all ${
        lesson.locked
          ? "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
          : isCompleted
          ? "border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50"
          : "border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/20"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            lesson.locked
              ? "bg-slate-200"
              : isCompleted
              ? "bg-emerald-100"
              : "bg-slate-100"
          }`}
        >
          {lesson.locked ? (
            <Lock className="h-4 w-4 text-slate-400" />
          ) : isCompleted ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <BookOpen className="h-4 w-4 text-slate-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">
            {locale === "ar" ? lesson.titleAr : lesson.titleEn}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-500">
              {lesson.duration} {tLesson("minutes")}
            </span>
            <span className="text-[10px] text-slate-400">•</span>
            <span className="text-[10px] text-slate-500">
              {LESSON_CATEGORIES[lesson.category][locale === "ar" ? "ar" : "en"]}
            </span>
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
              {tLesson(lesson.difficulty)}
            </Badge>
          </div>
        </div>
        {!lesson.locked && (
          <ChevronRight className={`h-4 w-4 text-slate-400 flex-shrink-0 ${isRtl ? "rotate-180" : ""}`} />
        )}
      </div>
    </button>
  );
}
