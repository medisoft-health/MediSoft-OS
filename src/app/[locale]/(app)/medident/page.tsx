"use client";

import * as React from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Brain,
  CheckCircle2,
  ClipboardList,
  Crown,
  Download,
  FileText,
  Loader2,
  Microscope,
  RotateCcw,
  Scan,
  Shield,
  Sparkles,
  Swords,
  Target,
  Trash2,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

type ActiveModule =
  | null
  | "dental-chart"
  | "radiograph-ai"
  | "periodontal"
  | "treatment-planning"
  | "implant"
  | "orthodontics"
  | "endodontics"
  | "prosthodontics"
  | "pediatric"
  | "oral-surgery"
  | "tmj"
  | "dental-ai"
  | "emergency"
  | "cost-estimate"
  | "material";

interface ModuleCard {
  id: ActiveModule;
  title: string;
  titleAr: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  badge?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const MODULES: ModuleCard[] = [
  {
    id: "dental-chart",
    title: "Interactive Dental Chart",
    titleAr: "خريطة الأسنان التفاعلية",
    description: "FDI/Universal notation, per-surface charting, AI risk analysis",
    icon: <span className="text-2xl">🦷</span>,
    color: "from-blue-500 to-cyan-500",
    badge: "Core",
  },
  {
    id: "radiograph-ai",
    title: "Intelligent Radiograph Analysis",
    titleAr: "تحليل الأشعة بالذكاء الاصطناعي",
    description: "Periapical, bitewing, panoramic, CBCT interpretation",
    icon: <Scan className="h-6 w-6" />,
    color: "from-purple-500 to-indigo-500",
    badge: "AI",
  },
  {
    id: "periodontal",
    title: "Periodontal Charting",
    titleAr: "رسم اللثة والأنسجة",
    description: "6-point probing, BOP, CAL, AAP/EFP staging",
    icon: <BarChart3 className="h-6 w-6" />,
    color: "from-red-500 to-pink-500",
  },
  {
    id: "treatment-planning",
    title: "Intelligent Treatment Planning",
    titleAr: "خطة العلاج الذكية",
    description: "Phased plans, CDT coding, cost estimation, alternatives",
    icon: <ClipboardList className="h-6 w-6" />,
    color: "from-green-500 to-emerald-500",
    badge: "AI",
  },
  {
    id: "implant",
    title: "Implant Planning",
    titleAr: "تخطيط الزراعة",
    description: "Bone assessment, implant selection, surgical approach",
    icon: <Target className="h-6 w-6" />,
    color: "from-amber-500 to-orange-500",
    badge: "AI",
  },
  {
    id: "orthodontics",
    title: "Orthodontic Analysis",
    titleAr: "تحليل التقويم",
    description: "Cephalometrics, skeletal classification, treatment options",
    icon: <span className="text-2xl">😁</span>,
    color: "from-teal-500 to-cyan-500",
    badge: "AI",
  },
  {
    id: "endodontics",
    title: "Endodontic Module",
    titleAr: "علاج العصب",
    description: "Pulp diagnosis, canal morphology, treatment protocol",
    icon: <Microscope className="h-6 w-6" />,
    color: "from-rose-500 to-red-500",
    badge: "AI",
  },
  {
    id: "prosthodontics",
    title: "Prosthodontic Planning",
    titleAr: "التركيبات والأطقم",
    description: "Kennedy classification, material selection, lab prescription",
    icon: <Crown className="h-6 w-6" />,
    color: "from-yellow-500 to-amber-500",
    badge: "AI",
  },
  {
    id: "pediatric",
    title: "Pediatric Dentistry",
    titleAr: "أسنان الأطفال",
    description: "CAMBRA risk, behavior management, eruption tracking",
    icon: <Users className="h-6 w-6" />,
    color: "from-sky-500 to-blue-500",
    badge: "AI",
  },
  {
    id: "oral-surgery",
    title: "Oral Surgery Planning",
    titleAr: "جراحة الفم",
    description: "Difficulty scoring, surgical planning, post-op protocols",
    icon: <Swords className="h-6 w-6" />,
    color: "from-slate-500 to-gray-600",
    badge: "AI",
  },
  {
    id: "tmj",
    title: "TMJ Assessment",
    titleAr: "تقييم مفصل الفك",
    description: "DC/TMD criteria, pain assessment, splint therapy",
    icon: <span className="text-2xl">🦴</span>,
    color: "from-violet-500 to-purple-500",
    badge: "AI",
  },
  {
    id: "dental-ai",
    title: "Dental AI Assistant",
    titleAr: "المساعد الذكي لطب الأسنان",
    description: "Clinical decisions, patient education, evidence search",
    icon: <Brain className="h-6 w-6" />,
    color: "from-fuchsia-500 to-pink-500",
    badge: "AI",
  },
  {
    id: "emergency",
    title: "Emergency Triage",
    titleAr: "فرز الطوارئ",
    description: "Medical Intelligence dental emergency assessment and prioritization",
    icon: <AlertTriangle className="h-6 w-6" />,
    color: "from-red-600 to-orange-500",
    badge: "Urgent",
  },
  {
    id: "cost-estimate",
    title: "Cost Estimation",
    titleAr: "تقدير التكاليف",
    description: "Saudi market rates, CDT codes, insurance coverage",
    icon: <TrendingUp className="h-6 w-6" />,
    color: "from-emerald-500 to-green-500",
  },
  {
    id: "material",
    title: "Material Recommendation",
    titleAr: "توصية المواد",
    description: "Evidence-based material selection for any procedure",
    icon: <Shield className="h-6 w-6" />,
    color: "from-indigo-500 to-blue-500",
    badge: "AI",
  },
];

const UPPER_TEETH = ["18","17","16","15","14","13","12","11","21","22","23","24","25","26","27","28"];
const LOWER_TEETH = ["48","47","46","45","44","43","42","41","31","32","33","34","35","36","37","38"];

const TOOTH_CONDITIONS = [
  { value: "healthy", label: "Healthy", color: "bg-green-100 text-green-800 border-green-300" },
  { value: "caries", label: "Caries", color: "bg-red-100 text-red-800 border-red-300" },
  { value: "filled", label: "Filled", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "crowned", label: "Crown", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { value: "missing", label: "Missing", color: "bg-gray-200 text-gray-800 border-gray-400" },
  { value: "implant", label: "Implant", color: "bg-purple-100 text-purple-800 border-purple-300" },
  { value: "root_canal", label: "RCT", color: "bg-orange-100 text-orange-800 border-orange-300" },
  { value: "fractured", label: "Fractured", color: "bg-pink-100 text-pink-800 border-pink-300" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// AI Result Renderer — Formatted Clinical Reports
// ═══════════════════════════════════════════════════════════════════════════════

function AIResultRenderer({ data, module }: { data: unknown; module: ActiveModule }) {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, any>;

  // Helper to render a section
  const Section = ({ title, icon, children, color = "blue" }: { title: string; icon?: string; children: React.ReactNode; color?: string }) => (
    <div className={`border-l-4 border-${color}-400 pl-4 py-2 mb-4`}>
      <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
        {icon ? <span>{icon}</span> : null}
        {title}
      </h4>
      <div className="text-sm text-gray-700">{children}</div>
    </div>
  );

  // Helper to render a list
  const RenderList = ({ items }: { items: unknown }) => {
    if (!items || !Array.isArray(items)) return null;
    return (
      <ul className="space-y-1.5 ml-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>{typeof item === "string" ? item : (typeof item === "object" && item !== null && (item as Record<string, unknown>).procedure) ? String((item as Record<string, unknown>).procedure) : JSON.stringify(item)}</span>
          </li>
        ))}
      </ul>
    );
  };

  // Helper to render procedure table for treatment planning
  const ProcedureTable = ({ procedures }: { procedures: Array<Record<string, unknown>> }) => {
    if (!procedures || !Array.isArray(procedures) || procedures.length === 0) return null;
    return (
      <div className="overflow-x-auto mt-2">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="text-xs font-semibold w-[60px]">Tooth</TableHead>
              <TableHead className="text-xs font-semibold">Procedure</TableHead>
              <TableHead className="text-xs font-semibold w-[80px]">CDT</TableHead>
              <TableHead className="text-xs font-semibold w-[80px] text-right">Cost (SAR)</TableHead>
              <TableHead className="text-xs font-semibold w-[60px] text-center">Ins.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {procedures.map((proc, i) => (
              <TableRow key={i} className="hover:bg-blue-50/50">
                <TableCell className="text-xs font-medium">{proc.toothId ? String(proc.toothId) : "—"}</TableCell>
                <TableCell className="text-xs">
                  <div>{String(proc.procedure || "")}</div>
                  {proc.notes ? <div className="text-[10px] text-gray-500 mt-0.5">{String(proc.notes)}</div> : null}
                </TableCell>
                <TableCell className="text-xs font-mono text-blue-600">{proc.cdtCode ? String(proc.cdtCode) : "—"}</TableCell>
                <TableCell className="text-xs text-right font-medium">{proc.estimatedCost ? String(proc.estimatedCost) : "—"}</TableCell>
                <TableCell className="text-xs text-center">{proc.insuranceCovered ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mx-auto" /> : <span className="text-gray-400">—</span>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Helper to render key-value pairs
  const KeyValue = ({ label, value, highlight }: { label: string; value: unknown; highlight?: boolean }) => {
    if (value === null || value === undefined || value === "") return null;
    return (
      <div className={`flex items-start gap-2 py-1 ${highlight ? "bg-yellow-50 px-2 rounded" : ""}`}>
        <span className="font-medium text-gray-600 min-w-[140px] text-xs uppercase tracking-wide">{label}:</span>
        <span className="text-gray-800 text-sm">{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
      </div>
    );
  };

  // Priority badge
  const PriorityBadge = ({ priority }: { priority: string }) => {
    const colors: Record<string, string> = {
      immediate: "bg-red-100 text-red-800 border-red-300",
      high: "bg-orange-100 text-orange-800 border-orange-300",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
      low: "bg-green-100 text-green-800 border-green-300",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${colors[priority] || "bg-gray-100 text-gray-800"}`}>
        {priority?.toUpperCase()}
      </span>
    );
  };

  // ── Emergency Triage Result ──
  if (module === "emergency") {
    return (
      <div className="space-y-4">
        <div className={`p-4 rounded-lg ${d.urgencyLevel === "immediate" ? "bg-red-50 border-2 border-red-300" : "bg-orange-50 border border-orange-200"}`}>
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className={`h-6 w-6 ${d.urgencyLevel === "immediate" ? "text-red-600" : "text-orange-600"}`} />
            <span className="font-bold text-lg">{String(d.urgencyLevel || "").toUpperCase()} PRIORITY</span>
          </div>
          {Array.isArray(d.likelyDiagnosis) ? (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Likely Diagnosis</p>
              <div className="flex flex-wrap gap-2">
                {(d.likelyDiagnosis as string[]).map((dx, i) => (
                  <Badge key={i} variant="outline" className="bg-white">{String(dx)}</Badge>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        {d.immediateActions ? (
          <Section title="Immediate Actions" icon="⚡" color="red">
            <RenderList items={d.immediateActions} />
          </Section>
        ) : null}
        {d.warningSignsForER ? (
          <Section title="Warning Signs for ER" icon="🚨" color="red">
            <RenderList items={d.warningSignsForER} />
          </Section>
        ) : null}
        {d.referralNeeded ? (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="font-medium text-blue-800 text-sm">Referral: {String(d.referralSpecialty || "Specialist")}</p>
          </div>
        ) : null}
      </div>
    );
  }

  // ── Dental Chart Analysis ──
  if (module === "dental-chart") {
    return (
      <div className="space-y-4">
        {d.summary ? (
          <Section title="Clinical Summary" icon="📋" color="blue">
            <p className="leading-relaxed">{String(d.summary)}</p>
          </Section>
        ) : null}
        {Array.isArray(d.riskAreas) ? (
          <Section title="Risk Areas" icon="⚠️" color="orange">
            <div className="space-y-3">
              {(d.riskAreas as Array<Record<string, unknown>>).map((area, i) => (
                <div key={i} className="p-3 bg-white rounded-lg border shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">Tooth {String(area.tooth)}</span>
                    <PriorityBadge priority={String(area.priority || "medium")} />
                  </div>
                  <p className="text-xs text-gray-600">{String(area.risk)}</p>
                </div>
              ))}
            </div>
          </Section>
        ) : null}
        {d.treatmentSuggestions ? (
          <Section title="Treatment Suggestions" icon="💡" color="green">
            <RenderList items={d.treatmentSuggestions} />
          </Section>
        ) : null}
        {d.maintenancePlan ? (
          <Section title="Maintenance Plan" icon="🔄" color="teal">
            <p className="leading-relaxed">{String(d.maintenancePlan)}</p>
          </Section>
        ) : null}
        {typeof d.patientReport === "object" && d.patientReport ? (
          <Section title="Patient Report" icon="👤" color="purple">
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs font-medium text-blue-600 mb-1">English</p>
                <p className="text-sm">{String((d.patientReport as Record<string, unknown>).english || "")}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg" dir="rtl">
                <p className="text-xs font-medium text-green-600 mb-1">العربية</p>
                <p className="text-sm">{String((d.patientReport as Record<string, unknown>).arabic || "")}</p>
              </div>
            </div>
          </Section>
        ) : null}
      </div>
    );
  }

  // ── Endodontic Assessment ──
  if (module === "endodontics") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
            <p className="text-xs font-medium text-rose-600 uppercase">Pulp Diagnosis</p>
            <p className="font-bold text-rose-800 text-sm mt-1">{String(d.pulpDiagnosis || "").replace(/_/g, " ")}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-xs font-medium text-amber-600 uppercase">Periapical Diagnosis</p>
            <p className="font-bold text-amber-800 text-sm mt-1">{String(d.periapicalDiagnosis || "").replace(/_/g, " ")}</p>
          </div>
        </div>
        {typeof d.canalMorphology === "object" && d.canalMorphology ? (
          <Section title="Canal Morphology" icon="🔬" color="purple">
            <KeyValue label="Number of Canals" value={(d.canalMorphology as Record<string, unknown>).numberOfCanals} highlight />
            <KeyValue label="Difficulty" value={(d.canalMorphology as Record<string, unknown>).difficultyRating} />
            {Array.isArray((d.canalMorphology as Record<string, unknown>).canals) ? (
              <div className="mt-2 space-y-2">
                {((d.canalMorphology as Record<string, unknown>).canals as Array<Record<string, unknown>>).map((canal, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-white rounded border text-xs">
                    <span className="font-medium min-w-[100px]">{String(canal.name)}</span>
                    <span>Curvature: {String(canal.curvature)}</span>
                    <span>WL: {String(canal.workingLength)}mm</span>
                    <span>Apical: #{String(canal.apicalSize)}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </Section>
        ) : null}
        {typeof d.treatmentPlan === "object" && d.treatmentPlan ? (
          <Section title="Treatment Protocol" icon="📋" color="green">
            <KeyValue label="Procedure" value={(d.treatmentPlan as Record<string, unknown>).procedure} highlight />
            <KeyValue label="Visits" value={(d.treatmentPlan as Record<string, unknown>).visits} />
            {(d.treatmentPlan as Record<string, unknown>).irrigationProtocol ? (
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-500 mb-1">Irrigation Protocol:</p>
                <RenderList items={(d.treatmentPlan as Record<string, unknown>).irrigationProtocol} />
              </div>
            ) : null}
          </Section>
        ) : null}
      </div>
    );
  }

  // ── Treatment Planning ──
  if (module === "treatment-planning") {
    // Calculate total cost from phases if not provided directly
    let totalCost = d.totalEstimatedCost;
    if (!totalCost && Array.isArray(d.phases)) {
      totalCost = (d.phases as Array<Record<string, unknown>>).reduce((sum: number, phase: Record<string, unknown>) => {
        if (Array.isArray(phase.procedures)) {
          return sum + (phase.procedures as Array<Record<string, unknown>>).reduce((s: number, p: Record<string, unknown>) => s + (Number(p.estimatedCost) || 0), 0);
        }
        return sum;
      }, 0);
    }
    return (
      <div className="space-y-4">
        {totalCost ? (
          <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Estimated Total Cost</p>
                <p className="font-bold text-emerald-800 text-2xl">{Number(totalCost).toLocaleString()} SAR</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">{Array.isArray(d.phases) ? `${(d.phases as Array<unknown>).length} Phases` : ""}</p>
                <p className="text-xs text-gray-500">{d.estimatedDuration ? String(d.estimatedDuration) : ""}</p>
              </div>
            </div>
          </div>
        ) : null}
        {Array.isArray(d.phases) ? (
          <div className="space-y-4">
            {(d.phases as Array<Record<string, unknown>>).map((phase, i) => (
              <div key={i} className="border rounded-lg overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-green-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">{i + 1}</span>
                    <span className="font-bold text-sm text-gray-800">{String(phase.name || phase.title || phase.phase || `Phase ${i + 1}`)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {phase.duration || phase.estimatedDuration ? <Badge variant="outline" className="text-[10px]">{String(phase.duration || phase.estimatedDuration)}</Badge> : null}
                    {phase.priority ? <Badge variant={String(phase.priority) === "high" ? "destructive" : "secondary"} className="text-[10px]">{String(phase.priority)}</Badge> : null}
                  </div>
                </div>
                <div className="p-3">
                  {phase.description ? <p className="text-xs text-gray-600 mb-2 italic">{String(phase.description)}</p> : null}
                  {phase.procedures && Array.isArray(phase.procedures) ? (
                    <ProcedureTable procedures={phase.procedures as Array<Record<string, unknown>>} />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {Array.isArray(d.alternatives) ? (
          <Section title="Alternative Options" icon="🔄" color="blue">
            <div className="space-y-2">
              {(d.alternatives as Array<Record<string, unknown>>).map((alt, i) => (
                <div key={i} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="font-medium text-sm">{String(alt.description || alt.name || "")}</p>
                  {alt.estimatedCost ? <p className="text-xs text-blue-600 mt-1">Cost: {String(alt.estimatedCost)} SAR</p> : null}
                  {alt.pros ? <div className="mt-1"><RenderList items={alt.pros} /></div> : null}
                  {alt.cons ? <div className="mt-1 text-red-600"><RenderList items={alt.cons} /></div> : null}
                </div>
              ))}
            </div>
          </Section>
        ) : null}
        {d.prognosis ? (
          <Section title="Prognosis" icon="📈" color="teal">
            <p className="leading-relaxed">{String(d.prognosis)}</p>
          </Section>
        ) : null}
        {d.diabeticConsiderations || d.medicalConsiderations ? (
          <Section title="Medical Considerations" icon="⚕️" color="red">
            <p className="leading-relaxed">{String(d.diabeticConsiderations || d.medicalConsiderations)}</p>
          </Section>
        ) : null}
      </div>
    );
  }

  // ── Implant Planning ──
  if (module === "implant") {
    return (
      <div className="space-y-4">
        {typeof d.siteAssessment === "object" && d.siteAssessment ? (
          <Section title="Site Assessment" icon="🎯" color="amber">
            {Object.entries(d.siteAssessment as Record<string, unknown>).map(([key, val]) => (
              <KeyValue key={key} label={key.replace(/([A-Z])/g, " $1").trim()} value={val} />
            ))}
          </Section>
        ) : null}
        {typeof d.implantRecommendation === "object" && d.implantRecommendation ? (
          <Section title="Implant Recommendation" icon="🔩" color="blue">
            {Object.entries(d.implantRecommendation as Record<string, unknown>).map(([key, val]) => (
              <KeyValue key={key} label={key.replace(/([A-Z])/g, " $1").trim()} value={val} />
            ))}
          </Section>
        ) : null}
        {typeof d.surgicalApproach === "object" && d.surgicalApproach ? (
          <Section title="Surgical Approach" icon="🏥" color="green">
            {Object.entries(d.surgicalApproach as Record<string, unknown>).map(([key, val]) => (
              typeof val === "object" && Array.isArray(val) 
                ? <div key={key}><p className="text-xs font-medium text-gray-500 mt-1">{key}:</p><RenderList items={val} /></div>
                : <KeyValue key={key} label={key.replace(/([A-Z])/g, " $1").trim()} value={val} />
            ))}
          </Section>
        ) : null}
        {Array.isArray(d.riskFactors) ? (
          <Section title="Risk Factors" icon="⚠️" color="red">
            <RenderList items={d.riskFactors} />
          </Section>
        ) : null}
      </div>
    );
  }

  // ── Orthodontics ──
  if (module === "orthodontics") {
    return (
      <div className="space-y-4">
        {typeof d.classification === "object" && d.classification ? (
          <Section title="Classification" icon="📊" color="teal">
            {Object.entries(d.classification as Record<string, unknown>).map(([key, val]) => (
              <KeyValue key={key} label={key.replace(/([A-Z])/g, " $1").trim()} value={val} />
            ))}
          </Section>
        ) : null}
        {Array.isArray(d.treatmentOptions) ? (
          <Section title="Treatment Options" icon="💡" color="blue">
            <div className="space-y-3">
              {(d.treatmentOptions as Array<Record<string, unknown>>).map((opt, i) => (
                <div key={i} className="p-3 bg-white rounded-lg border shadow-sm">
                  <p className="font-bold text-sm">{String(opt.name || opt.option || `Option ${i + 1}`)}</p>
                  {opt.description ? <p className="text-xs text-gray-600 mt-1">{String(opt.description)}</p> : null}
                  {opt.duration ? <p className="text-xs text-teal-600 mt-1">Duration: {String(opt.duration)}</p> : null}
                </div>
              ))}
            </div>
          </Section>
        ) : null}
        {d.extractionDecision ? (
          <Section title="Extraction Decision" icon="🦷" color="orange">
            <p>{typeof d.extractionDecision === "string" ? d.extractionDecision : JSON.stringify(d.extractionDecision)}</p>
          </Section>
        ) : null}
      </div>
    );
  }

  // ── Periodontal ──
  if (module === "periodontal") {
    return (
      <div className="space-y-4">
        {d.staging ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-xs font-medium text-red-600 uppercase">Stage</p>
              <p className="font-bold text-red-800">{String(d.staging)}</p>
            </div>
            {d.grading ? (
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-xs font-medium text-orange-600 uppercase">Grade</p>
                <p className="font-bold text-orange-800">{String(d.grading)}</p>
              </div>
            ) : null}
          </div>
        ) : null}
        {Array.isArray(d.riskFactors) ? (
          <Section title="Risk Factors" icon="⚠️" color="red">
            <RenderList items={d.riskFactors} />
          </Section>
        ) : null}
        {d.treatmentPlan ? (
          <Section title="Treatment Protocol" icon="📋" color="green">
            {typeof d.treatmentPlan === "object" && !Array.isArray(d.treatmentPlan)
              ? Object.entries(d.treatmentPlan as Record<string, unknown>).map(([key, val]) => (
                  Array.isArray(val) ? <div key={key}><p className="text-xs font-medium text-gray-500 mt-1">{key}:</p><RenderList items={val} /></div>
                  : <KeyValue key={key} label={key} value={val} />
                ))
              : <p>{String(d.treatmentPlan)}</p>
            }
          </Section>
        ) : null}
        {Array.isArray(d.toothPrognosis) ? (
          <Section title="Tooth Prognosis" icon="🦷" color="blue">
            <div className="space-y-2">
              {(d.toothPrognosis as Array<Record<string, unknown>>).map((tp, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="font-medium text-sm">Tooth {String(tp.tooth)}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    String(tp.prognosis).toLowerCase().includes("good") ? "bg-green-100 text-green-800" :
                    String(tp.prognosis).toLowerCase().includes("fair") ? "bg-yellow-100 text-yellow-800" :
                    "bg-red-100 text-red-800"
                  }`}>{String(tp.prognosis)}</span>
                </div>
              ))}
            </div>
          </Section>
        ) : null}
      </div>
    );
  }

  // ── Cost Estimation ──
  if (module === "cost-estimate") {
    return (
      <div className="space-y-4">
        {Array.isArray(d.procedures) ? (
          <Section title="Cost Breakdown" icon="💰" color="emerald">
            <div className="space-y-2">
              {(d.procedures as Array<Record<string, unknown>>).map((proc, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">{String(proc.procedure || proc.name || "")}</p>
                    {proc.tooth ? <p className="text-xs text-gray-500">Tooth {String(proc.tooth)}</p> : null}
                    {proc.cdtCode ? <p className="text-xs text-blue-600">CDT: {String(proc.cdtCode)}</p> : null}
                  </div>
                  <span className="font-bold text-emerald-700">{String(proc.cost || proc.estimatedCost || "")} SAR</span>
                </div>
              ))}
            </div>
          </Section>
        ) : null}
        {d.totalCost ? (
          <div className="p-4 bg-emerald-50 rounded-lg border-2 border-emerald-300 text-center">
            <p className="text-xs font-medium text-emerald-600 uppercase">Total Estimated Cost</p>
            <p className="font-bold text-emerald-800 text-2xl mt-1">{String(d.totalCost)} SAR</p>
          </div>
        ) : null}
      </div>
    );
  }

  // ── Material Recommendation ──
  if (module === "material") {
    return (
      <div className="space-y-4">
        {typeof d.primaryRecommendation === "object" && d.primaryRecommendation ? (
          <Section title="Primary Recommendation" icon="⭐" color="indigo">
            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              {Object.entries(d.primaryRecommendation as Record<string, unknown>).map(([key, val]) => (
                Array.isArray(val) ? <div key={key}><p className="text-xs font-medium mt-1">{key}:</p><RenderList items={val} /></div>
                : <KeyValue key={key} label={key.replace(/([A-Z])/g, " $1").trim()} value={val} />
              ))}
            </div>
          </Section>
        ) : null}
        {Array.isArray(d.alternatives) ? (
          <Section title="Alternative Materials" icon="🔄" color="blue">
            <div className="space-y-2">
              {(d.alternatives as Array<Record<string, unknown>>).map((alt, i) => (
                <div key={i} className="p-3 bg-white rounded-lg border">
                  <p className="font-medium text-sm">{String(alt.material || alt.name || `Alternative ${i + 1}`)}</p>
                  {alt.indication ? <p className="text-xs text-gray-600 mt-1">{String(alt.indication)}</p> : null}
                </div>
              ))}
            </div>
          </Section>
        ) : null}
      </div>
    );
  }

  // ── Dental AI Query ──
  if (module === "dental-ai") {
    return (
      <div className="space-y-4">
        {d.answer ? (
          <Section title="Clinical Response" icon="🤖" color="fuchsia">
            <p className="leading-relaxed whitespace-pre-wrap">{String(d.answer)}</p>
          </Section>
        ) : null}
        {d.answer_ar ? (
          <Section title="الإجابة بالعربية" icon="🌍" color="green">
            <p className="leading-relaxed whitespace-pre-wrap" dir="rtl">{String(d.answer_ar)}</p>
          </Section>
        ) : null}
        {Array.isArray(d.references) ? (
          <Section title="References" icon="📚" color="blue">
            <RenderList items={d.references} />
          </Section>
        ) : null}
        {Array.isArray(d.materials) ? (
          <Section title="Materials Comparison" icon="🔬" color="purple">
            <div className="space-y-3">
              {(d.materials as Array<Record<string, unknown>>).map((mat, i) => (
                <div key={i} className="p-3 bg-white rounded-lg border">
                  <p className="font-bold text-sm">{String(mat.material || mat.name || "")}</p>
                  {mat.success_rate ? <p className="text-xs text-green-600 mt-1">Success Rate: {String(mat.success_rate)}</p> : null}
                  {mat.advantages && Array.isArray(mat.advantages) ? (
                    <div className="mt-1"><p className="text-xs font-medium text-gray-500">Advantages:</p><RenderList items={mat.advantages} /></div>
                  ) : null}
                </div>
              ))}
            </div>
          </Section>
        ) : null}
      </div>
    );
  }

  // ── TMJ Assessment ──
  if (module === "tmj") {
    return (
      <div className="space-y-4">
        {d.diagnosis ? (
          <div className="p-3 bg-violet-50 rounded-lg border border-violet-200">
            <p className="text-xs font-medium text-violet-600 uppercase">Diagnosis</p>
            <p className="font-bold text-violet-800">{typeof d.diagnosis === "string" ? d.diagnosis : JSON.stringify(d.diagnosis)}</p>
          </div>
        ) : null}
        {d.treatmentPlan ? (
          <Section title="Treatment Plan" icon="📋" color="violet">
            {typeof d.treatmentPlan === "object" && !Array.isArray(d.treatmentPlan)
              ? Object.entries(d.treatmentPlan as Record<string, unknown>).map(([key, val]) => (
                  Array.isArray(val) ? <div key={key}><p className="text-xs font-medium text-gray-500 mt-1">{key}:</p><RenderList items={val} /></div>
                  : <KeyValue key={key} label={key} value={val} />
                ))
              : Array.isArray(d.treatmentPlan) ? <RenderList items={d.treatmentPlan} />
              : <p>{String(d.treatmentPlan)}</p>
            }
          </Section>
        ) : null}
      </div>
    );
  }

  // ── Prosthodontics ──
  if (module === "prosthodontics") {
    return (
      <div className="space-y-4">
        {d.classification ? (
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-xs font-medium text-yellow-600 uppercase">Classification</p>
            <p className="font-bold text-yellow-800">{String(d.classification)}</p>
          </div>
        ) : null}
        {Array.isArray(d.designOptions) ? (
          <Section title="Design Options" icon="👑" color="yellow">
            <div className="space-y-3">
              {(d.designOptions as Array<Record<string, unknown>>).map((opt, i) => (
                <div key={i} className="p-3 bg-white rounded-lg border">
                  <p className="font-bold text-sm">{String(opt.name || opt.type || `Option ${i + 1}`)}</p>
                  {opt.description ? <p className="text-xs text-gray-600 mt-1">{String(opt.description)}</p> : null}
                  {opt.pros ? <div className="mt-1"><RenderList items={opt.pros} /></div> : null}
                </div>
              ))}
            </div>
          </Section>
        ) : null}
      </div>
    );
  }

  // ── Pediatric ──
  if (module === "pediatric") {
    return (
      <div className="space-y-4">
        {d.cariesRisk ? (
          <div className={`p-3 rounded-lg border ${
            String(d.cariesRisk).toLowerCase().includes("high") ? "bg-red-50 border-red-200" :
            String(d.cariesRisk).toLowerCase().includes("moderate") ? "bg-yellow-50 border-yellow-200" :
            "bg-green-50 border-green-200"
          }`}>
            <p className="text-xs font-medium uppercase">Caries Risk (CAMBRA)</p>
            <p className="font-bold">{String(d.cariesRisk)}</p>
          </div>
        ) : null}
        {d.behaviorManagement ? (
          <Section title="Behavior Management" icon="👶" color="sky">
            {typeof d.behaviorManagement === "string" ? <p>{d.behaviorManagement}</p> : <RenderList items={Array.isArray(d.behaviorManagement) ? d.behaviorManagement : [d.behaviorManagement]} />}
          </Section>
        ) : null}
        {d.treatmentPlan ? (
          <Section title="Treatment Plan" icon="📋" color="green">
            {typeof d.treatmentPlan === "object" && !Array.isArray(d.treatmentPlan)
              ? Object.entries(d.treatmentPlan as Record<string, unknown>).map(([key, val]) => (
                  Array.isArray(val) ? <div key={key}><p className="text-xs font-medium text-gray-500 mt-1">{key}:</p><RenderList items={val} /></div>
                  : <KeyValue key={key} label={key} value={val} />
                ))
              : Array.isArray(d.treatmentPlan) ? <RenderList items={d.treatmentPlan} />
              : <p>{String(d.treatmentPlan)}</p>
            }
          </Section>
        ) : null}
      </div>
    );
  }

  // ── Oral Surgery ──
  if (module === "oral-surgery") {
    return (
      <div className="space-y-4">
        {d.difficultyScore ? (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-medium text-slate-600 uppercase">Difficulty Score</p>
            <p className="font-bold text-slate-800">{String(d.difficultyScore)}</p>
          </div>
        ) : null}
        {Array.isArray(d.surgicalSteps) ? (
          <Section title="Surgical Steps" icon="🏥" color="slate">
            <ol className="space-y-2 ml-1">
              {(d.surgicalSteps as string[]).map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="bg-slate-200 text-slate-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                  <span className="text-sm">{step}</span>
                </li>
              ))}
            </ol>
          </Section>
        ) : null}
        {d.postOpProtocol ? (
          <Section title="Post-Op Protocol" icon="💊" color="green">
            {typeof d.postOpProtocol === "object" && !Array.isArray(d.postOpProtocol)
              ? Object.entries(d.postOpProtocol as Record<string, unknown>).map(([key, val]) => (
                  Array.isArray(val) ? <div key={key}><p className="text-xs font-medium text-gray-500 mt-1">{key}:</p><RenderList items={val} /></div>
                  : <KeyValue key={key} label={key} value={val} />
                ))
              : Array.isArray(d.postOpProtocol) ? <RenderList items={d.postOpProtocol} />
              : <p>{String(d.postOpProtocol)}</p>
            }
          </Section>
        ) : null}
      </div>
    );
  }

