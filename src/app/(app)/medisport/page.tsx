import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  AlertTriangle,
  Apple,
  BarChart3,
  Brain,
  Dumbbell,
  FlaskConical,
  Heart,
  HeartPulse,
  Moon,
  PersonStanding,
  Shield,
  Thermometer,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

export const dynamic = "force-dynamic";

const modules = [
  {
    id: "lab-body-comp",
    name: "Lab & Body Composition",
    description: "Periodic blood work with sport-specific reference ranges, DEXA/BIA body composition trending, and Medical Intelligence marker correlation analysis",
    icon: FlaskConical,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    status: "active",
    features: ["Sport-Specific Ranges", "Trend Analysis", "Body Composition", "AI Interpretation"],
  },
  {
    id: "athlete-monitoring",
    name: "Injury Prediction & Monitoring",
    description: "Acute:Chronic Workload Ratio (ACWR), training load monitoring, and Medical Intelligence injury risk prediction with modifiable risk factors",
    icon: Activity,
    color: "text-red-600",
    bgColor: "bg-red-50",
    status: "active",
    features: ["ACWR Calculation", "Load Monitoring", "Risk Prediction", "Readiness Score"],
  },
  {
    id: "anti-doping",
    name: "Anti-Doping & WADA Compliance",
    description: "Real-time medication check against WADA 2026 Prohibited List, TUE application generation, and safe alternative suggestions",
    icon: Shield,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    status: "active",
    features: ["WADA 2026 List", "TUE Generator", "Safe Alternatives", "Supplement Check"],
  },
  {
    id: "concussion",
    name: "Concussion Management (SCAT6)",
    description: "Complete SCAT6 protocol with baseline comparison, graduated return-to-play staging, and objective cognitive tracking",
    icon: Brain,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    status: "active",
    features: ["SCAT6 Protocol", "Baseline Comparison", "RTP Staging", "Cognitive Tracking"],
  },
  {
    id: "pcma",
    name: "Pre-Competition Medical Assessment",
    description: "FIFA/IOC-compliant PCMA with cardiac risk stratification, Seattle ECG criteria, and automated clearance decisions",
    icon: HeartPulse,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    status: "active",
    features: ["FIFA/IOC Protocol", "ECG Analysis", "Cardiac Risk", "Clearance Decision"],
  },
  {
    id: "nutrition",
    name: "Sports Nutrition & Hydration AI",
    description: "Periodized nutrition plans, WADA-compliant supplement protocols, sweat-rate based hydration, and gut health optimization",
    icon: Apple,
    color: "text-green-600",
    bgColor: "bg-green-50",
    status: "active",
    features: ["Periodized Plans", "Supplement Safety", "Hydration Protocol", "Macro Timing"],
  },
  {
    id: "sleep-recovery",
    name: "Sleep & Recovery Intelligence",
    description: "Multi-source sleep analysis (Oura/WHOOP/Apple Watch), HRV-based recovery scoring, and training readiness assessment",
    icon: Moon,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    status: "active",
    features: ["Sleep Analysis", "HRV Tracking", "Recovery Score", "Readiness Assessment"],
  },
  {
    id: "biomechanics",
    name: "Biomechanics & Movement Analysis",
    description: "FMS scoring, force plate analysis, gait assessment, asymmetry detection, and corrective exercise prescription",
    icon: PersonStanding,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    status: "active",
    features: ["FMS Scoring", "Force Plate", "Gait Analysis", "Asymmetry Detection"],
  },
  {
    id: "psychology",
    name: "Sports Psychology & Mental Performance",
    description: "Validated instruments (PHQ-9/GAD-7), athlete burnout detection, performance anxiety management, and AI coaching",
    icon: Brain,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    status: "active",
    features: ["PHQ-9/GAD-7", "Burnout Detection", "Anxiety Management", "AI Coaching"],
  },
  {
    id: "heat-safety",
    name: "Heat & Environmental Safety",
    description: "WBGT-based risk assessment, acclimatization tracking, activity modification protocols, and emergency cooling plans",
    icon: Thermometer,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    status: "active",
    features: ["WBGT Monitoring", "Acclimatization", "Activity Modification", "Emergency Protocol"],
  },
  {
    id: "team-dashboard",
    name: "Team Dashboard",
    description: "Real-time squad availability, multi-athlete risk alerts, performance trends, and upcoming assessment scheduling",
    icon: Users,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    status: "active",
    features: ["Squad Status", "Risk Alerts", "Performance Trends", "Assessment Calendar"],
  },
  {
    id: "rehab-rtp",
    name: "Rehabilitation & Return-to-Play",
    description: "AI-generated phased rehab protocols with objective progression criteria, re-injury risk scoring, and sport-specific RTP",
    icon: Dumbbell,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    status: "active",
    features: ["Phased Protocols", "Objective Criteria", "Re-injury Risk", "Sport-Specific RTP"],
  },
  {
    id: "cardiac",
    name: "Cardiac Screening & SCD Prevention",
    description: "ECG interpretation using Seattle/International criteria, echocardiogram analysis, stress test evaluation, and family risk scoring",
    icon: Heart,
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    status: "active",
    features: ["Seattle Criteria", "Echo Analysis", "Stress Test", "SCD Prevention"],
  },
  {
    id: "performance-testing",
    name: "Performance Testing & Fitness Assessment",
    description: "VO2max, lactate threshold, sprint profiling, strength/power assessment, and comprehensive fitness scoring with sport benchmarks",
    icon: Trophy,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    status: "active",
    features: ["VO2max", "Lactate Threshold", "Sprint Profile", "Fitness Score"],
  },
];

