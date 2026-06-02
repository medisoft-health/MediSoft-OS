"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Apple,
  Award,
  Battery,
  BookOpen,
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  GraduationCap,
  Heart,
  Lightbulb,
  Lock,
  Moon,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════════
// Lesson Types & Data
// ═══════════════════════════════════════════════════════════════════════════════

interface Lesson {
  id: string;
  day: number;
  title: string;
  category: "nutrition" | "training" | "recovery" | "mindset" | "science";
  duration: string; // "2 دقائق"
  content: string[];
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
  tip: string;
  icon: string;
}

interface LessonProgress {
  completedLessons: string[];
  currentDay: number;
  streak: number;
  lastCompletedDate: string;
  quizScores: Record<string, boolean>;
  totalXP: number;
}

const LESSON_CATEGORIES = [
  { id: "nutrition", label: "تغذية", icon: Apple, color: "text-green-600", bg: "bg-green-100" },
  { id: "training", label: "تدريب", icon: Dumbbell, color: "text-blue-600", bg: "bg-blue-100" },
  { id: "recovery", label: "استشفاء", icon: Battery, color: "text-purple-600", bg: "bg-purple-100" },
  { id: "mindset", label: "عقلية", icon: Brain, color: "text-amber-600", bg: "bg-amber-100" },
  { id: "science", label: "علم", icon: Lightbulb, color: "text-rose-600", bg: "bg-rose-100" },
];

