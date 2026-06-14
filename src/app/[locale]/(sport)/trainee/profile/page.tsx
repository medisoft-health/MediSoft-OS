"use client";
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  Heart,
  Loader2,
  Phone,
  Pill,
  Ruler,
  Save,
  Scale,
  Shield,
  Target,
  User,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SportAuthGuard } from "@/components/sport/sport-auth-guard";

interface ProfileData {
  displayName?: string;
  sex?: string;
  birthDate?: string;
  heightCm?: number | string;
  weightKg?: number | string;
  goal?: string;
  activityLevel?: string;
  avatarUrl?: string;
  fitnessLevel?: string;
  equipmentAccess?: string;
  daysPerWeek?: number;
  injuries?: Array<{ area: string; description?: string; severity?: string }>;
  medicalConditions?: Array<{ name: string; since?: string; notes?: string }>;
  medications?: Array<{ name: string; dose?: string; frequency?: string }>;
  emergencyContact?: { name?: string; phone?: string; relationship?: string };
  phone?: string;
  bodyFatPct?: number | string;
  muscleMassKg?: number | string;
  preferredTrainingTime?: string;
  profileCompletion?: number;
}

const GOALS = [
  { id: "muscle_gain", ar: "بناء العضلات", en: "Muscle Gain" },
  { id: "fat_loss", ar: "حرق الدهون", en: "Fat Loss" },
  { id: "general_fitness", ar: "لياقة عامة", en: "General Fitness" },
  { id: "strength", ar: "القوة", en: "Strength" },
  { id: "endurance", ar: "التحمل", en: "Endurance" },
  { id: "flexibility", ar: "المرونة", en: "Flexibility" },
  { id: "sport_specific", ar: "رياضة محددة", en: "Sport Specific" },
];

const FITNESS_LEVELS = [
  { id: "beginner", ar: "مبتدئ", en: "Beginner" },
  { id: "intermediate", ar: "متوسط", en: "Intermediate" },
  { id: "advanced", ar: "متقدم", en: "Advanced" },
  { id: "elite", ar: "نخبة", en: "Elite" },
];

const EQUIPMENT_OPTIONS = [
  { id: "full_gym", ar: "صالة رياضية كاملة", en: "Full Gym" },
  { id: "home_basic", ar: "معدات منزلية أساسية", en: "Home Basic" },
  { id: "home_advanced", ar: "معدات منزلية متقدمة", en: "Home Advanced" },
  { id: "bodyweight", ar: "بدون معدات", en: "Bodyweight Only" },
  { id: "outdoor", ar: "تمارين خارجية", en: "Outdoor" },
];

const TRAINING_TIMES = [
  { id: "morning", ar: "صباحاً (٦-٩)", en: "Morning (6-9)" },
  { id: "midday", ar: "ظهراً (١١-٢)", en: "Midday (11-2)" },
  { id: "afternoon", ar: "عصراً (٣-٥)", en: "Afternoon (3-5)" },
  { id: "evening", ar: "مساءً (٦-٩)", en: "Evening (6-9)" },
  { id: "night", ar: "ليلاً (٩-١٢)", en: "Night (9-12)" },
];

const ACTIVITY_LEVELS = [
  { id: "sedentary", ar: "خامل", en: "Sedentary" },
  { id: "lightly_active", ar: "نشاط خفيف", en: "Lightly Active" },
  { id: "moderately_active", ar: "نشاط معتدل", en: "Moderately Active" },
  { id: "very_active", ar: "نشاط عالي", en: "Very Active" },
  { id: "extremely_active", ar: "نشاط مكثف", en: "Extremely Active" },
];