const stats = [
  { label: "Active Modules", value: "14", icon: Zap, color: "text-blue-600" },
  { label: "Sports Covered", value: "50+", icon: Trophy, color: "text-green-600" },
  { label: "WADA Substances", value: "2,000+", icon: Shield, color: "text-purple-600" },
  { label: "Compliance", value: "FIFA/IOC/WADA", icon: AlertTriangle, color: "text-orange-600" },
];

export default function MediSportPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header with Logo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Image
            src="/brand/medisport-logo.png"
            alt="MediSport"
            width={220}
            height={60}
            className="h-12 w-auto"
            priority
          />
          <div>
            <p className="text-sm text-muted-foreground">
              World&apos;s First Clinical-Grade Sports Medicine AI Platform
            </p>
          </div>
        </div>
        <Badge variant="default" className="w-fit bg-gradient-to-r from-pink-500 to-blue-600 text-white">
          14 Clinical Modules Active
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Compliance Banner */}
      <Card className="border-none bg-gradient-to-r from-pink-50 via-blue-50 to-purple-50">
        <CardContent className="flex flex-wrap items-center justify-center gap-3 p-4">
          <Badge variant="outline" className="border-pink-300 text-pink-700">WADA 2026</Badge>
          <Badge variant="outline" className="border-blue-300 text-blue-700">FIFA Medical</Badge>
          <Badge variant="outline" className="border-purple-300 text-purple-700">IOC Medical Code</Badge>
          <Badge variant="outline" className="border-green-300 text-green-700">FHIR R4</Badge>
          <Badge variant="outline" className="border-orange-300 text-orange-700">HIPAA</Badge>
          <Badge variant="outline" className="border-cyan-300 text-cyan-700">GDPR</Badge>
          <Badge variant="outline" className="border-indigo-300 text-indigo-700">Seattle ECG Criteria</Badge>
          <Badge variant="outline" className="border-rose-300 text-rose-700">SCAT6 Protocol</Badge>
        </CardContent>
      </Card>

      {/* Module Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <Card key={module.id} className="group relative overflow-hidden transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className={`rounded-lg p-2 ${module.bgColor}`}>
                  <module.icon className={`h-5 w-5 ${module.color}`} />
                </div>
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                  Active
                </Badge>
              </div>
              <CardTitle className="mt-3 text-base">{module.name}</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                {module.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1.5">
                {module.features.map((feature) => (
                  <Badge key={feature} variant="outline" className="text-[10px] font-normal">
                    {feature}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            API Endpoints
          </CardTitle>
          <CardDescription>
            All MediSport modules are accessible via the unified API at <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/api/medisport</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-3">
            {[
              { action: "analyze-labs", desc: "Lab panel analysis" },
              { action: "analyze-body-composition", desc: "Body comp trending" },
              { action: "calculate-acwr", desc: "Workload ratio" },
              { action: "predict-injury", desc: "Injury risk AI" },
              { action: "check-wada", desc: "WADA compliance" },
              { action: "generate-tue", desc: "TUE application" },
              { action: "assess-concussion", desc: "SCAT6 assessment" },
              { action: "perform-pcma", desc: "Pre-competition medical" },
              { action: "generate-nutrition-plan", desc: "Nutrition AI" },
              { action: "analyze-recovery", desc: "Recovery scoring" },
              { action: "analyze-movement", desc: "Biomechanics" },
              { action: "assess-mental-performance", desc: "Psychology" },
              { action: "assess-heat-safety", desc: "Heat safety" },
              { action: "team-overview", desc: "Team dashboard" },
              { action: "generate-rehab-protocol", desc: "Rehab protocol" },
              { action: "analyze-cardiac", desc: "Cardiac screening" },
              { action: "analyze-performance-test", desc: "Performance test" },
              { action: "generate-fitness-profile", desc: "Fitness profile" },
              { action: "generate-report", desc: "Report generation" },
            ].map((endpoint) => (
              <div key={endpoint.action} className="flex items-center gap-2 rounded-md border p-2">
                <Badge variant="secondary" className="text-[10px] font-mono">POST</Badge>
                <span className="truncate text-xs text-muted-foreground">{endpoint.action}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Integration with MediSoft */}
      <Card className="border-none bg-gradient-to-r from-[#1A3B7A]/5 to-[#E91E8C]/5">
        <CardHeader>
          <CardTitle className="text-base">Integrated with MediSoft C-OS</CardTitle>
          <CardDescription>
            MediSport leverages the full power of the MediSoft platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="font-medium">PharmaX + WADA</p>
              <p className="text-xs text-muted-foreground">Safe prescribing for athletes with automatic prohibited substance detection</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium">MediSense + Training Load</p>
              <p className="text-xs text-muted-foreground">Real-time wearable data feeds into ACWR and recovery calculations</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium">MediLab + Sport Ranges</p>
              <p className="text-xs text-muted-foreground">Athlete-specific reference ranges with longitudinal trending</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium">MediScan + Sports Imaging</p>
              <p className="text-xs text-muted-foreground">AI analysis of sports injuries with return-to-play implications</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium">MediPredict + Injury AI</p>
              <p className="text-xs text-muted-foreground">ML-powered injury prediction combining clinical and performance data</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium">Health Connect + Wearables</p>
              <p className="text-xs text-muted-foreground">Health Connect integration for continuous athlete monitoring</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
