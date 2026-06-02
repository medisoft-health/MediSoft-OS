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
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Apple,
  Brain,
  CheckCircle2,
  Dumbbell,
  Heart,
  Loader2,
  Smile,
  Stethoscope,
  Utensils,
} from "lucide-react";
import { usePatientContext } from "./patient-context-provider";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface ReportFormState {
  loading: boolean;
  success: boolean;
  error: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Symptom Report Form
// ═══════════════════════════════════════════════════════════════════════════════

function SymptomReportForm({ patientId }: { patientId: number }) {
  const [state, setState] = React.useState<ReportFormState>({ loading: false, success: false, error: null });
  const [symptom, setSymptom] = React.useState("");
  const [severity, setSeverity] = React.useState("moderate");
  const [duration, setDuration] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [description, setDescription] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptom.trim()) return;

    setState({ loading: true, success: false, error: null });
    try {
      const res = await fetch("/api/patient-360", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "report_symptom",
          patientId,
          data: { symptom, severity, duration, location, description },
        }),
      });
      if (res.ok) {
        setState({ loading: false, success: true, error: null });
        setSymptom(""); setSeverity("moderate"); setDuration(""); setLocation(""); setDescription("");
        setTimeout(() => setState(prev => ({ ...prev, success: false })), 3000);
      } else {
        const err = await res.json();
        setState({ loading: false, success: false, error: err.error || "حدث خطأ" });
      }
    } catch {
      setState({ loading: false, success: false, error: "فشل الاتصال بالخادم" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-purple-600" />
          تسجيل الأعراض
        </CardTitle>
        <CardDescription className="text-xs">
          سجّل أي أعراض تشعر بها ليتمكن طبيبك من متابعة حالتك
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">العَرَض *</Label>
              <Input
                value={symptom}
                onChange={e => setSymptom(e.target.value)}
                placeholder="مثال: صداع، ألم في الصدر..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">الشدة</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">خفيف</SelectItem>
                  <SelectItem value="moderate">متوسط</SelectItem>
                  <SelectItem value="severe">شديد</SelectItem>
                  <SelectItem value="very_severe">شديد جداً</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">المدة</Label>
              <Input
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="مثال: يومان، ساعة..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">الموقع</Label>
              <Input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="مثال: الرأس، البطن..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">وصف إضافي</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="صف الأعراض بالتفصيل..."
              rows={3}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={state.loading || !symptom.trim()} size="sm">
              {state.loading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              تسجيل العَرَض
            </Button>
            {state.success && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> تم التسجيل بنجاح
              </span>
            )}
            {state.error && (
              <span className="flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5" /> {state.error}
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mood Report Form
// ═══════════════════════════════════════════════════════════════════════════════

function MoodReportForm({ patientId }: { patientId: number }) {
  const [state, setState] = React.useState<ReportFormState>({ loading: false, success: false, error: null });
  const [mood, setMood] = React.useState("");
  const [score, setScore] = React.useState(5);
  const [sleepQuality, setSleepQuality] = React.useState("good");
  const [stressLevel, setStressLevel] = React.useState("moderate");
  const [notes, setNotes] = React.useState("");

  const moodOptions = [
    { value: "سعيد", emoji: "😊", label: "سعيد" },
    { value: "طبيعي", emoji: "😐", label: "طبيعي" },
    { value: "حزين", emoji: "😢", label: "حزين" },
    { value: "قلق", emoji: "😰", label: "قلق" },
    { value: "غاضب", emoji: "😤", label: "غاضب" },
    { value: "متعب", emoji: "😴", label: "متعب" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mood) return;

    setState({ loading: true, success: false, error: null });
    try {
      const res = await fetch("/api/patient-360", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "report_mood",
          patientId,
          data: { mood, score, sleepQuality, stressLevel, notes },
        }),
      });
      if (res.ok) {
        setState({ loading: false, success: true, error: null });
        setMood(""); setScore(5); setNotes("");
        setTimeout(() => setState(prev => ({ ...prev, success: false })), 3000);
      } else {
        const err = await res.json();
        setState({ loading: false, success: false, error: err.error || "حدث خطأ" });
      }
    } catch {
      setState({ loading: false, success: false, error: "فشل الاتصال بالخادم" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Smile className="w-4 h-4 text-amber-600" />
          تسجيل الحالة المزاجية
        </CardTitle>
        <CardDescription className="text-xs">
          تتبع حالتك المزاجية يومياً لمساعدة طبيبك في فهم صحتك النفسية
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mood Selection */}
          <div className="space-y-2">
            <Label className="text-xs">كيف تشعر اليوم؟ *</Label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {moodOptions.map(opt => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={mood === opt.value ? "default" : "outline"}
                  className="flex flex-col items-center gap-1 h-auto py-3"
                  onClick={() => setMood(opt.value)}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <span className="text-[10px]">{opt.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">مقياس المزاج (1-10)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="range"
                  min="1" max="10"
                  value={score}
                  onChange={e => setScore(Number(e.target.value))}
                  className="flex-1"
                />
                <Badge variant="outline" className="w-8 justify-center">{score}</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">جودة النوم</Label>
              <Select value={sleepQuality} onValueChange={setSleepQuality}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">ممتاز</SelectItem>
                  <SelectItem value="good">جيد</SelectItem>
                  <SelectItem value="fair">متوسط</SelectItem>
                  <SelectItem value="poor">سيء</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">مستوى التوتر</Label>
              <Select value={stressLevel} onValueChange={setStressLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">منخفض</SelectItem>
                  <SelectItem value="moderate">متوسط</SelectItem>
                  <SelectItem value="high">مرتفع</SelectItem>
                  <SelectItem value="very_high">مرتفع جداً</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">ملاحظات</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="أي ملاحظات إضافية عن يومك..."
              rows={2}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={state.loading || !mood} size="sm">
              {state.loading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              تسجيل المزاج
            </Button>
            {state.success && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> تم التسجيل بنجاح
              </span>
            )}
            {state.error && (
              <span className="flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5" /> {state.error}
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Food Report Form
// ═══════════════════════════════════════════════════════════════════════════════

function FoodReportForm({ patientId }: { patientId: number }) {
  const [state, setState] = React.useState<ReportFormState>({ loading: false, success: false, error: null });
  const [mealType, setMealType] = React.useState("lunch");
  const [description, setDescription] = React.useState("");
  const [calories, setCalories] = React.useState("");
  const [protein, setProtein] = React.useState("");
  const [carbs, setCarbs] = React.useState("");
  const [fat, setFat] = React.useState("");
  const [water, setWater] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setState({ loading: true, success: false, error: null });
    try {
      const res = await fetch("/api/patient-360", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "report_food",
          patientId,
          data: {
            mealType,
            description,
            calories: calories ? Number(calories) : undefined,
            protein: protein ? Number(protein) : undefined,
            carbs: carbs ? Number(carbs) : undefined,
            fat: fat ? Number(fat) : undefined,
            water: water ? Number(water) : undefined,
            notes,
          },
        }),
      });
      if (res.ok) {
        setState({ loading: false, success: true, error: null });
        setDescription(""); setCalories(""); setProtein(""); setCarbs(""); setFat(""); setWater(""); setNotes("");
        setTimeout(() => setState(prev => ({ ...prev, success: false })), 3000);
      } else {
        const err = await res.json();
        setState({ loading: false, success: false, error: err.error || "حدث خطأ" });
      }
    } catch {
      setState({ loading: false, success: false, error: "فشل الاتصال بالخادم" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Utensils className="w-4 h-4 text-green-600" />
          تسجيل الوجبات
        </CardTitle>
        <CardDescription className="text-xs">
          سجّل وجباتك اليومية لمتابعة التغذية وتحسين صحتك
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">نوع الوجبة</Label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">فطور</SelectItem>
                  <SelectItem value="lunch">غداء</SelectItem>
                  <SelectItem value="dinner">عشاء</SelectItem>
                  <SelectItem value="snack">وجبة خفيفة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">وصف الوجبة *</Label>
              <Input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="مثال: أرز مع دجاج مشوي وسلطة..."
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px]">سعرات (kcal)</Label>
              <Input type="number" value={calories} onChange={e => setCalories(e.target.value)} placeholder="500" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">بروتين (g)</Label>
              <Input type="number" value={protein} onChange={e => setProtein(e.target.value)} placeholder="30" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">كربوهيدرات (g)</Label>
              <Input type="number" value={carbs} onChange={e => setCarbs(e.target.value)} placeholder="60" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">دهون (g)</Label>
              <Input type="number" value={fat} onChange={e => setFat(e.target.value)} placeholder="15" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">ماء (ml)</Label>
              <Input type="number" value={water} onChange={e => setWater(e.target.value)} placeholder="250" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">ملاحظات</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="أي ملاحظات عن الوجبة..."
              rows={2}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={state.loading || !description.trim()} size="sm">
              {state.loading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              تسجيل الوجبة
            </Button>
            {state.success && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> تم التسجيل بنجاح
              </span>
            )}
            {state.error && (
              <span className="flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5" /> {state.error}
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Exercise Report Form
// ═══════════════════════════════════════════════════════════════════════════════

function ExerciseReportForm({ patientId }: { patientId: number }) {
  const [state, setState] = React.useState<ReportFormState>({ loading: false, success: false, error: null });
  const [exerciseType, setExerciseType] = React.useState("");
  const [duration, setDuration] = React.useState("");
  const [intensity, setIntensity] = React.useState("moderate");
  const [caloriesBurned, setCaloriesBurned] = React.useState("");
  const [heartRateAvg, setHeartRateAvg] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const exerciseTypes = [
    "مشي", "جري", "سباحة", "دراجة", "كرة قدم", "تمارين قوة",
    "يوغا", "تمارين منزلية", "تنس", "كرة سلة", "أخرى",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseType || !duration) return;

    setState({ loading: true, success: false, error: null });
    try {
      const res = await fetch("/api/patient-360", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "report_exercise",
          patientId,
          data: {
            exerciseType,
            duration: Number(duration),
            intensity,
            caloriesBurned: caloriesBurned ? Number(caloriesBurned) : undefined,
            heartRateAvg: heartRateAvg ? Number(heartRateAvg) : undefined,
            notes,
          },
        }),
      });
      if (res.ok) {
        setState({ loading: false, success: true, error: null });
        setExerciseType(""); setDuration(""); setCaloriesBurned(""); setHeartRateAvg(""); setNotes("");
        setTimeout(() => setState(prev => ({ ...prev, success: false })), 3000);
      } else {
        const err = await res.json();
        setState({ loading: false, success: false, error: err.error || "حدث خطأ" });
      }
    } catch {
      setState({ loading: false, success: false, error: "فشل الاتصال بالخادم" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-orange-600" />
          تسجيل التمارين
        </CardTitle>
        <CardDescription className="text-xs">
          سجّل نشاطك الرياضي لتتبع لياقتك البدنية
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">نوع التمرين *</Label>
              <Select value={exerciseType} onValueChange={setExerciseType}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع التمرين" />
                </SelectTrigger>
                <SelectContent>
                  {exerciseTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">المدة (دقائق) *</Label>
              <Input
                type="number"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="30"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">الشدة</Label>
              <Select value={intensity} onValueChange={setIntensity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">خفيف</SelectItem>
                  <SelectItem value="moderate">متوسط</SelectItem>
                  <SelectItem value="high">عالي</SelectItem>
                  <SelectItem value="very_high">عالي جداً</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">السعرات المحروقة (kcal)</Label>
              <Input
                type="number"
                value={caloriesBurned}
                onChange={e => setCaloriesBurned(e.target.value)}
                placeholder="200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">متوسط نبض القلب (bpm)</Label>
              <Input
                type="number"
                value={heartRateAvg}
                onChange={e => setHeartRateAvg(e.target.value)}
                placeholder="120"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">ملاحظات</Label>
              <Input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="أي ملاحظات عن التمرين..."
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={state.loading || !exerciseType || !duration} size="sm">
              {state.loading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              تسجيل التمرين
            </Button>
            {state.success && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> تم التسجيل بنجاح
              </span>
            )}
            {state.error && (
              <span className="flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5" /> {state.error}
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Patient Self-Report Component
// ═══════════════════════════════════════════════════════════════════════════════

export function PatientSelfReport() {
  const { patient, mode } = usePatientContext();

  if (mode !== "patient" || !patient) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Heart className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">اختر مريض لعرض نماذج التسجيل الذاتي</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
          <Brain className="size-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold">التسجيل الذاتي للمريض</h3>
          <p className="text-xs text-muted-foreground">سجّل بياناتك اليومية لمتابعة صحتك بشكل أفضل</p>
        </div>
      </div>

      <Tabs defaultValue="symptoms">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="symptoms" className="text-xs">
            <Stethoscope className="w-3.5 h-3.5 mr-1" />
            أعراض
          </TabsTrigger>
          <TabsTrigger value="mood" className="text-xs">
            <Smile className="w-3.5 h-3.5 mr-1" />
            مزاج
          </TabsTrigger>
          <TabsTrigger value="food" className="text-xs">
            <Apple className="w-3.5 h-3.5 mr-1" />
            تغذية
          </TabsTrigger>
          <TabsTrigger value="exercise" className="text-xs">
            <Dumbbell className="w-3.5 h-3.5 mr-1" />
            تمارين
          </TabsTrigger>
        </TabsList>

        <TabsContent value="symptoms" className="mt-4">
          <SymptomReportForm patientId={patient.id} />
        </TabsContent>
        <TabsContent value="mood" className="mt-4">
          <MoodReportForm patientId={patient.id} />
        </TabsContent>
        <TabsContent value="food" className="mt-4">
          <FoodReportForm patientId={patient.id} />
        </TabsContent>
        <TabsContent value="exercise" className="mt-4">
          <ExerciseReportForm patientId={patient.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
