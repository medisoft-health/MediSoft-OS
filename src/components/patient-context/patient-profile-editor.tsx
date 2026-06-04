"use client";

import * as React from "react";
import Image from "next/image";
import {
  User,
  Phone,
  MapPin,
  Heart,
  Shield,
  Pill,
  Stethoscope,
  Users,
  Camera,
  Save,
  Plus,
  Trash2,
  Mic,
  Upload,
  FileText,
  Activity,
  Syringe,
  Brain,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Cigarette,
  Dumbbell,
  UtensilsCrossed,
  Baby,
  Briefcase,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────
interface PatientProfileData {
  id: number;
  mrn: string;
  firstName: string;
  lastName: string;
  firstNameAr?: string | null;
  lastNameAr?: string | null;
  middleName?: string | null;
  middleNameAr?: string | null;
  dateOfBirth: string;
  sex: string;
  bloodType?: string | null;
  phone?: string | null;
  secondaryPhone?: string | null;
  email?: string | null;
  saudiId?: string | null;
  nationality?: string | null;
  maritalStatus?: string | null;
  occupation?: string | null;
  occupationAr?: string | null;
  preferredLanguage?: string | null;
  photoUrl?: string | null;
  // Address
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  } | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  // Insurance
  insuranceId?: string | null;
  insuranceProvider?: string | null;
  // Clinical
  allergies?: Array<{ substance: string; reaction?: string; severity?: string }> | null;
  chronicConditions?: Array<{ description: string; icdCode?: string; onsetDate?: string }> | null;
  currentMedications?: Array<{ name: string; dose?: string; frequency?: string; since?: string; prescribedBy?: string }> | null;
  surgicalHistory?: Array<{ procedure: string; date?: string; hospital?: string; notes?: string }> | null;
  immunizations?: Array<{ vaccine: string; date?: string; dose?: string; provider?: string }> | null;
  medicalHistory?: string | null;
  familyHistory?: string | null;
  socialHistory?: string | null;
  // Lifestyle
  smokingStatus?: string | null;
  alcoholStatus?: string | null;
  exerciseFrequency?: string | null;
  dietType?: string | null;
  // Special needs
  disabilityNotes?: string | null;
  specialNeeds?: string | null;
  // Scores
  profileCompleteness?: number | null;
  healthScore?: number | null;
  // Emergency contacts
  emergencyContacts?: Array<{
    id?: number;
    name: string;
    nameAr?: string;
    relationship: string;
    phone: string;
    secondaryPhone?: string;
    isPrimary?: boolean;
  }> | null;
}

interface PatientProfileEditorProps {
  patient: PatientProfileData;
  onSave: (data: Partial<PatientProfileData>) => Promise<void>;
  onVoiceRecord?: () => void;
  onUploadDocument?: () => void;
  onTakePhoto?: () => void;
}

type SectionId = "demographics" | "contact" | "address" | "emergency" | "insurance" | "clinical" | "medications" | "surgical" | "immunizations" | "lifestyle" | "history" | "special";