const LESSONS: Lesson[] = [
  // === Week 1: Foundation ===
  {
    id: "lesson-1",
    day: 1,
    title: "البروتين — لبنة بناء جسمك",
    category: "nutrition",
    duration: "2 دقائق",
    content: [
      "البروتين هو أهم عنصر غذائي لبناء العضلات والحفاظ عليها.",
      "جسمك يحتاج 1.6-2.2 جرام بروتين لكل كيلو من وزنك يومياً لو بتتمرن.",
      "أفضل مصادر البروتين: صدور الدجاج، البيض، الأسماك، البقوليات، ومنتجات الألبان.",
      "وزع البروتين على 4-5 وجبات في اليوم (30-40g لكل وجبة) — ده أفضل للامتصاص.",
    ],
    quiz: {
      question: "كم جرام بروتين يحتاجه الشخص الرياضي لكل كيلو من وزنه؟",
      options: ["0.5-1 جرام", "1.6-2.2 جرام", "3-4 جرام", "5 جرام"],
      correctIndex: 1,
      explanation: "الأبحاث تثبت إن 1.6-2.2g/kg هو المعدل المثالي لبناء العضلات والاستشفاء.",
    },
    tip: "💡 ابدأ يومك ببيضتين مسلوقتين + جبنة = 20g بروتين!",
    icon: "🥩",
  },
  {
    id: "lesson-2",
    day: 2,
    title: "النوم — سلاحك السري",
    category: "recovery",
    duration: "2 دقائق",
    content: [
      "90% من هرمون النمو (GH) بيتفرز أثناء النوم العميق.",
      "قلة النوم بتزود هرمون الكورتيزول (هرمون التوتر) اللي بيكسر العضلات.",
      "النوم 7-9 ساعات يومياً بيحسن الأداء الرياضي بنسبة 20-30%.",
      "نصيحة: اعمل روتين ثابت — نام واصحى في نفس الوقت كل يوم.",
    ],
    quiz: {
      question: "كم ساعة نوم يحتاجها الرياضي يومياً؟",
      options: ["4-5 ساعات", "5-6 ساعات", "7-9 ساعات", "10-12 ساعة"],
      correctIndex: 2,
      explanation: "7-9 ساعات هو المعدل المثالي — أقل من كده بيأثر على الأداء والاستشفاء.",
    },
    tip: "💡 بلاش موبايل قبل النوم بساعة — الضوء الأزرق بيأخر النوم 30 دقيقة.",
    icon: "😴",
  },
  {
    id: "lesson-3",
    day: 3,
    title: "الإحماء — حماية جسمك",
    category: "training",
    duration: "2 دقائق",
    content: [
      "الإحماء بيزود تدفق الدم للعضلات بنسبة 400%.",
      "5-10 دقائق إحماء بتقلل خطر الإصابة بنسبة 50%.",
      "الإحماء الديناميكي (حركة) أفضل من الثابت (stretching) قبل التمرين.",
      "أمثلة: مشي سريع، jumping jacks، دوران الذراعين، lunges خفيفة.",
    ],
    quiz: {
      question: "أيه نوع الإحماء الأفضل قبل التمرين؟",
      options: ["إحماء ثابت (static)", "إحماء ديناميكي (dynamic)", "بدون إحماء", "تمارين ثقيلة خفيفة"],
      correctIndex: 1,
      explanation: "الإحماء الديناميكي بينشط العضلات والمفاصل ويجهزها للحركة بشكل أفضل.",
    },
    tip: "💡 قاعدة 5-10: 5 دقائق كارديو خفيف + 10 حركات ديناميكية = إحماء مثالي.",
    icon: "🔥",
  },
  {
    id: "lesson-4",
    day: 4,
    title: "العقلية — 80% من النجاح",
    category: "mindset",
    duration: "2 دقائق",
    content: [
      "الدراسات بتقول إن 80% من النجاح الرياضي مرتبط بالعقلية والالتزام.",
      "حط أهداف SMART: محددة، قابلة للقياس، واقعية، مرتبطة بوقت.",
      "بدل 'عاوز أخس' → 'هنزل 2 كيلو في 4 أسابيع بالمشي 30 دقيقة يومياً'.",
      "احتفل بالانتصارات الصغيرة — كل خطوة بتقربك من هدفك.",
    ],
    quiz: {
      question: "إيه معنى أهداف SMART؟",
      options: [
        "سريعة ومباشرة",
        "محددة، قابلة للقياس، واقعية، مرتبطة بوقت",
        "صعبة ومستحيلة",
        "بسيطة وسهلة",
      ],
      correctIndex: 1,
      explanation: "SMART = Specific, Measurable, Achievable, Relevant, Time-bound — ده بيخلي الهدف واضح وقابل للتحقيق.",
    },
    tip: "💡 اكتب هدفك على ورقة وعلقها في مكان تشوفها كل يوم.",
    icon: "🧠",
  },
  {
    id: "lesson-5",
    day: 5,
    title: "الماء — وقود الأداء",
    category: "nutrition",
    duration: "2 دقائق",
    content: [
      "جفاف 2% بس من وزن جسمك بيقلل الأداء بنسبة 25%.",
      "الرياضي يحتاج 35-40 مل ماء لكل كيلو من وزنه يومياً.",
      "لو وزنك 80 كيلو = تحتاج 2.8 - 3.2 لتر مياه يومياً.",
      "اشرب 500 مل قبل التمرين بساعة، و200 مل كل 15 دقيقة أثناء التمرين.",
    ],
    quiz: {
      question: "كم مل ماء يحتاجه الرياضي لكل كيلو من وزنه؟",
      options: ["10-15 مل", "20-25 مل", "35-40 مل", "50-60 مل"],
      correctIndex: 2,
      explanation: "35-40 مل/كجم هو المعدل المثالي للرياضيين — يزيد في الجو الحار أو التمرين المكثف.",
    },
    tip: "💡 حط زجاجة مياه جنبك دايماً — لو شفتها هتشرب أكتر.",
    icon: "💧",
  },
  {
    id: "lesson-6",
    day: 6,
    title: "التحميل التدريجي — مفتاح التطور",
    category: "science",
    duration: "2 دقائق",
    content: [
      "مبدأ التحميل التدريجي (Progressive Overload) هو أساس أي تطور.",
      "لازم تزود الحمل تدريجياً: وزن أكتر، تكرارات أكتر، أو وقت أقل راحة.",
      "القاعدة: زود 5-10% كل أسبوع أو أسبوعين.",
      "بدون تحميل تدريجي، جسمك هيتأقلم ويوقف التطور (Plateau).",
    ],
    quiz: {
      question: "كم نسبة الزيادة المثالية في الحمل التدريبي أسبوعياً؟",
      options: ["1-2%", "5-10%", "20-30%", "50%"],
      correctIndex: 1,
      explanation: "5-10% زيادة تدريجية بتضمن تطور مستمر بدون إصابات.",
    },
    tip: "💡 سجل أوزانك وتكراراتك — اللي مش بتقيسه مش هتحسنه.",
    icon: "📈",
  },
  {
    id: "lesson-7",
    day: 7,
    title: "يوم الراحة — مش كسل!",
    category: "recovery",
    duration: "2 دقائق",
    content: [
      "العضلات بتنمو في أيام الراحة مش في التمرين!",
      "التمرين بيكسر ألياف العضلات — الراحة والتغذية بتبنيها أقوى.",
      "1-2 يوم راحة في الأسبوع ضروري لمنع الـ Overtraining.",
      "الراحة النشطة (مشي خفيف، يوجا) أفضل من الراحة الكاملة.",
    ],
    quiz: {
      question: "متى العضلات بتنمو فعلاً؟",
      options: ["أثناء التمرين", "أثناء الراحة والنوم", "أثناء الكارديو", "في الصباح بس"],
      correctIndex: 1,
      explanation: "التمرين بيحفز النمو لكن البناء الفعلي بيحصل أثناء الراحة والنوم.",
    },
    tip: "💡 يوم الراحة = يوم بناء. استمتع بيه بدون ذنب!",
    icon: "🧘",
  },
  // === Week 2 ===
  {
    id: "lesson-8",
    day: 8,
    title: "الكربوهيدرات — صديق مش عدو",
    category: "nutrition",
    duration: "2 دقائق",
    content: [
      "الكربوهيدرات هي مصدر الطاقة الأساسي للتمرين عالي الشدة.",
      "مش كل الكربوهيدرات زي بعض: معقدة (شوفان، أرز بني) > بسيطة (سكر، حلويات).",
      "الكربوهيدرات المعقدة بتديك طاقة مستمرة 3-4 ساعات.",
      "أفضل وقت للكربوهيدرات: قبل التمرين بساعتين + بعد التمرين مباشرة.",
    ],
    quiz: {
      question: "أيه أفضل وقت لأكل الكربوهيدرات؟",
      options: ["قبل النوم", "قبل وبعد التمرين", "الصبح بس", "مفيش وقت محدد"],
      correctIndex: 1,
      explanation: "قبل التمرين بتديك طاقة، وبعده بتملأ مخازن الجلايكوجين وتسرع الاستشفاء.",
    },
    tip: "💡 كوب شوفان + موزة قبل التمرين بساعة = طاقة مثالية!",
    icon: "🍚",
  },
  {
    id: "lesson-9",
    day: 9,
    title: "التنفس — قوة خفية",
    category: "training",
    duration: "2 دقائق",
    content: [
      "التنفس الصحيح بيزود قوتك 10-15% في تمارين الحديد.",
      "القاعدة: اشهق (خد نفس) في المرحلة السهلة، ازفر (طلع نفس) في المرحلة الصعبة.",
      "في الـ Squat: خد نفس وانت واقف، طلع نفس وانت طالع.",
      "تقنية Valsalva (حبس النفس) للأوزان الثقيلة بتحمي الظهر.",
    ],
    quiz: {
      question: "إمتى تزفر (تطلع نفس) في تمارين الحديد؟",
      options: ["في المرحلة السهلة", "في المرحلة الصعبة (الرفع)", "طول الوقت", "مش مهم"],
      correctIndex: 1,
      explanation: "الزفير في المرحلة الصعبة بيساعد على تثبيت الجذع وزيادة القوة.",
    },
    tip: "💡 جرب تتنفس من بطنك (diaphragmatic breathing) — بيحسن الأداء والتركيز.",
    icon: "🌬️",
  },
  {
    id: "lesson-10",
    day: 10,
    title: "الدهون الصحية — ضرورة مش رفاهية",
    category: "nutrition",
    duration: "2 دقائق",
    content: [
      "الدهون الصحية ضرورية لإنتاج الهرمونات (تستوستيرون، هرمون النمو).",
      "أوميجا-3 بتقلل الالتهابات وبتسرع الاستشفاء.",
      "مصادر ممتازة: سلمون، أفوكادو، زيت زيتون، مكسرات، بذور شيا.",
      "20-35% من سعراتك لازم تيجي من الدهون الصحية.",
    ],
    quiz: {
      question: "ليه الدهون الصحية مهمة للرياضيين؟",
      options: ["بتدي طاقة بس", "ضرورية لإنتاج الهرمونات", "مش مهمة خالص", "بتبني عضلات"],
      correctIndex: 1,
      explanation: "الدهون الصحية أساسية لإنتاج التستوستيرون وهرمون النمو — بدونها الأداء بيقل.",
    },
    tip: "💡 ملعقة زيت زيتون على السلطة يومياً = جرعة أوميجا ممتازة.",
    icon: "🥑",
  },
  {
    id: "lesson-11",
    day: 11,
    title: "التوتر — عدو اللياقة",
    category: "mindset",
    duration: "2 دقائق",
    content: [
      "التوتر المزمن بيرفع الكورتيزول — ده بيكسر العضلات ويخزن دهون البطن.",
      "10 دقائق تأمل يومياً بتقلل الكورتيزول 25%.",
      "تقنيات سريعة: تنفس 4-7-8 (شهيق 4 ثواني، حبس 7، زفير 8).",
      "التمرين نفسه بيقلل التوتر — لكن الإفراط في التمرين بيزوده!",
    ],
    quiz: {
      question: "إيه تأثير التوتر المزمن على الجسم؟",
      options: ["بيبني عضلات", "بيكسر عضلات ويخزن دهون", "مفيش تأثير", "بيحرق دهون"],
      correctIndex: 1,
      explanation: "الكورتيزول المرتفع بيكسر العضلات (catabolism) ويخزن دهون خصوصاً في البطن.",
    },
    tip: "💡 جرب تقنية 4-7-8 قبل النوم — هتنام أسرع وأعمق.",
    icon: "🧘‍♂️",
  },
  {
    id: "lesson-12",
    day: 12,
    title: "الألياف — بطل الهضم المخفي",
    category: "science",
    duration: "2 دقائق",
    content: [
      "الألياف بتحسن الهضم وبتخليك تحس بالشبع أطول.",
      "الرياضي يحتاج 25-35 جرام ألياف يومياً.",
      "مصادر غنية: شوفان، عدس، فاصوليا، بروكلي، تفاح، بذور شيا.",
      "الألياف بتغذي البكتيريا النافعة في الأمعاء — ده بيحسن المناعة والمزاج!",
    ],
    quiz: {
      question: "كم جرام ألياف يحتاجها الرياضي يومياً؟",
      options: ["5-10 جرام", "15-20 جرام", "25-35 جرام", "50+ جرام"],
      correctIndex: 2,
      explanation: "25-35 جرام هو المعدل المثالي — بيحسن الهضم والشبع والمناعة.",
    },
    tip: "💡 أضف ملعقة بذور شيا على الزبادي = 10g ألياف بسهولة!",
    icon: "🥦",
  },
  {
    id: "lesson-13",
    day: 13,
    title: "تمارين المقاومة vs الكارديو",
    category: "training",
    duration: "2 دقائق",
    content: [
      "تمارين المقاومة (حديد) بتبني عضلات وبترفع معدل الحرق 24-48 ساعة بعد التمرين.",
      "الكارديو بيحسن القلب والرئتين وبيحرق سعرات أثناء التمرين بس.",
      "المزيج المثالي: 3-4 أيام حديد + 2-3 أيام كارديو.",
      "لو هدفك خسارة دهون: ابدأ بالحديد ثم الكارديو — ده بيحرق دهون أكتر.",
    ],
    quiz: {
      question: "أيه الترتيب الأفضل لحرق الدهون؟",
      options: ["كارديو بس", "حديد ثم كارديو", "كارديو ثم حديد", "حديد بس"],
      correctIndex: 1,
      explanation: "الحديد الأول بيستنفد الجلايكوجين — فلما تعمل كارديو بعده جسمك بيحرق دهون مباشرة.",
    },
    tip: "💡 20 دقيقة حديد + 20 دقيقة مشي سريع = تمرين مثالي لحرق الدهون.",
    icon: "🏋️",
  },
  {
    id: "lesson-14",
    day: 14,
    title: "النوم العميق — مراحل الاستشفاء",
    category: "recovery",
    duration: "2 دقائق",
    content: [
      "النوم بيمر بـ 4-5 دورات كل ليلة (كل دورة 90 دقيقة).",
      "المرحلة 3-4 (النوم العميق) هي اللي بيحصل فيها إصلاح العضلات.",
      "مرحلة REM (الأحلام) مهمة للذاكرة والتعلم الحركي.",
      "نصائح: غرفة مظلمة وباردة (18-20°C) + بلاش كافيين بعد الظهر.",
    ],
    quiz: {
      question: "في أي مرحلة من النوم بيحصل إصلاح العضلات؟",
      options: ["المرحلة 1 (خفيف)", "المرحلة 2", "المرحلة 3-4 (عميق)", "REM (أحلام)"],
      correctIndex: 2,
      explanation: "النوم العميق (مرحلة 3-4) هو وقت إفراز هرمون النمو وإصلاح الأنسجة.",
    },
    tip: "💡 حاول تنام في مضاعفات 90 دقيقة (7.5 ساعات مثلاً) عشان تصحى منتعش.",
    icon: "🌙",
  },
  // === Week 3+ ===
  {
    id: "lesson-15",
    day: 15,
    title: "توقيت الوجبات — Nutrient Timing",
    category: "nutrition",
    duration: "2 دقائق",
    content: [
      "وجبة قبل التمرين (1-2 ساعة): كربوهيدرات + بروتين خفيف.",
      "وجبة بعد التمرين (خلال 30-60 دقيقة): بروتين + كربوهيدرات سريعة.",
      "النافذة الذهبية (Anabolic Window) بعد التمرين مهمة لكن مش بالخطورة اللي الناس فاكراها.",
      "الأهم من التوقيت: إجمالي البروتين والسعرات اليومية.",
    ],
    quiz: {
      question: "إيه أهم حاجة في التغذية الرياضية؟",
      options: ["توقيت الوجبات بالظبط", "إجمالي البروتين والسعرات اليومية", "أكل كل ساعة", "الصيام المتقطع"],
      correctIndex: 1,
      explanation: "التوقيت مهم لكن الأهم هو إجمالي ما تأكله في اليوم كله.",
    },
    tip: "💡 موزة + سكوب واي بروتين بعد التمرين = وجبة استشفاء مثالية.",
    icon: "⏰",
  },
  {
    id: "lesson-16",
    day: 16,
    title: "المرونة — مفتاح الأداء طويل المدى",
    category: "training",
    duration: "2 دقائق",
    content: [
      "المرونة بتقلل الإصابات وبتحسن مدى الحركة (ROM).",
      "Stretching ثابت (Static) = بعد التمرين (30 ثانية لكل عضلة).",
      "Stretching ديناميكي = قبل التمرين (حركات تحاكي التمرين).",
      "Foam Rolling بيقلل الشد العضلي ويسرع الاستشفاء.",
    ],
    quiz: {
      question: "إمتى تعمل Static Stretching؟",
      options: ["قبل التمرين", "بعد التمرين", "أثناء التمرين", "الصبح بس"],
      correctIndex: 1,
      explanation: "الـ Static Stretching بعد التمرين بيحسن المرونة ويقلل الشد — قبله ممكن يقلل القوة.",
    },
    tip: "💡 5 دقائق stretching بعد كل تمرين = فرق كبير في المرونة خلال شهر.",
    icon: "🤸",
  },
  {
    id: "lesson-17",
    day: 17,
    title: "الفيتامينات الأساسية للرياضي",
    category: "science",
    duration: "2 دقائق",
    content: [
      "فيتامين D: ضروري للعظام والعضلات — 70% من العرب عندهم نقص!",
      "فيتامين B12: مهم للطاقة وتكوين خلايا الدم الحمراء.",
      "المغنيسيوم: بيمنع التشنجات ويحسن النوم.",
      "الزنك: مهم للمناعة وإنتاج التستوستيرون.",
    ],
    quiz: {
      question: "أي فيتامين أغلب العرب عندهم نقص فيه؟",
      options: ["فيتامين C", "فيتامين D", "فيتامين A", "فيتامين E"],
      correctIndex: 1,
      explanation: "رغم الشمس، 70% من العرب عندهم نقص فيتامين D بسبب قلة التعرض المباشر.",
    },
    tip: "💡 15 دقيقة شمس يومياً (قبل 10 صباحاً) = جرعة فيتامين D طبيعية.",
    icon: "💊",
  },
  {
    id: "lesson-18",
    day: 18,
    title: "التصور الذهني — تمرين بدون حركة",
    category: "mindset",
    duration: "2 دقائق",
    content: [
      "الدراسات أثبتت إن التصور الذهني بيحسن الأداء 13-35%.",
      "تخيل نفسك بتأدي التمرين بشكل مثالي قبل ما تعمله.",
      "المخ مش بيفرق كتير بين التخيل والواقع — نفس المسارات العصبية بتنشط.",
      "5 دقائق تصور ذهني قبل التمرين = أداء أفضل وثقة أكبر.",
    ],
    quiz: {
      question: "كم نسبة تحسن الأداء من التصور الذهني؟",
      options: ["1-5%", "13-35%", "50-70%", "مفيش تحسن"],
      correctIndex: 1,
      explanation: "الأبحاث أثبتت تحسن 13-35% — لذلك الرياضيين المحترفين بيستخدموه دايماً.",
    },
    tip: "💡 قبل ما تنام، تخيل نفسك بتحقق هدفك — ده بيبرمج عقلك الباطن.",
    icon: "🎯",
  },
  {
    id: "lesson-19",
    day: 19,
    title: "السعرات الحرارية — الحقيقة البسيطة",
    category: "nutrition",
    duration: "2 دقائق",
    content: [
      "خسارة الوزن = سعرات أقل مما تحرق (Caloric Deficit).",
      "بناء العضلات = سعرات أكتر مما تحرق (Caloric Surplus).",
      "عجز 500 سعرة يومياً = خسارة ~0.5 كيلو أسبوعياً.",
      "مش لازم تجوع! قلل 300-500 سعرة بس وزود البروتين.",
    ],
    quiz: {
      question: "كم عجز سعرات يومي لخسارة 0.5 كيلو أسبوعياً؟",
      options: ["100 سعرة", "300 سعرة", "500 سعرة", "1000 سعرة"],
      correctIndex: 2,
      explanation: "500 سعرة × 7 أيام = 3500 سعرة = ~0.5 كيلو دهون. ده معدل آمن ومستدام.",
    },
    tip: "💡 بدل ما تحرم نفسك، استبدل: عصير → فاكهة كاملة = وفرت 100 سعرة!",
    icon: "🔢",
  },
  {
    id: "lesson-20",
    day: 20,
    title: "الاستشفاء النشط — Active Recovery",
    category: "recovery",
    duration: "2 دقائق",
    content: [
      "الاستشفاء النشط أفضل من الراحة الكاملة بنسبة 40%.",
      "أمثلة: مشي 20 دقيقة، سباحة خفيفة، يوجا، foam rolling.",
      "بيزود تدفق الدم للعضلات المتعبة = تغذية وإصلاح أسرع.",
      "شدة الاستشفاء النشط: 30-50% من أقصى مجهود (تقدر تتكلم بسهولة).",
    ],
    quiz: {
      question: "ليه الاستشفاء النشط أفضل من الراحة الكاملة؟",
      options: ["بيحرق سعرات أكتر", "بيزود تدفق الدم للعضلات", "بيبني عضلات", "مفيش فرق"],
      correctIndex: 1,
      explanation: "تدفق الدم بيوصل مغذيات وأكسجين للعضلات المتعبة = استشفاء أسرع.",
    },
    tip: "💡 في يوم الراحة، امشي 20-30 دقيقة — هتحس بفرق كبير تاني يوم.",
    icon: "🚶",
  },
  {
    id: "lesson-21",
    day: 21,
    title: "العادات — كيف تبني روتين دائم",
    category: "mindset",
    duration: "2 دقائق",
    content: [
      "العادة بتتكون في 21-66 يوم حسب الدراسات.",
      "ابدأ صغير جداً: 'هتمرن 5 دقائق' بدل 'هتمرن ساعة'.",
      "اربط العادة الجديدة بعادة موجودة: 'بعد القهوة الصبح = 10 squats'.",
      "لا تكسر السلسلة! كل يوم بتعمل فيه العادة بيقوي المسار العصبي.",
    ],
    quiz: {
      question: "إيه أفضل طريقة لبناء عادة جديدة؟",
      options: ["ابدأ كبير ومكثف", "ابدأ صغير واربطها بعادة موجودة", "اعملها مرة في الأسبوع", "استنى الحافز"],
      correctIndex: 1,
      explanation: "البداية الصغيرة + الربط بعادة موجودة = أعلى نسبة نجاح في بناء العادات.",
    },
    tip: "💡 أنت هنا يوم 21 — لو كملت لحد هنا يبقى أنت بطل! العادة بدأت تتكون 💪",
    icon: "🔄",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Micro-Lessons Button (Entry Point)
// ═══════════════════════════════════════════════════════════════════════════════

export function MicroLessonsButton() {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Card className="cursor-pointer border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 hover:shadow-lg transition-all hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base">درس اليوم</h3>
                <p className="text-xs text-muted-foreground">دقيقتين علم يومي</p>
              </div>
              <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-300">
                <BookOpen className="w-3 h-3 mr-1" />
                تعلّم
              </Badge>
            </div>
          </CardContent>
        </Card>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-right flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            أكاديمية MediSport
          </SheetTitle>
          <SheetDescription className="text-right">
            دروس يومية قصيرة (دقيقتين) في التغذية والتدريب والاستشفاء والعقلية
          </SheetDescription>
        </SheetHeader>
        <MicroLessonsContent />
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Micro-Lessons Content
// ═══════════════════════════════════════════════════════════════════════════════

function MicroLessonsContent() {
  const [progress, setProgress] = React.useState<LessonProgress>(() => {
    if (typeof window === "undefined") return getDefaultProgress();
    const stored = localStorage.getItem("medisport_lessons");
    return stored ? JSON.parse(stored) : getDefaultProgress();
  });
  const [activeView, setActiveView] = React.useState<"curriculum" | "lesson">("curriculum");
  const [selectedLesson, setSelectedLesson] = React.useState<Lesson | null>(null);
  const [quizAnswer, setQuizAnswer] = React.useState<number | null>(null);
  const [showExplanation, setShowExplanation] = React.useState(false);

  function getDefaultProgress(): LessonProgress {
    return {
      completedLessons: [],
      currentDay: 1,
      streak: 0,
      lastCompletedDate: "",
      quizScores: {},
      totalXP: 0,
    };
  }

  const saveProgress = (newProgress: LessonProgress) => {
    setProgress(newProgress);
    localStorage.setItem("medisport_lessons", JSON.stringify(newProgress));
  };

  const completeLesson = (lessonId: string) => {
    const today = new Date().toISOString().split("T")[0];
    const wasCompletedToday = progress.lastCompletedDate === today;
    const newStreak = wasCompletedToday ? progress.streak : progress.streak + 1;

    const newProgress: LessonProgress = {
      ...progress,
      completedLessons: [...new Set([...progress.completedLessons, lessonId])],
      currentDay: Math.max(progress.currentDay, (LESSONS.findIndex((l) => l.id === lessonId) || 0) + 2),
      streak: newStreak,
      lastCompletedDate: today,
      totalXP: progress.totalXP + 50,
    };
    saveProgress(newProgress);
    toast.success("🎓 أحسنت! +50 XP");
  };

  const handleQuizAnswer = (lessonId: string, answerIndex: number, correctIndex: number) => {
    setQuizAnswer(answerIndex);
    setShowExplanation(true);
    const isCorrect = answerIndex === correctIndex;
    const newProgress = {
      ...progress,
      quizScores: { ...progress.quizScores, [lessonId]: isCorrect },
      totalXP: progress.totalXP + (isCorrect ? 25 : 5),
    };
    saveProgress(newProgress);
    if (isCorrect) {
      toast.success("✅ إجابة صحيحة! +25 XP");
    } else {
      toast.error("❌ إجابة خاطئة — اقرأ التوضيح");
    }
  };

  const openLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setActiveView("lesson");
    setQuizAnswer(null);
    setShowExplanation(false);
  };

  const completedCount = progress.completedLessons.length;
  const totalLessons = LESSONS.length;
  const progressPercent = Math.round((completedCount / totalLessons) * 100);

  return (
    <div className="mt-4 space-y-4" dir="rtl">
      {activeView === "curriculum" && (
        <>
          {/* Progress Overview */}
          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <span className="font-bold">تقدمك</span>
                </div>
                <Badge className="bg-indigo-600">
                  {progress.totalXP} XP
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-700">{completedCount}</div>
                  <div className="text-xs text-muted-foreground">درس مكتمل</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{progress.streak}</div>
                  <div className="text-xs text-muted-foreground">أيام متتالية</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{progressPercent}%</div>
                  <div className="text-xs text-muted-foreground">إنجاز</div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {LESSON_CATEGORIES.map((cat) => (
              <Badge
                key={cat.id}
                variant="outline"
                className={`${cat.bg} ${cat.color} border-0 cursor-pointer whitespace-nowrap`}
              >
                <cat.icon className="w-3 h-3 mr-1" />
                {cat.label}
              </Badge>
            ))}
          </div>

          {/* Lessons List */}
          <div className="space-y-2">
            {LESSONS.map((lesson, idx) => {
              const isCompleted = progress.completedLessons.includes(lesson.id);
              const isLocked = idx > progress.currentDay;
              const isCurrent = idx === progress.currentDay - 1;
              const category = LESSON_CATEGORIES.find((c) => c.id === lesson.category);

              return (
                <div
                  key={lesson.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isLocked
                      ? "opacity-50 bg-gray-50 border-gray-200"
                      : isCompleted
                      ? "bg-green-50 border-green-200"
                      : isCurrent
                      ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200"
                      : "bg-white border-gray-200 hover:border-indigo-300 cursor-pointer"
                  }`}
                  onClick={() => !isLocked && openLesson(lesson)}
                >
                  {/* Day Number */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      isCompleted
                        ? "bg-green-500 text-white"
                        : isCurrent
                        ? "bg-indigo-500 text-white"
                        : isLocked
                        ? "bg-gray-300 text-gray-500"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : isLocked ? <Lock className="w-4 h-4" /> : lesson.day}
                  </div>

                  {/* Lesson Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{lesson.title}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {category && (
                        <Badge variant="outline" className={`text-[10px] ${category.bg} ${category.color} border-0 px-1.5 py-0`}>
                          {category.label}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {lesson.duration}
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="shrink-0">
                    {isCurrent && !isCompleted && (
                      <Badge className="bg-indigo-600 text-[10px]">ابدأ</Badge>
                    )}
                    {isCompleted && progress.quizScores[lesson.id] !== undefined && (
                      <Badge variant="outline" className={`text-[10px] ${progress.quizScores[lesson.id] ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {progress.quizScores[lesson.id] ? "✓" : "✗"}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ═══ Lesson View ═══ */}
      {activeView === "lesson" && selectedLesson && (
        <div className="space-y-4">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveView("curriculum")}
            className="flex items-center gap-1"
          >
            <ChevronRight className="w-4 h-4" />
            رجوع للمنهج
          </Button>

          {/* Lesson Header */}
          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{selectedLesson.icon}</span>
                <div>
                  <h3 className="font-bold text-lg">{selectedLesson.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {selectedLesson.duration}
                    <span>•</span>
                    <span>يوم {selectedLesson.day}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lesson Content */}
          <Card>
            <CardContent className="p-4 space-y-3">
              {selectedLesson.content.map((paragraph, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-indigo-600">{idx + 1}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{paragraph}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Tip */}
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm">{selectedLesson.tip}</p>
              </div>
            </CardContent>
          </Card>

          {/* Quiz */}
          {selectedLesson.quiz && (
            <Card className="border-2 border-indigo-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  اختبر معلوماتك (+25 XP)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <p className="font-medium text-sm">{selectedLesson.quiz.question}</p>
                <div className="space-y-2">
                  {selectedLesson.quiz.options.map((option, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className={`w-full justify-start text-right text-sm h-auto py-2.5 px-3 ${
                        quizAnswer !== null
                          ? idx === selectedLesson.quiz!.correctIndex
                            ? "bg-green-100 border-green-500 text-green-800"
                            : idx === quizAnswer
                            ? "bg-red-100 border-red-500 text-red-800"
                            : ""
                          : "hover:bg-indigo-50"
                      }`}
                      onClick={() => {
                        if (quizAnswer === null) {
                          handleQuizAnswer(selectedLesson.id, idx, selectedLesson.quiz!.correctIndex);
                        }
                      }}
                      disabled={quizAnswer !== null}
                    >
                      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold mr-2 shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {option}
                    </Button>
                  ))}
                </div>
                {showExplanation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                    <p className="text-xs text-blue-800">
                      <strong>التوضيح:</strong> {selectedLesson.quiz.explanation}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Complete Button */}
          {!progress.completedLessons.includes(selectedLesson.id) && (
            <Button
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white h-12"
              onClick={() => {
                completeLesson(selectedLesson.id);
                setActiveView("curriculum");
              }}
            >
              <Check className="w-5 h-5 mr-2" />
              أكملت الدرس! (+50 XP)
            </Button>
          )}

          {progress.completedLessons.includes(selectedLesson.id) && (
            <div className="text-center py-3">
              <Badge className="bg-green-600 text-sm px-4 py-1">
                <Check className="w-4 h-4 mr-1" />
                مكتمل ✓
              </Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