  // ── Radiograph Analysis ──
  if (module === "radiograph-ai") {
    return (
      <div className="space-y-4">
        {d.findings ? (
          <Section title="Findings" icon="📷" color="purple">
            {Array.isArray(d.findings) ? <RenderList items={d.findings} /> : <p className="leading-relaxed">{String(d.findings)}</p>}
          </Section>
        ) : null}
        {d.differentialDiagnosis ? (
          <Section title="Differential Diagnosis" icon="🔍" color="indigo">
            {Array.isArray(d.differentialDiagnosis) ? <RenderList items={d.differentialDiagnosis} /> : <p>{String(d.differentialDiagnosis)}</p>}
          </Section>
        ) : null}
        {d.recommendations ? (
          <Section title="Recommendations" icon="💡" color="green">
            {Array.isArray(d.recommendations) ? <RenderList items={d.recommendations} /> : <p>{String(d.recommendations)}</p>}
          </Section>
        ) : null}
      </div>
    );
  }

  // ── Generic Fallback — Structured display of any JSON ──
  return (
    <div className="space-y-3">
      {Object.entries(d).map(([key, val]) => {
        if (key === "patientId" || key === "timestamp") return null;
        if (Array.isArray(val)) {
          return (
            <Section key={key} title={key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()} icon="📌" color="blue">
              {val.every(v => typeof v === "string") ? <RenderList items={val} /> : (
                <div className="space-y-2">
                  {val.map((item, i) => (
                    <div key={i} className="p-2 bg-white rounded border text-xs">
                      {typeof item === "object" ? Object.entries(item as Record<string, unknown>).map(([k, v]) => (
                        <KeyValue key={k} label={k} value={v} />
                      )) : <p>{String(item)}</p>}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          );
        }
        if (typeof val === "object" && val !== null) {
          return (
            <Section key={key} title={key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()} icon="📌" color="blue">
              {Object.entries(val as Record<string, unknown>).map(([k, v]) => (
                Array.isArray(v) ? <div key={k}><p className="text-xs font-medium text-gray-500">{k}:</p><RenderList items={v} /></div>
                : <KeyValue key={k} label={k} value={v} />
              ))}
            </Section>
          );
        }
        return <KeyValue key={key} label={key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()} value={val} />;
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function MediDentPage() {
  const [activeModule, setActiveModule] = React.useState<ActiveModule>(null);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<unknown>(null);
  const [loadingMessage, setLoadingMessage] = React.useState("Analyzing...");

  // Dental Chart State
  const [toothConditions, setToothConditions] = React.useState<Record<string, string>>({});
  const [selectedCondition, setSelectedCondition] = React.useState<string>("caries");
  const [chartHistory, setChartHistory] = React.useState<Array<Record<string, string>>>([]);

  // AI Query State
  const [aiQuery, setAiQuery] = React.useState("");
  const [aiMode, setAiMode] = React.useState("clinical-decision");

  // Emergency State
  const [emergencySymptoms, setEmergencySymptoms] = React.useState("");
  const [painLevel, setPainLevel] = React.useState("5");

  // Implant State
  const [implantSite, setImplantSite] = React.useState("");
  const [implantHistory, setImplantHistory] = React.useState("");

  // Orthodontic State
  const [orthoComplaint, setOrthoComplaint] = React.useState("");
  const [orthoAge, setOrthoAge] = React.useState("");
  const [overjet, setOverjet] = React.useState("");
  const [overbite, setOverbite] = React.useState("");

  // Endodontic State
  const [endoTooth, setEndoTooth] = React.useState("");
  const [endoComplaint, setEndoComplaint] = React.useState("");
  const [coldTest, setColdTest] = React.useState("lingering");

  // Treatment Plan State
  const [tpComplaint, setTpComplaint] = React.useState("");
  const [tpAge, setTpAge] = React.useState("");

  // Periodontal State
  const [perioTeeth, setPerioTeeth] = React.useState("");
  const [perioSmoking, setPerioSmoking] = React.useState("never");

  // Prosthodontic State
  const [prosthType, setProsthType] = React.useState("fixed");
  const [prosthMissing, setProsthMissing] = React.useState("");

  // Pediatric State
  const [pedAge, setPedAge] = React.useState("");
  const [pedComplaint, setPedComplaint] = React.useState("");

  // Oral Surgery State
  const [surgProcedure, setSurgProcedure] = React.useState("");
  const [surgTooth, setSurgTooth] = React.useState("");

  // TMJ State
  const [tmjComplaint, setTmjComplaint] = React.useState("");
  const [tmjOpening, setTmjOpening] = React.useState("");

  // Radiograph State
  const [radioType, setRadioType] = React.useState("panoramic");
  const [radioFindings, setRadioFindings] = React.useState("");

  // Cost Estimation State
  const [costProcedures, setCostProcedures] = React.useState("");

  // Material State
  const [matProcedure, setMatProcedure] = React.useState("");
  const [matTooth, setMatTooth] = React.useState("");

  // ── Loading Messages ──
  const loadingMessages = [
    "MediDent AI is analyzing...",
    "Processing clinical data...",
    "Consulting evidence database...",
    "Generating clinical report...",
  ];

  // ── API Call Helper ──
  const callAPI = async (action: string, data: Record<string, unknown>) => {
    setLoading(true);
    setResult(null);
    let msgIndex = 0;
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % loadingMessages.length;
      setLoadingMessage(loadingMessages[msgIndex]);
    }, 3000);
    try {
      const res = await fetch("/api/medident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "API call failed");
      setResult(json.data);
      toast.success("Analysis complete!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  // ── Tooth Click Handler ──
  const handleToothClick = (tooth: string) => {
    setChartHistory((prev) => [...prev, { ...toothConditions }]);
    setToothConditions((prev) => ({ ...prev, [tooth]: selectedCondition }));
  };

  const clearChart = () => {
    setChartHistory((prev) => [...prev, { ...toothConditions }]);
    setToothConditions({});
    toast.success("Chart cleared");
  };

  const undoChart = () => {
    if (chartHistory.length > 0) {
      const prev = chartHistory[chartHistory.length - 1];
      setToothConditions(prev);
      setChartHistory((h) => h.slice(0, -1));
      toast.success("Undo successful");
    }
  };

  const getToothColor = (tooth: string) => {
    const condition = toothConditions[tooth];
    const found = TOOTH_CONDITIONS.find((c) => c.value === condition);
    return found?.color || "bg-white border-gray-300 hover:border-blue-400";
  };

  // ── Render Module Content ──
  const renderModuleContent = () => {
    switch (activeModule) {
      // ════════════════════════════════════════════════════════════════════════
      // DENTAL CHART
      // ════════════════════════════════════════════════════════════════════════
      case "dental-chart":
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="text-xl">🦷</span>
                  Interactive Dental Chart (FDI Notation)
                </CardTitle>
                <CardDescription className="text-xs">
                  Select a condition below, then click teeth to apply. Use AI to analyze the full chart.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Condition Selector */}
                <div className="flex flex-wrap gap-2">
                  {TOOTH_CONDITIONS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setSelectedCondition(c.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${c.color} ${
                        selectedCondition === c.value ? "ring-2 ring-offset-2 ring-blue-500 scale-105" : ""
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* Upper Arch */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground text-center">Upper Arch (Maxilla)</p>
                  <div className="flex justify-center gap-0.5">
                    {UPPER_TEETH.map((tooth) => (
                      <button
                        key={tooth}
                        onClick={() => handleToothClick(tooth)}
                        className={`w-9 h-11 rounded-lg border-2 flex flex-col items-center justify-center text-xs font-bold transition-all hover:scale-110 ${getToothColor(tooth)}`}
                      >
                        <span className="text-[10px]">{tooth}</span>
                        {toothConditions[tooth] ? (
                          <span className="text-[7px] mt-0.5">
                            {TOOTH_CONDITIONS.find((c) => c.value === toothConditions[tooth])?.label?.slice(0, 3)}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t-2 border-dashed border-gray-300 mx-4" />

                {/* Lower Arch */}
                <div className="space-y-1">
                  <div className="flex justify-center gap-0.5">
                    {LOWER_TEETH.map((tooth) => (
                      <button
                        key={tooth}
                        onClick={() => handleToothClick(tooth)}
                        className={`w-9 h-11 rounded-lg border-2 flex flex-col items-center justify-center text-xs font-bold transition-all hover:scale-110 ${getToothColor(tooth)}`}
                      >
                        <span className="text-[10px]">{tooth}</span>
                        {toothConditions[tooth] ? (
                          <span className="text-[7px] mt-0.5">
                            {TOOTH_CONDITIONS.find((c) => c.value === toothConditions[tooth])?.label?.slice(0, 3)}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs font-medium text-muted-foreground text-center">Lower Arch (Mandible)</p>
                </div>

                {/* Chart Summary & Actions */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex gap-3 text-xs">
                    {Object.entries(
                      Object.values(toothConditions).reduce((acc, c) => {
                        if (c !== "healthy") acc[c] = (acc[c] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([cond, count]) => (
                      <span key={cond} className={`px-2 py-0.5 rounded ${TOOTH_CONDITIONS.find((c) => c.value === cond)?.color || ""}`}>
                        {count} {TOOTH_CONDITIONS.find((c) => c.value === cond)?.label}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={undoChart} disabled={chartHistory.length === 0} title="Undo">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearChart} title="Clear Chart">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    const teeth = Object.entries(toothConditions)
                      .filter(([, c]) => c !== "healthy")
                      .map(([id, condition]) => ({ number: parseInt(id), condition, surfaces: [] }));
                    if (teeth.length === 0) {
                      toast.error("Please mark at least one tooth condition first");
                      return;
                    }
                    callAPI("analyze-chart", { patientId: "current", teeth });
                  }}
                  disabled={loading || Object.keys(toothConditions).filter((k) => toothConditions[k] !== "healthy").length === 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Analyze Chart with AI
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      // ════════════════════════════════════════════════════════════════════════
      // RADIOGRAPH ANALYSIS
      // ════════════════════════════════════════════════════════════════════════
      case "radiograph-ai":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Scan className="h-5 w-5" />
                AI Radiograph Analysis
              </CardTitle>
              <CardDescription className="text-xs">
                Describe radiographic findings for AI interpretation and diagnosis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Radiograph Type</label>
                <Select value={radioType} onValueChange={setRadioType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="periapical">Periapical</SelectItem>
                    <SelectItem value="bitewing">Bitewing</SelectItem>
                    <SelectItem value="panoramic">Panoramic (OPG)</SelectItem>
                    <SelectItem value="cbct">CBCT</SelectItem>
                    <SelectItem value="cephalometric">Cephalometric</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Describe radiographic findings (e.g., 'radiolucency at apex of 46, horizontal bone loss in posterior mandible, impacted 48')"
                value={radioFindings}
                onChange={(e) => setRadioFindings(e.target.value)}
                rows={4}
              />
              <Button
                onClick={() => callAPI("analyze-radiograph", {
                  patientId: "current",
                  imageType: radioType,
                  findings: radioFindings,
                })}
                disabled={loading || !radioFindings.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Analyze Radiograph
              </Button>
            </CardContent>
          </Card>
        );

      // ════════════════════════════════════════════════════════════════════════
      // PERIODONTAL
      // ════════════════════════════════════════════════════════════════════════
      case "periodontal":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5" />
                Periodontal Charting & AI Analysis
              </CardTitle>
              <CardDescription className="text-xs">
                Enter probing depths and clinical findings for AAP/EFP staging.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter teeth with probing depths, e.g.:&#10;16: B[3,4,5] L[2,3,4] BOP+ Recession:1mm Mobility:0&#10;36: B[5,6,7] L[4,5,6] BOP+ Recession:3mm Mobility:2"
                value={perioTeeth}
                onChange={(e) => setPerioTeeth(e.target.value)}
                rows={5}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Smoking Status</label>
                  <Select value={perioSmoking} onValueChange={setPerioSmoking}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never Smoker</SelectItem>
                      <SelectItem value="former">Former Smoker</SelectItem>
                      <SelectItem value="current">Current Smoker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Diabetes Status</label>
                  <Select defaultValue="none">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Diabetes</SelectItem>
                      <SelectItem value="type2-controlled">Type 2 (Controlled)</SelectItem>
                      <SelectItem value="type2-uncontrolled">Type 2 (Uncontrolled)</SelectItem>
                      <SelectItem value="type1">Type 1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={() => {
                  // Parse the text input into teeth array
                  const teeth = perioTeeth.split("\n").filter(Boolean).map((line) => {
                    const match = line.match(/^(\d+)/);
                    return { toothNumber: match ? parseInt(match[1]) : 0, rawData: line };
                  });
                  callAPI("analyze-perio", {
                    patientId: "current",
                    teeth: teeth,
                    smokingStatus: perioSmoking,
                  });
                }}
                disabled={loading || !perioTeeth.trim()}
                className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Analyze Periodontal Status
              </Button>
            </CardContent>
          </Card>
        );

      // ════════════════════════════════════════════════════════════════════════
      // EMERGENCY TRIAGE
      // ════════════════════════════════════════════════════════════════════════
      case "emergency":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Emergency Triage
              </CardTitle>
              <CardDescription className="text-xs">
                Medical Intelligence emergency assessment. Determines urgency and immediate actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Describe symptoms (e.g., 'severe throbbing pain in lower right molar, swelling, fever since yesterday')"
                value={emergencySymptoms}
                onChange={(e) => setEmergencySymptoms(e.target.value)}
                rows={3}
              />
              <div className="flex gap-4 items-center">
                <label className="text-sm font-medium">Pain Level (0-10):</label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={painLevel}
                  onChange={(e) => setPainLevel(e.target.value)}
                  className="w-20"
                />
                <div className="flex-1 h-3 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 relative">
                  <div
                    className="absolute top-0 w-4 h-4 -mt-0.5 rounded-full bg-white border-2 border-gray-800 shadow"
                    style={{ left: `${(parseInt(painLevel) / 10) * 100}%`, transform: "translateX(-50%)" }}
                  />
                </div>
              </div>
              <Button
                onClick={() => callAPI("triage-emergency", {
                  patientId: "current",
                  symptoms: emergencySymptoms,
                  painLevel: parseInt(painLevel),
                })}
                disabled={loading || !emergencySymptoms.trim()}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                Triage Emergency
              </Button>
            </CardContent>
          </Card>
        );

      // ════════════════════════════════════════════════════════════════════════
      // IMPLANT PLANNING
      // ════════════════════════════════════════════════════════════════════════
      case "implant":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-5 w-5" />
                AI Implant Planning
              </CardTitle>
              <CardDescription className="text-xs">
                Comprehensive implant planning with bone assessment, system selection, and surgical approach.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Implant Site (FDI)</label>
                  <Select value={implantSite} onValueChange={setImplantSite}>
                    <SelectTrigger><SelectValue placeholder="Select tooth" /></SelectTrigger>
                    <SelectContent>
                      {[...UPPER_TEETH, ...LOWER_TEETH].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Smoking Status</label>
                  <Select defaultValue="never">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="former">Former</SelectItem>
                      <SelectItem value="current">Current</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Textarea
                placeholder="Medical history and relevant conditions (e.g., diabetes, bisphosphonates, bruxism, bone quality from CBCT...)"
                value={implantHistory}
                onChange={(e) => setImplantHistory(e.target.value)}
                rows={3}
              />
              <Button
                onClick={() => callAPI("plan-implant", {
                  patientId: "current",
                  site: implantSite,
                  medicalHistory: implantHistory,
                })}
                disabled={loading || !implantSite}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate Implant Plan
              </Button>
            </CardContent>
          </Card>
        );

      // ════════════════════════════════════════════════════════════════════════
      // ORTHODONTICS
      // ════════════════════════════════════════════════════════════════════════
      case "orthodontics":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="text-xl">😁</span>
                Orthodontic Analysis AI
              </CardTitle>
              <CardDescription className="text-xs">
                Cephalometric analysis, skeletal classification, and treatment option comparison.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Patient Age</label>
                  <Input type="number" placeholder="e.g., 14" value={orthoAge} onChange={(e) => setOrthoAge(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Chief Complaint</label>
                  <Input placeholder="e.g., crowding, spacing" value={orthoComplaint} onChange={(e) => setOrthoComplaint(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Overjet (mm)</label>
                  <Input type="number" step="0.5" placeholder="e.g., 5" value={overjet} onChange={(e) => setOverjet(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Overbite (mm)</label>
                  <Input type="number" step="0.5" placeholder="e.g., 4" value={overbite} onChange={(e) => setOverbite(e.target.value)} />
                </div>
              </div>
              <Button
                onClick={() => callAPI("analyze-orthodontics", {
                  patientId: "current",
                  age: parseInt(orthoAge) || 14,
                  chiefComplaint: orthoComplaint || "crowding",
                  overjet: parseFloat(overjet) || 3,
                  overbite: parseFloat(overbite) || 3,
                })}
                disabled={loading || !orthoComplaint}
                className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Analyze Orthodontics
              </Button>
            </CardContent>
          </Card>
        );

      // ════════════════════════════════════════════════════════════════════════
      // ENDODONTICS
      // ════════════════════════════════════════════════════════════════════════
      case "endodontics":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Microscope className="h-5 w-5" />
                Endodontic Assessment AI
              </CardTitle>
              <CardDescription className="text-xs">
                Pulp and periapical diagnosis, canal morphology analysis, treatment protocol.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Tooth (FDI)</label>
                  <Select value={endoTooth} onValueChange={setEndoTooth}>
                    <SelectTrigger><SelectValue placeholder="Select tooth" /></SelectTrigger>
                    <SelectContent>
                      {[...UPPER_TEETH, ...LOWER_TEETH].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Cold Test</label>
                  <Select value={coldTest} onValueChange={setColdTest}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="exaggerated">Exaggerated</SelectItem>
                      <SelectItem value="lingering">Lingering (&gt;30s)</SelectItem>
                      <SelectItem value="no_response">No Response</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Textarea
                placeholder="Chief complaint (e.g., 'spontaneous throbbing pain, worse at night, pain to hot')"
                value={endoComplaint}
                onChange={(e) => setEndoComplaint(e.target.value)}
                rows={3}
              />
              <Button
                onClick={() => callAPI("assess-endodontic", {
                  patientId: "current",
                  toothId: endoTooth,
                  chiefComplaint: endoComplaint,
                  tests: { coldTest, percussion: "positive" },
                })}
                disabled={loading || !endoTooth || !endoComplaint}
                className="w-full bg-gradient-to-r from-rose-600 to-red-600 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Assess Endodontic Case
              </Button>
            </CardContent>
          </Card>
        );

      // ════════════════════════════════════════════════════════════════════════
      // TREATMENT PLANNING
      // ════════════════════════════════════════════════════════════════════════
      case "treatment-planning":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-5 w-5" />
                AI Treatment Planning
              </CardTitle>
              <CardDescription className="text-xs">
                Generate comprehensive phased treatment plans with cost estimation and alternatives.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Patient Age</label>
                  <Input type="number" placeholder="e.g., 35" value={tpAge} onChange={(e) => setTpAge(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Budget Preference</label>
                  <Select defaultValue="standard">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="economy">Economy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Textarea
                placeholder="Chief complaint and dental concerns (e.g., 'multiple broken teeth, difficulty eating, wants to restore smile')"
                value={tpComplaint}
                onChange={(e) => setTpComplaint(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Tip: Chart teeth in the Dental Chart module first for more accurate planning.
              </p>
              <Button
                onClick={() => {
                  const teeth = Object.entries(toothConditions)
                    .filter(([, c]) => c !== "healthy")
                    .map(([id, condition]) => ({ toothId: id, condition, surfaces: [] }));
                  callAPI("generate-treatment-plan", {
                    patientId: "current",
                    age: parseInt(tpAge) || 35,
                    chiefComplaint: tpComplaint,
                    dentalChart: teeth.length > 0 ? teeth : [{ toothId: "36", condition: "caries", surfaces: [] }],
                    budget: "standard",
                  });
                }}
                disabled={loading || !tpComplaint}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate Treatment Plan
              </Button>
            </CardContent>
          </Card>
        );

      // ════════════════════════════════════════════════════════════════════════
      // PROSTHODONTICS
      // ════════════════════════════════════════════════════════════════════════
      case "prosthodontics":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Crown className="h-5 w-5" />
                Prosthodontic Planning AI
              </CardTitle>
              <CardDescription className="text-xs">
                Kennedy classification, material selection, and prosthetic design options.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Prosthesis Type</label>
                  <Select value={prosthType} onValueChange={setProsthType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed (Bridge/Crown)</SelectItem>
                      <SelectItem value="removable">Removable (RPD)</SelectItem>
                      <SelectItem value="complete">Complete Denture</SelectItem>
                      <SelectItem value="implant-supported">Implant-Supported</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Missing Teeth (FDI, comma-separated)</label>
                  <Input placeholder="e.g., 14, 15, 46" value={prosthMissing} onChange={(e) => setProsthMissing(e.target.value)} />
                </div>
              </div>
              <Button
                onClick={() => callAPI("plan-prosthodontics", {
                  patientId: "current",
                  type: prosthType,
                  missingTeeth: prosthMissing.split(",").map((t) => parseInt(t.trim())).filter(Boolean),
                })}
                disabled={loading || !prosthMissing.trim()}
                className="w-full bg-gradient-to-r from-yellow-600 to-amber-600 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Plan Prosthodontics
              </Button>
            </CardContent>
          </Card>
        );

      // ════════════════════════════════════════════════════════════════════════
      // PEDIATRIC
      // ════════════════════════════════════════════════════════════════════════
      case "pediatric":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5" />
                Pediatric Dentistry AI
              </CardTitle>
              <CardDescription className="text-xs">
                CAMBRA risk assessment, behavior management, and treatment planning for children.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Child Age (months)</label>
                  <Input type="number" placeholder="e.g., 72 (6 years)" value={pedAge} onChange={(e) => setPedAge(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Dentition Stage</label>
                  <Select defaultValue="mixed">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                      <SelectItem value="permanent">Permanent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Textarea
                placeholder="Chief complaint and findings (e.g., 'pain in lower right, deep caries on 85 with pulp exposure, first dental visit')"
                value={pedComplaint}
                onChange={(e) => setPedComplaint(e.target.value)}
                rows={3}
              />
              <Button
                onClick={() => callAPI("assess-pediatric", {
                  patientId: "current",
                  ageMonths: parseInt(pedAge) || 72,
                  dentitionStage: "mixed",
                  chiefComplaint: pedComplaint,
                })}
                disabled={loading || !pedComplaint}
                className="w-full bg-gradient-to-r from-sky-600 to-blue-600 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Assess Pediatric Case
              </Button>
            </CardContent>
          </Card>
        );

      // ════════════════════════════════════════════════════════════════════════
      // ORAL SURGERY
      // ════════════════════════════════════════════════════════════════════════
      case "oral-surgery":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Swords className="h-5 w-5" />
                Oral Surgery Planning AI
              </CardTitle>
              <CardDescription className="text-xs">
                Difficulty scoring, surgical planning, anesthesia, and post-op protocols.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Procedure</label>
                  <Select value={surgProcedure} onValueChange={setSurgProcedure}>
                    <SelectTrigger><SelectValue placeholder="Select procedure" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="surgical_extraction">Surgical Extraction</SelectItem>
                      <SelectItem value="impacted_third_molar">Impacted Third Molar</SelectItem>
                      <SelectItem value="apicoectomy">Apicoectomy</SelectItem>
                      <SelectItem value="biopsy">Biopsy</SelectItem>
                      <SelectItem value="cyst_enucleation">Cyst Enucleation</SelectItem>
                      <SelectItem value="frenectomy">Frenectomy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Tooth (FDI)</label>
                  <Select value={surgTooth} onValueChange={setSurgTooth}>
                    <SelectTrigger><SelectValue placeholder="Select tooth" /></SelectTrigger>
                    <SelectContent>
                      {[...UPPER_TEETH, ...LOWER_TEETH].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={() => callAPI("plan-oral-surgery", {
                  patientId: "current",
                  procedure: surgProcedure,
                  tooth: surgTooth,
                })}
                disabled={loading || !surgProcedure}
                className="w-full bg-gradient-to-r from-slate-600 to-gray-700 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Plan Surgery
              </Button>
            </CardContent>
          </Card>
        );

      // ════════════════════════════════════════════════════════════════════════
      // TMJ ASSESSMENT
      // ════════════════════════════════════════════════════════════════════════
      case "tmj":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="text-xl">🦴</span>
                TMJ Assessment AI
              </CardTitle>
              <CardDescription className="text-xs">
                DC/TMD criteria, pain assessment, ROM analysis, and treatment planning.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Chief complaint (e.g., 'clicking on opening, pain on right side, limited opening for 6 months, bruxism history')"
                value={tmjComplaint}
                onChange={(e) => setTmjComplaint(e.target.value)}
                rows={3}
              />
              <div>
                <label className="text-sm font-medium">Maximum Opening (mm)</label>
                <Input type="number" placeholder="e.g., 28" value={tmjOpening} onChange={(e) => setTmjOpening(e.target.value)} />
              </div>
              <Button
                onClick={() => callAPI("assess-tmj", {
                  patientId: "current",
                  chiefComplaint: tmjComplaint,
                  maxOpening: parseInt(tmjOpening) || 30,
                })}
                disabled={loading || !tmjComplaint}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Assess TMJ
              </Button>
            </CardContent>
          </Card>
        );

      // ════════════════════════════════════════════════════════════════════════
      // DENTAL AI ASSISTANT
      // ════════════════════════════════════════════════════════════════════════
      case "dental-ai":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="h-5 w-5" />
                Dental AI Assistant
              </CardTitle>
              <CardDescription className="text-xs">
                Ask any dental clinical question. Get evidence-based answers with references.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Query Mode</label>
                <Select value={aiMode} onValueChange={setAiMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinical-decision">Clinical Decision Support</SelectItem>
                    <SelectItem value="patient-education">Patient Education</SelectItem>
                    <SelectItem value="differential-diagnosis">Differential Diagnosis</SelectItem>
                    <SelectItem value="evidence-search">Evidence Search</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Ask any dental question (e.g., 'What is the latest evidence on bioactive materials for direct pulp capping?')"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                rows={4}
              />
              <Button
                onClick={() => callAPI("dental-ai-query", { query: aiQuery, mode: aiMode })}
                disabled={loading || !aiQuery.trim()}
                className="w-full bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
                Ask Dental AI
              </Button>
            </CardContent>
          </Card>
        );

      // ════════════════════════════════════════════════════════════════════════
      // COST ESTIMATION
      // ════════════════════════════════════════════════════════════════════════
      case "cost-estimate":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5" />
                Cost Estimation
              </CardTitle>
              <CardDescription className="text-xs">
                Saudi market dental procedure cost estimates with CDT codes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="List procedures (one per line), e.g.:&#10;Composite restoration tooth 16 (2 surfaces)&#10;Root canal treatment tooth 36 (molar)&#10;Dental implant tooth 46 (single with crown)&#10;Surgical extraction tooth 48"
                value={costProcedures}
                onChange={(e) => setCostProcedures(e.target.value)}
                rows={5}
              />
              <Button
                onClick={() => {
                  const procedures = costProcedures.split("\n").filter(Boolean).map((p) => ({ description: p.trim() }));
                  callAPI("estimate-costs", { procedures, region: "saudi_arabia" });
                }}
                disabled={loading || !costProcedures.trim()}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TrendingUp className="h-4 w-4 mr-2" />}
                Estimate Costs
              </Button>
            </CardContent>
          </Card>
        );

      // ════════════════════════════════════════════════════════════════════════
      // MATERIAL RECOMMENDATION
      // ════════════════════════════════════════════════════════════════════════
      case "material":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5" />
                Material Recommendation AI
              </CardTitle>
              <CardDescription className="text-xs">
                Evidence-based dental material selection for any procedure.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Procedure</label>
                  <Select value={matProcedure} onValueChange={setMatProcedure}>
                    <SelectTrigger><SelectValue placeholder="Select procedure" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct posterior restoration">Direct Posterior Restoration</SelectItem>
                      <SelectItem value="direct anterior restoration">Direct Anterior Restoration</SelectItem>
                      <SelectItem value="indirect restoration">Indirect Restoration (Crown)</SelectItem>
                      <SelectItem value="pulp capping">Pulp Capping</SelectItem>
                      <SelectItem value="core buildup">Core Buildup</SelectItem>
                      <SelectItem value="cementation">Cementation</SelectItem>
                      <SelectItem value="bonding">Bonding Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Tooth (FDI)</label>
                  <Select value={matTooth} onValueChange={setMatTooth}>
                    <SelectTrigger><SelectValue placeholder="Select tooth" /></SelectTrigger>
                    <SelectContent>
                      {[...UPPER_TEETH, ...LOWER_TEETH].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={() => callAPI("recommend-material", {
                  procedure: matProcedure,
                  tooth: parseInt(matTooth) || 36,
                })}
                disabled={loading || !matProcedure || !matTooth}
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Recommend Material
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeModule ? (
            <Button variant="ghost" size="icon" onClick={() => { setActiveModule(null); setResult(null); }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : null}
          <div className="flex items-center gap-3">
            <Image src="/medident-logo.png" alt="MediDent" width={180} height={28} className="h-7 w-auto" priority />
            <p className="text-sm text-muted-foreground hidden sm:block">
              World&apos;s First Clinical-Grade AI Dental Platform — 15 Integrated Modules
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" /> All Systems Active
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Medical Intelligence Engine
          </Badge>
        </div>
      </div>

      {/* Module Grid or Active Module */}
      {!activeModule ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((module) => (
            <Card
              key={module.id}
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 hover:border-blue-200"
              onClick={() => setActiveModule(module.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${module.color} text-white shadow-lg`}>
                    {module.icon}
                  </div>
                  {module.badge ? (
                    <Badge
                      variant="outline"
                      className={
                        module.badge === "AI"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : module.badge === "Core"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-red-50 text-red-700 border-red-200"
                      }
                    >
                      {module.badge}
                    </Badge>
                  ) : null}
                </div>
                <h3 className="font-semibold text-sm">{module.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{module.titleAr}</p>
                <p className="text-xs text-muted-foreground mt-2">{module.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Module Input */}
          <div>{renderModuleContent()}</div>

          {/* AI Result — Formatted Clinical Report */}
          <div>
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    Clinical AI Report
                  </CardTitle>
                  {result ? (
                    <Button variant="ghost" size="sm" onClick={() => {
                      const text = JSON.stringify(result, null, 2);
                      navigator.clipboard.writeText(text);
                      toast.success("Report copied to clipboard");
                    }}>
                      <Download className="h-3.5 w-3.5 mr-1" />
                      <span className="text-xs">Copy</span>
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative">
                      <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                      <div className="absolute inset-0 h-10 w-10 animate-ping opacity-20 rounded-full bg-blue-500" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-4 animate-pulse">{loadingMessage}</p>
                    <div className="flex gap-1 mt-3">
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                ) : result ? (
                  <div className="overflow-auto max-h-[700px] pr-2">
                    <AIResultRenderer data={result} module={activeModule} />
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">Clinical report will appear here</p>
                    <p className="text-xs mt-1">Fill in the form and click analyze to get Medical Intelligence insights</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Stats Footer */}
      {!activeModule ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">15</p>
              <p className="text-xs text-blue-600">Clinical Modules</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-700">15</p>
              <p className="text-xs text-purple-600">API Actions</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-700">FDI</p>
              <p className="text-xs text-green-600">ISO 3950</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-700">AR/EN</p>
              <p className="text-xs text-amber-600">Bilingual</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-rose-100">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-rose-700">AAP</p>
              <p className="text-xs text-rose-600">EFP 2017</p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