// ─────────────────────────────────────────────────────────────────
//  Section Component
// ─────────────────────────────────────────────────────────────────
function ProfileSection({
  id,
  title,
  icon: Icon,
  children,
  completeness,
  defaultOpen = false,
}: {
  id: SectionId;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  completeness?: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <Icon className="h-5 w-5 text-blue-600 flex-shrink-0" />
        <span className="font-semibold text-gray-900 text-sm">{title}</span>
        {completeness !== undefined && (
          <div className="flex items-center gap-2 mr-auto">
            <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  completeness >= 80 ? "bg-green-500" : completeness >= 50 ? "bg-yellow-500" : "bg-red-500"
                )}
                style={{ width: `${completeness}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500">{completeness}%</span>
          </div>
        )}
        <div className="mr-auto" />
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 pb-4 pt-2 border-t border-gray-100">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────────────────
export function PatientProfileEditor({
  patient,
  onSave,
  onVoiceRecord,
  onUploadDocument,
  onTakePhoto,
}: PatientProfileEditorProps) {
  const [saving, setSaving] = React.useState(false);
  const [editData, setEditData] = React.useState<Partial<PatientProfileData>>({});
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Merge patient data with edits
  const merged = { ...patient, ...editData };

  const updateField = (field: string, value: unknown) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (Object.keys(editData).length === 0) return;
    setSaving(true);
    try {
      await onSave(editData);
      setSuccessMessage("تم حفظ البيانات بنجاح");
      setEditData({});
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      // Error handled by parent
    } finally {
      setSaving(false);
    }
  };

  // Calculate section completeness
  const demoComplete = [merged.firstName, merged.lastName, merged.dateOfBirth, merged.sex, merged.nationality, merged.maritalStatus].filter(Boolean).length / 6 * 100;
  const contactComplete = [merged.phone, merged.email].filter(Boolean).length / 2 * 100;
  const addressComplete = merged.address ? Object.values(merged.address).filter(Boolean).length / 5 * 100 : 0;
  const emergencyComplete = (merged.emergencyContacts && merged.emergencyContacts.length > 0) ? 100 : 0;
  const clinicalComplete = [merged.allergies?.length, merged.chronicConditions?.length, merged.medicalHistory].filter(Boolean).length / 3 * 100;

  const hasChanges = Object.keys(editData).length > 0;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Top Actions Bar */}
      <div className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2">
          <Image src="/images/medi360-icon.png" alt="Medi360" width={28} height={28} />
          <div>
            <h3 className="font-bold text-gray-900 text-sm">الملف الطبي الشامل</h3>
            <p className="text-[10px] text-gray-500">Universal Patient Profile</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onVoiceRecord && (
            <Button size="sm" variant="outline" onClick={onVoiceRecord} className="gap-1.5">
              <Mic className="h-4 w-4 text-red-500" />
              <span className="hidden sm:inline">تسجيل صوتي</span>
            </Button>
          )}
          {onUploadDocument && (
            <Button size="sm" variant="outline" onClick={onUploadDocument} className="gap-1.5">
              <Upload className="h-4 w-4 text-blue-500" />
              <span className="hidden sm:inline">رفع مستند</span>
            </Button>
          )}
          {hasChanges && (
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 bg-green-600 hover:bg-green-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ التغييرات
            </Button>
          )}
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      {/* Photo + MRN Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4">
        <div className="relative group">
          <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-200 ring-2 ring-blue-100">
            {merged.photoUrl ? (
              <Image src={merged.photoUrl} alt="" fill className="object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl font-bold">
                {(merged.firstNameAr || merged.firstName)?.[0]}
              </div>
            )}
          </div>
          {onTakePhoto && (
            <button
              onClick={onTakePhoto}
              className="absolute bottom-0 left-0 bg-blue-600 text-white rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">
              {merged.firstNameAr || merged.firstName} {merged.middleNameAr || merged.middleName || ""} {merged.lastNameAr || merged.lastName}
            </h2>
            <Badge variant="outline" className="font-mono text-xs">{merged.mrn}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {merged.sex === "male" ? "ذكر" : "أنثى"} • {merged.dateOfBirth} • {merged.bloodType && merged.bloodType !== "unknown" ? merged.bloodType : ""}
          </p>
        </div>
        {/* Profile completeness ring */}
        <div className="flex flex-col items-center">
          <div className="relative h-16 w-16">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={
                  (merged.profileCompleteness || 0) >= 80 ? "#22c55e" :
                  (merged.profileCompleteness || 0) >= 50 ? "#eab308" : "#ef4444"
                }
                strokeWidth="3"
                strokeDasharray={`${merged.profileCompleteness || 0}, 100`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-gray-700">{merged.profileCompleteness || 0}%</span>
            </div>
          </div>
          <span className="text-[10px] text-gray-500 mt-1">اكتمال الملف</span>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {/* Demographics */}
        <ProfileSection id="demographics" title="البيانات الشخصية" icon={User} completeness={Math.round(demoComplete)} defaultOpen={true}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">الاسم الأول (عربي)</label>
              <Input
                value={merged.firstNameAr || ""}
                onChange={(e) => updateField("firstNameAr", e.target.value)}
                placeholder="الاسم الأول"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">اسم الأب (عربي)</label>
              <Input
                value={merged.middleNameAr || ""}
                onChange={(e) => updateField("middleNameAr", e.target.value)}
                placeholder="اسم الأب"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">اسم العائلة (عربي)</label>
              <Input
                value={merged.lastNameAr || ""}
                onChange={(e) => updateField("lastNameAr", e.target.value)}
                placeholder="اسم العائلة"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">First Name</label>
              <Input
                value={merged.firstName || ""}
                onChange={(e) => updateField("firstName", e.target.value)}
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Middle Name</label>
              <Input
                value={merged.middleName || ""}
                onChange={(e) => updateField("middleName", e.target.value)}
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Last Name</label>
              <Input
                value={merged.lastName || ""}
                onChange={(e) => updateField("lastName", e.target.value)}
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">تاريخ الميلاد</label>
              <Input
                type="date"
                value={merged.dateOfBirth || ""}
                onChange={(e) => updateField("dateOfBirth", e.target.value)}
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">الجنس</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={merged.sex || ""}
                onChange={(e) => updateField("sex", e.target.value)}
              >
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">فصيلة الدم</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={merged.bloodType || "unknown"}
                onChange={(e) => updateField("bloodType", e.target.value)}
              >
                <option value="unknown">غير معروف</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">الجنسية</label>
              <Input
                value={merged.nationality || ""}
                onChange={(e) => updateField("nationality", e.target.value)}
                placeholder="سعودي"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">الحالة الاجتماعية</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={merged.maritalStatus || ""}
                onChange={(e) => updateField("maritalStatus", e.target.value)}
              >
                <option value="">-- اختر --</option>
                <option value="single">أعزب</option>
                <option value="married">متزوج</option>
                <option value="divorced">مطلق</option>
                <option value="widowed">أرمل</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">رقم الهوية / الإقامة</label>
              <Input
                value={merged.saudiId || ""}
                onChange={(e) => updateField("saudiId", e.target.value)}
                placeholder="10XXXXXXXX"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">المهنة</label>
              <Input
                value={merged.occupationAr || merged.occupation || ""}
                onChange={(e) => updateField("occupationAr", e.target.value)}
                placeholder="مهندس، طالب، ..."
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">اللغة المفضلة</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={merged.preferredLanguage || "ar"}
                onChange={(e) => updateField("preferredLanguage", e.target.value)}
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
                <option value="ur">اردو</option>
                <option value="hi">हिन्दी</option>
                <option value="fr">Français</option>
              </select>
            </div>
          </div>
        </ProfileSection>

        {/* Contact */}
        <ProfileSection id="contact" title="معلومات التواصل" icon={Phone} completeness={Math.round(contactComplete)}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">الهاتف الأساسي</label>
              <Input
                value={merged.phone || ""}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="+966 5XX XXX XXXX"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">الهاتف الثانوي</label>
              <Input
                value={merged.secondaryPhone || ""}
                onChange={(e) => updateField("secondaryPhone", e.target.value)}
                placeholder="+966 5XX XXX XXXX"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">البريد الإلكتروني</label>
              <Input
                type="email"
                value={merged.email || ""}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="patient@example.com"
                dir="ltr"
              />
            </div>
          </div>
        </ProfileSection>

        {/* Address */}
        <ProfileSection id="address" title="العنوان" icon={MapPin} completeness={Math.round(addressComplete)}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-600 mb-1 block">العنوان (سطر 1)</label>
              <Input
                value={merged.address?.line1 || ""}
                onChange={(e) => updateField("address", { ...merged.address, line1: e.target.value })}
                placeholder="الشارع، الحي"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">العنوان (سطر 2)</label>
              <Input
                value={merged.address?.line2 || ""}
                onChange={(e) => updateField("address", { ...merged.address, line2: e.target.value })}
                placeholder="رقم المبنى، الشقة"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">المدينة</label>
              <Input
                value={merged.address?.city || merged.city || ""}
                onChange={(e) => {
                  updateField("address", { ...merged.address, city: e.target.value });
                  updateField("city", e.target.value);
                }}
                placeholder="الرياض"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">المنطقة</label>
              <Input
                value={merged.address?.region || merged.region || ""}
                onChange={(e) => {
                  updateField("address", { ...merged.address, region: e.target.value });
                  updateField("region", e.target.value);
                }}
                placeholder="منطقة الرياض"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">الرمز البريدي</label>
              <Input
                value={merged.address?.postalCode || ""}
                onChange={(e) => updateField("address", { ...merged.address, postalCode: e.target.value })}
                placeholder="12345"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">الدولة</label>
              <Input
                value={merged.address?.country || merged.country || "SA"}
                onChange={(e) => {
                  updateField("address", { ...merged.address, country: e.target.value });
                  updateField("country", e.target.value);
                }}
                placeholder="المملكة العربية السعودية"
              />
            </div>
          </div>
        </ProfileSection>

        {/* Emergency Contacts */}
        <ProfileSection id="emergency" title="جهات الطوارئ" icon={Users} completeness={Math.round(emergencyComplete)}>
          <EmergencyContactsEditor
            contacts={merged.emergencyContacts || []}
            onChange={(contacts) => updateField("emergencyContacts", contacts)}
          />
        </ProfileSection>

        {/* Insurance */}
        <ProfileSection id="insurance" title="التأمين الصحي" icon={Shield}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">شركة التأمين</label>
              <Input
                value={merged.insuranceProvider || ""}
                onChange={(e) => updateField("insuranceProvider", e.target.value)}
                placeholder="بوبا، التعاونية، ..."
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">رقم البوليصة</label>
              <Input
                value={merged.insuranceId || ""}
                onChange={(e) => updateField("insuranceId", e.target.value)}
                placeholder="INS-XXXXXX"
                dir="ltr"
              />
            </div>
          </div>
        </ProfileSection>

        {/* Clinical - Allergies & Chronic Conditions */}
        <ProfileSection id="clinical" title="الحالة الصحية" icon={Heart} completeness={Math.round(clinicalComplete)} defaultOpen={true}>
          {/* Allergies */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-semibold text-gray-800">الحساسية</span>
            </div>
            <ArrayFieldEditor
              items={merged.allergies || []}
              onChange={(items) => updateField("allergies", items)}
              fields={[
                { key: "substance", label: "المادة", placeholder: "بنسلين" },
                { key: "reaction", label: "رد الفعل", placeholder: "طفح جلدي" },
                { key: "severity", label: "الشدة", placeholder: "شديد", type: "select", options: ["mild", "moderate", "severe"] },
              ]}
              emptyLabel="لا توجد حساسية مسجلة"
            />
          </div>
          {/* Chronic Conditions */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-gray-800">الأمراض المزمنة</span>
            </div>
            <ArrayFieldEditor
              items={merged.chronicConditions || []}
              onChange={(items) => updateField("chronicConditions", items)}
              fields={[
                { key: "description", label: "المرض", placeholder: "سكري نوع 2" },
                { key: "icdCode", label: "كود ICD", placeholder: "E11", type: "text" },
                { key: "onsetDate", label: "تاريخ البداية", placeholder: "2020", type: "text" },
              ]}
              emptyLabel="لا توجد أمراض مزمنة مسجلة"
            />
          </div>
        </ProfileSection>

        {/* Current Medications */}
        <ProfileSection id="medications" title="الأدوية الحالية" icon={Pill}>
          <ArrayFieldEditor
            items={merged.currentMedications || []}
            onChange={(items) => updateField("currentMedications", items)}
            fields={[
              { key: "name", label: "اسم الدواء", placeholder: "ميتفورمين" },
              { key: "dose", label: "الجرعة", placeholder: "500mg" },
              { key: "frequency", label: "التكرار", placeholder: "مرتين يومياً" },
              { key: "since", label: "منذ", placeholder: "2023" },
            ]}
            emptyLabel="لا توجد أدوية مسجلة"
          />
        </ProfileSection>

        {/* Surgical History */}
        <ProfileSection id="surgical" title="العمليات الجراحية" icon={Stethoscope}>
          <ArrayFieldEditor
            items={merged.surgicalHistory || []}
            onChange={(items) => updateField("surgicalHistory", items)}
            fields={[
              { key: "procedure", label: "العملية", placeholder: "استئصال الزائدة" },
              { key: "date", label: "التاريخ", placeholder: "2019" },
              { key: "hospital", label: "المستشفى", placeholder: "مستشفى الملك فيصل" },
              { key: "notes", label: "ملاحظات", placeholder: "" },
            ]}
            emptyLabel="لا توجد عمليات جراحية مسجلة"
          />
        </ProfileSection>

        {/* Immunizations */}
        <ProfileSection id="immunizations" title="التطعيمات" icon={Syringe}>
          <ArrayFieldEditor
            items={merged.immunizations || []}
            onChange={(items) => updateField("immunizations", items)}
            fields={[
              { key: "vaccine", label: "اللقاح", placeholder: "كوفيد-19" },
              { key: "date", label: "التاريخ", placeholder: "2021-06" },
              { key: "dose", label: "الجرعة", placeholder: "الثانية" },
              { key: "provider", label: "المقدم", placeholder: "وزارة الصحة" },
            ]}
            emptyLabel="لا توجد تطعيمات مسجلة"
          />
        </ProfileSection>

        {/* Lifestyle */}
        <ProfileSection id="lifestyle" title="نمط الحياة" icon={Dumbbell}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block flex items-center gap-1">
                <Cigarette className="h-3 w-3" /> التدخين
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={merged.smokingStatus || ""}
                onChange={(e) => updateField("smokingStatus", e.target.value)}
              >
                <option value="">-- اختر --</option>
                <option value="never">لا يدخن</option>
                <option value="former">مدخن سابق</option>
                <option value="current">مدخن حالي</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block flex items-center gap-1">
                <Dumbbell className="h-3 w-3" /> الرياضة
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={merged.exerciseFrequency || ""}
                onChange={(e) => updateField("exerciseFrequency", e.target.value)}
              >
                <option value="">-- اختر --</option>
                <option value="none">لا يمارس</option>
                <option value="occasional">أحياناً</option>
                <option value="regular">منتظم (3-5 أيام/أسبوع)</option>
                <option value="daily">يومياً</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block flex items-center gap-1">
                <UtensilsCrossed className="h-3 w-3" /> النظام الغذائي
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={merged.dietType || ""}
                onChange={(e) => updateField("dietType", e.target.value)}
              >
                <option value="">-- اختر --</option>
                <option value="regular">عادي</option>
                <option value="diabetic">نظام سكري</option>
                <option value="low_sodium">قليل الملح</option>
                <option value="vegetarian">نباتي</option>
                <option value="keto">كيتو</option>
                <option value="high_protein">عالي البروتين</option>
              </select>
            </div>
          </div>
        </ProfileSection>

        {/* Medical History (Free text) */}
        <ProfileSection id="history" title="التاريخ المرضي" icon={Brain}>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">التاريخ المرضي العام</label>
              <Textarea
                value={merged.medicalHistory || ""}
                onChange={(e) => updateField("medicalHistory", e.target.value)}
                placeholder="اكتب التاريخ المرضي الكامل هنا أو استخدم التسجيل الصوتي..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">التاريخ العائلي</label>
              <Textarea
                value={merged.familyHistory || ""}
                onChange={(e) => updateField("familyHistory", e.target.value)}
                placeholder="أمراض وراثية، تاريخ العائلة الصحي..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">التاريخ الاجتماعي</label>
              <Textarea
                value={merged.socialHistory || ""}
                onChange={(e) => updateField("socialHistory", e.target.value)}
                placeholder="الحالة الاجتماعية، بيئة العمل، السفر..."
                rows={3}
              />
            </div>
          </div>
        </ProfileSection>

        {/* Special Needs */}
        <ProfileSection id="special" title="احتياجات خاصة" icon={Baby}>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">إعاقة / ملاحظات</label>
              <Textarea
                value={merged.disabilityNotes || ""}
                onChange={(e) => updateField("disabilityNotes", e.target.value)}
                placeholder="أي إعاقة أو ملاحظات خاصة..."
                rows={2}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">احتياجات خاصة</label>
              <Textarea
                value={merged.specialNeeds || ""}
                onChange={(e) => updateField("specialNeeds", e.target.value)}
                placeholder="كرسي متحرك، مترجم، ..."
                rows={2}
              />
            </div>
          </div>
        </ProfileSection>
      </div>

      {/* Bottom Save Bar */}
      {hasChanges && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between rounded-lg shadow-lg">
          <span className="text-sm text-gray-600">لديك تغييرات غير محفوظة</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditData({})}>
              إلغاء
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 bg-green-600 hover:bg-green-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ جميع التغييرات
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Emergency Contacts Editor
// ─────────────────────────────────────────────────────────────────
function EmergencyContactsEditor({
  contacts,
  onChange,
}: {
  contacts: Array<{ id?: number; name: string; nameAr?: string; relationship: string; phone: string; secondaryPhone?: string; isPrimary?: boolean }>;
  onChange: (contacts: Array<{ id?: number; name: string; nameAr?: string; relationship: string; phone: string; secondaryPhone?: string; isPrimary?: boolean }>) => void;
}) {
  const addContact = () => {
    onChange([...contacts, { name: "", relationship: "", phone: "", isPrimary: contacts.length === 0 }]);
  };

  const removeContact = (idx: number) => {
    onChange(contacts.filter((_, i) => i !== idx));
  };

  const updateContact = (idx: number, field: string, value: string | boolean) => {
    const updated = [...contacts];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {contacts.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-2">لا توجد جهات طوارئ مسجلة</p>
      )}
      {contacts.map((contact, idx) => (
        <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700">
              جهة اتصال {idx + 1}
              {contact.isPrimary && <Badge className="mr-2 text-[10px] bg-blue-100 text-blue-700">أساسي</Badge>}
            </span>
            <button onClick={() => removeContact(idx)} className="text-red-400 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input
              value={contact.name}
              onChange={(e) => updateContact(idx, "name", e.target.value)}
              placeholder="الاسم"
            />
            <select
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={contact.relationship}
              onChange={(e) => updateContact(idx, "relationship", e.target.value)}
            >
              <option value="">-- القرابة --</option>
              <option value="father">الأب</option>
              <option value="mother">الأم</option>
              <option value="spouse">الزوج/الزوجة</option>
              <option value="sibling">أخ/أخت</option>
              <option value="child">ابن/ابنة</option>
              <option value="friend">صديق</option>
              <option value="other">آخر</option>
            </select>
            <Input
              value={contact.phone}
              onChange={(e) => updateContact(idx, "phone", e.target.value)}
              placeholder="+966 5XX XXX XXXX"
              dir="ltr"
            />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addContact} className="gap-1.5 w-full">
        <Plus className="h-4 w-4" />
        إضافة جهة اتصال
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Generic Array Field Editor (for allergies, medications, etc.)
// ─────────────────────────────────────────────────────────────────
interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  type?: "text" | "select";
  options?: string[];
}

function ArrayFieldEditor({
  items,
  onChange,
  fields,
  emptyLabel,
}: {
  items: Array<Record<string, string | undefined>>;
  onChange: (items: Array<Record<string, string | undefined>>) => void;
  fields: FieldDef[];
  emptyLabel: string;
}) {
  const addItem = () => {
    const newItem: Record<string, string | undefined> = {};
    fields.forEach((f) => (newItem[f.key] = ""));
    onChange([...items, newItem]);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, key: string, value: string) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [key]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-2">{emptyLabel}</p>
      )}
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md p-2">
          {fields.map((field) => (
            <div key={field.key} className="flex-1 min-w-0">
              {field.type === "select" && field.options ? (
                <select
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                  value={item[field.key] || ""}
                  onChange={(e) => updateItem(idx, field.key, e.target.value)}
                >
                  <option value="">{field.label}</option>
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <Input
                  className="text-xs h-8"
                  value={item[field.key] || ""}
                  onChange={(e) => updateItem(idx, field.key, e.target.value)}
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}
          <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 flex-shrink-0">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem} className="gap-1 text-xs">
        <Plus className="h-3.5 w-3.5" />
        إضافة
      </Button>
    </div>
  );
}