export default function TraineeProfilePage() {
  const locale = useLocale();
  const router = useRouter();
  const isAr = locale === "ar";

  const [profile, setProfile] = React.useState<ProfileData>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    basic: true,
    body: false,
    fitness: false,
    medical: false,
    emergency: false,
  });

  // Fetch profile on mount
  React.useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/sport?action=my-sport-profile");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setProfile({
            displayName: json.data.displayName || "",
            sex: json.data.sex || "",
            birthDate: json.data.birthDate || "",
            heightCm: json.data.heightCm || "",
            weightKg: json.data.weightKg || "",
            goal: json.data.goal || "",
            activityLevel: json.data.activityLevel || "",
            avatarUrl: json.data.avatarUrl || "",
            fitnessLevel: json.data.fitnessLevel || "beginner",
            equipmentAccess: json.data.equipmentAccess || "full_gym",
            daysPerWeek: json.data.daysPerWeek || 4,
            injuries: json.data.injuries || [],
            medicalConditions: json.data.medicalConditions || [],
            medications: json.data.medications || [],
            emergencyContact: json.data.emergencyContact || {},
            phone: json.data.phone || "",
            bodyFatPct: json.data.bodyFatPct || "",
            muscleMassKg: json.data.muscleMassKg || "",
            preferredTrainingTime: json.data.preferredTrainingTime || "",
            profileCompletion: json.data.profileCompletion || 0,
          });
        }
      }
    } catch (e) {
      console.error("Failed to fetch profile:", e);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/sport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-sport-profile",
          profile: {
            displayName: profile.displayName || null,
            sex: profile.sex || null,
            birthDate: profile.birthDate || null,
            heightCm: profile.heightCm ? Number(profile.heightCm) : null,
            weightKg: profile.weightKg ? Number(profile.weightKg) : null,
            goal: profile.goal || null,
            activityLevel: profile.activityLevel || null,
            avatarUrl: profile.avatarUrl || null,
            fitnessLevel: profile.fitnessLevel || "beginner",
            equipmentAccess: profile.equipmentAccess || "full_gym",
            daysPerWeek: profile.daysPerWeek || 4,
            injuries: profile.injuries || [],
            medicalConditions: profile.medicalConditions || [],
            medications: profile.medications || [],
            emergencyContact: profile.emergencyContact || {},
            phone: profile.phone || null,
            bodyFatPct: profile.bodyFatPct ? Number(profile.bodyFatPct) : null,
            muscleMassKg: profile.muscleMassKg ? Number(profile.muscleMassKg) : null,
            preferredTrainingTime: profile.preferredTrainingTime || null,
          },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setProfile((prev) => ({ ...prev, profileCompletion: json.completion }));
        toast.success(isAr ? "تم حفظ الملف الشخصي بنجاح" : "Profile saved successfully");
      } else {
        toast.error(isAr ? "فشل في حفظ البيانات" : "Failed to save");
      }
    } catch {
      toast.error(isAr ? "خطأ في الاتصال" : "Connection error");
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "avatar");
      const res = await fetch("/api/sport/upload", { method: "POST", body: form });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.url) {
          setProfile((prev) => ({ ...prev, avatarUrl: json.data.url }));
          toast.success(isAr ? "تم رفع الصورة بنجاح" : "Photo uploaded!");
        }
      } else {
        toast.error(isAr ? "فشل رفع الصورة" : "Upload failed");
      }
    } catch {
      toast.error(isAr ? "خطأ في الاتصال" : "Connection error");
    }
    setAvatarUploading(false);
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const addInjury = () => {
    setProfile((prev) => ({
      ...prev,
      injuries: [...(prev.injuries || []), { area: "", description: "", severity: "low" }],
    }));
  };

  const removeInjury = (idx: number) => {
    setProfile((prev) => ({
      ...prev,
      injuries: (prev.injuries || []).filter((_, i) => i !== idx),
    }));
  };

  const addCondition = () => {
    setProfile((prev) => ({
      ...prev,
      medicalConditions: [...(prev.medicalConditions || []), { name: "", since: "", notes: "" }],
    }));
  };

  const removeCondition = (idx: number) => {
    setProfile((prev) => ({
      ...prev,
      medicalConditions: (prev.medicalConditions || []).filter((_, i) => i !== idx),
    }));
  };

  const addMedication = () => {
    setProfile((prev) => ({
      ...prev,
      medications: [...(prev.medications || []), { name: "", dose: "", frequency: "" }],
    }));
  };

  const removeMedication = (idx: number) => {
    setProfile((prev) => ({
      ...prev,
      medications: (prev.medications || []).filter((_, i) => i !== idx),
    }));
  };

  const completion = profile.profileCompletion || 0;

  if (loading) {
    return (
      <SportAuthGuard>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SportAuthGuard>
    );
  }

  return (
    <SportAuthGuard>
      <div className="mx-auto max-w-2xl px-4 py-6 pb-28">
        {/* Header with avatar and completion */}
        <div className="mb-6 text-center">
          {/* Avatar */}
          <div className="relative mx-auto mb-4 h-24 w-24">
            <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-primary/20 bg-muted flex items-center justify-center">
              {profile.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt="Avatar"
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <label className="absolute bottom-0 end-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors">
              {avatarUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={avatarUploading}
              />
            </label>
          </div>

          <h1 className="text-xl font-bold">
            {isAr ? "ملفي الشخصي" : "My Profile"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr
              ? "أكمل بياناتك لتجربة تدريبية مخصصة"
              : "Complete your data for a personalized training experience"}
          </p>

          {/* Completion bar */}
          <div className="mt-4 flex items-center gap-3">
            <Progress value={completion} className="flex-1 h-2" />
            <Badge
              variant={completion >= 80 ? "default" : "secondary"}
              className="text-xs"
            >
              {completion}%
            </Badge>
          </div>
        </div>

        {/* ═══════════ SECTION: Basic Info ═══════════ */}
        <SectionCard
          title={isAr ? "المعلومات الأساسية" : "Basic Information"}
          icon={<User className="h-5 w-5" />}
          expanded={expandedSections.basic}
          onToggle={() => toggleSection("basic")}
        >
          <div className="space-y-4">
            <FieldRow label={isAr ? "الاسم" : "Name"}>
              <Input
                value={profile.displayName || ""}
                onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                placeholder={isAr ? "اسمك الكامل" : "Your full name"}
              />
            </FieldRow>

            <FieldRow label={isAr ? "الجنس" : "Sex"}>
              <div className="flex gap-2">
                {[
                  { id: "male", ar: "ذكر", en: "Male" },
                  { id: "female", ar: "أنثى", en: "Female" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setProfile({ ...profile, sex: opt.id })}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      profile.sex === opt.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {isAr ? opt.ar : opt.en}
                  </button>
                ))}
              </div>
            </FieldRow>

            <FieldRow label={isAr ? "تاريخ الميلاد" : "Birth Date"}>
              <Input
                type="date"
                value={profile.birthDate || ""}
                onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
              />
            </FieldRow>

            <FieldRow label={isAr ? "رقم الهاتف" : "Phone"}>
              <Input
                type="tel"
                dir="ltr"
                value={profile.phone || ""}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+966 5XX XXX XXXX"
              />
            </FieldRow>

            <FieldRow label={isAr ? "الهدف الرئيسي" : "Main Goal"}>
              <div className="grid grid-cols-2 gap-2">
                {GOALS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setProfile({ ...profile, goal: g.id })}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      profile.goal === g.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {isAr ? g.ar : g.en}
                  </button>
                ))}
              </div>
            </FieldRow>

            <FieldRow label={isAr ? "مستوى النشاط اليومي" : "Activity Level"}>
              <div className="grid grid-cols-2 gap-2">
                {ACTIVITY_LEVELS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setProfile({ ...profile, activityLevel: a.id })}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      profile.activityLevel === a.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {isAr ? a.ar : a.en}
                  </button>
                ))}
              </div>
            </FieldRow>
          </div>
        </SectionCard>

        {/* ═══════════ SECTION: Body Data ═══════════ */}
        <SectionCard
          title={isAr ? "بيانات الجسم" : "Body Data"}
          icon={<Scale className="h-5 w-5" />}
          expanded={expandedSections.body}
          onToggle={() => toggleSection("body")}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label={isAr ? "الطول (سم)" : "Height (cm)"}>
                <Input
                  type="number"
                  dir="ltr"
                  value={profile.heightCm || ""}
                  onChange={(e) => setProfile({ ...profile, heightCm: e.target.value })}
                  placeholder="175"
                />
              </FieldRow>
              <FieldRow label={isAr ? "الوزن (كجم)" : "Weight (kg)"}>
                <Input
                  type="number"
                  dir="ltr"
                  value={profile.weightKg || ""}
                  onChange={(e) => setProfile({ ...profile, weightKg: e.target.value })}
                  placeholder="75"
                />
              </FieldRow>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label={isAr ? "نسبة الدهون %" : "Body Fat %"}>
                <Input
                  type="number"
                  dir="ltr"
                  step="0.1"
                  value={profile.bodyFatPct || ""}
                  onChange={(e) => setProfile({ ...profile, bodyFatPct: e.target.value })}
                  placeholder="18.5"
                />
              </FieldRow>
              <FieldRow label={isAr ? "الكتلة العضلية (كجم)" : "Muscle Mass (kg)"}>
                <Input
                  type="number"
                  dir="ltr"
                  step="0.1"
                  value={profile.muscleMassKg || ""}
                  onChange={(e) => setProfile({ ...profile, muscleMassKg: e.target.value })}
                  placeholder="35.0"
                />
              </FieldRow>
            </div>
          </div>
        </SectionCard>

        {/* ═══════════ SECTION: Fitness Settings ═══════════ */}
        <SectionCard
          title={isAr ? "إعدادات التدريب" : "Training Settings"}
          icon={<Dumbbell className="h-5 w-5" />}
          expanded={expandedSections.fitness}
          onToggle={() => toggleSection("fitness")}
        >
          <div className="space-y-4">
            <FieldRow label={isAr ? "المستوى الرياضي" : "Fitness Level"}>
              <div className="grid grid-cols-2 gap-2">
                {FITNESS_LEVELS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setProfile({ ...profile, fitnessLevel: f.id })}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      profile.fitnessLevel === f.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {isAr ? f.ar : f.en}
                  </button>
                ))}
              </div>
            </FieldRow>

            <FieldRow label={isAr ? "المعدات المتاحة" : "Equipment Access"}>
              <div className="grid grid-cols-2 gap-2">
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <button
                    key={eq.id}
                    onClick={() => setProfile({ ...profile, equipmentAccess: eq.id })}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      profile.equipmentAccess === eq.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {isAr ? eq.ar : eq.en}
                  </button>
                ))}
              </div>
            </FieldRow>

            <FieldRow label={isAr ? "أيام التدريب أسبوعياً" : "Training Days/Week"}>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map((d) => (
                  <button
                    key={d}
                    onClick={() => setProfile({ ...profile, daysPerWeek: d })}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
                      profile.daysPerWeek === d
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </FieldRow>

            <FieldRow label={isAr ? "وقت التدريب المفضل" : "Preferred Training Time"}>
              <div className="grid grid-cols-2 gap-2">
                {TRAINING_TIMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setProfile({ ...profile, preferredTrainingTime: t.id })}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      profile.preferredTrainingTime === t.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {isAr ? t.ar : t.en}
                  </button>
                ))}
              </div>
            </FieldRow>
          </div>
        </SectionCard>

        {/* ═══════════ SECTION: Medical History ═══════════ */}
        <SectionCard
          title={isAr ? "السجل الطبي" : "Medical History"}
          icon={<Heart className="h-5 w-5" />}
          expanded={expandedSections.medical}
          onToggle={() => toggleSection("medical")}
        >
          <div className="space-y-5">
            {/* Injuries */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {isAr ? "الإصابات" : "Injuries"}
                </span>
                <Button variant="ghost" size="sm" onClick={addInjury}>
                  <Zap className="h-3 w-3 me-1" />
                  {isAr ? "إضافة" : "Add"}
                </Button>
              </div>
              {(profile.injuries || []).map((inj, idx) => (
                <div key={idx} className="mb-2 flex items-center gap-2">
                  <Input
                    value={inj.area}
                    onChange={(e) => {
                      const arr = [...(profile.injuries || [])];
                      arr[idx] = { ...arr[idx], area: e.target.value };
                      setProfile({ ...profile, injuries: arr });
                    }}
                    placeholder={isAr ? "المنطقة المصابة" : "Injured area"}
                    className="flex-1"
                  />
                  <Input
                    value={inj.description || ""}
                    onChange={(e) => {
                      const arr = [...(profile.injuries || [])];
                      arr[idx] = { ...arr[idx], description: e.target.value };
                      setProfile({ ...profile, injuries: arr });
                    }}
                    placeholder={isAr ? "وصف" : "Description"}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeInjury(idx)}
                    className="text-destructive shrink-0"
                  >
                    ✕
                  </Button>
                </div>
              ))}
              {(profile.injuries || []).length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {isAr ? "لا توجد إصابات مسجلة" : "No injuries recorded"}
                </p>
              )}
            </div>

            {/* Medical Conditions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {isAr ? "الحالات الطبية" : "Medical Conditions"}
                </span>
                <Button variant="ghost" size="sm" onClick={addCondition}>
                  <AlertCircle className="h-3 w-3 me-1" />
                  {isAr ? "إضافة" : "Add"}
                </Button>
              </div>
              {(profile.medicalConditions || []).map((cond, idx) => (
                <div key={idx} className="mb-2 flex items-center gap-2">
                  <Input
                    value={cond.name}
                    onChange={(e) => {
                      const arr = [...(profile.medicalConditions || [])];
                      arr[idx] = { ...arr[idx], name: e.target.value };
                      setProfile({ ...profile, medicalConditions: arr });
                    }}
                    placeholder={isAr ? "اسم الحالة" : "Condition name"}
                    className="flex-1"
                  />
                  <Input
                    value={cond.notes || ""}
                    onChange={(e) => {
                      const arr = [...(profile.medicalConditions || [])];
                      arr[idx] = { ...arr[idx], notes: e.target.value };
                      setProfile({ ...profile, medicalConditions: arr });
                    }}
                    placeholder={isAr ? "ملاحظات" : "Notes"}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCondition(idx)}
                    className="text-destructive shrink-0"
                  >
                    ✕
                  </Button>
                </div>
              ))}
              {(profile.medicalConditions || []).length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {isAr ? "لا توجد حالات طبية" : "No conditions recorded"}
                </p>
              )}
            </div>

            {/* Medications */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {isAr ? "الأدوية الحالية" : "Current Medications"}
                </span>
                <Button variant="ghost" size="sm" onClick={addMedication}>
                  <Pill className="h-3 w-3 me-1" />
                  {isAr ? "إضافة" : "Add"}
                </Button>
              </div>
              {(profile.medications || []).map((med, idx) => (
                <div key={idx} className="mb-2 flex items-center gap-2">
                  <Input
                    value={med.name}
                    onChange={(e) => {
                      const arr = [...(profile.medications || [])];
                      arr[idx] = { ...arr[idx], name: e.target.value };
                      setProfile({ ...profile, medications: arr });
                    }}
                    placeholder={isAr ? "اسم الدواء" : "Medication name"}
                    className="flex-1"
                  />
                  <Input
                    value={med.dose || ""}
                    onChange={(e) => {
                      const arr = [...(profile.medications || [])];
                      arr[idx] = { ...arr[idx], dose: e.target.value };
                      setProfile({ ...profile, medications: arr });
                    }}
                    placeholder={isAr ? "الجرعة" : "Dose"}
                    className="w-24"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMedication(idx)}
                    className="text-destructive shrink-0"
                  >
                    ✕
                  </Button>
                </div>
              ))}
              {(profile.medications || []).length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {isAr ? "لا توجد أدوية حالية" : "No medications recorded"}
                </p>
              )}
            </div>
          </div>
        </SectionCard>

        {/* ═══════════ SECTION: Emergency Contact ═══════════ */}
        <SectionCard
          title={isAr ? "جهة اتصال الطوارئ" : "Emergency Contact"}
          icon={<Shield className="h-5 w-5" />}
          expanded={expandedSections.emergency}
          onToggle={() => toggleSection("emergency")}
        >
          <div className="space-y-4">
            <FieldRow label={isAr ? "الاسم" : "Name"}>
              <Input
                value={profile.emergencyContact?.name || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    emergencyContact: { ...profile.emergencyContact, name: e.target.value },
                  })
                }
                placeholder={isAr ? "اسم جهة الاتصال" : "Contact name"}
              />
            </FieldRow>
            <FieldRow label={isAr ? "رقم الهاتف" : "Phone"}>
              <Input
                type="tel"
                dir="ltr"
                value={profile.emergencyContact?.phone || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    emergencyContact: { ...profile.emergencyContact, phone: e.target.value },
                  })
                }
                placeholder="+966 5XX XXX XXXX"
              />
            </FieldRow>
            <FieldRow label={isAr ? "صلة القرابة" : "Relationship"}>
              <Input
                value={profile.emergencyContact?.relationship || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    emergencyContact: { ...profile.emergencyContact, relationship: e.target.value },
                  })
                }
                placeholder={isAr ? "أخ، أب، زوج..." : "Brother, Father, Spouse..."}
              />
            </FieldRow>
          </div>
        </SectionCard>

        {/* ═══════════ SAVE BUTTON (Fixed bottom) ═══════════ */}
        <div className="fixed bottom-20 inset-x-0 z-40 px-4">
          <div className="mx-auto max-w-2xl">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-12 text-base font-bold shadow-xl"
              size="lg"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin me-2" />
              ) : (
                <Save className="h-5 w-5 me-2" />
              )}
              {isAr ? "حفظ الملف الشخصي" : "Save Profile"}
            </Button>
          </div>
        </div>
      </div>
    </SportAuthGuard>
  );
}

/* ═══════════ Helper Components ═══════════ */

function SectionCard({
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="mb-4 border-0 shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-start"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <span className="font-semibold text-sm">{title}</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {expanded && <CardContent className="px-5 pb-5 pt-0">{children}</CardContent>}
    </Card>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
