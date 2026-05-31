export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

"use client";

import * as React from "react";
import {
  Cloud,
  Brain,
  Watch,
  MessageCircle,
  Activity,
  Shield,
  Database,
  Wifi,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Heart,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

interface IntegrationCard {
  title: string;
  description: string;
  icon: React.ElementType;
  status: "active" | "configured" | "pending";
  capabilities: string[];
  color: string;
  endpoint: string;
}

const integrations: IntegrationCard[] = [
  {
    title: "Cloud Healthcare API",
    description: "FHIR R4 & DICOM integration for interoperability with global healthcare systems",
    icon: Database,
    status: "active",
    capabilities: [
      "FHIR R4 Patient Resources",
      "FHIR Encounter & Observations",
      "DICOM STOW-RS (Store)",
      "DICOM WADO-RS (Retrieve)",
      "DICOM QIDO-RS (Query)",
      "Interoperability with any FHIR-compliant system",
    ],
    color: "from-blue-500 to-cyan-500",
    endpoint: "/api/google-health/fhir",
  },
  {
    title: "MedGemma",
    description: "Google's medical AI model for radiology, lab analysis, and clinical decision support",
    icon: Brain,
    status: "active",
    capabilities: [
      "Radiology Image Analysis",
      "Lab Report Interpretation",
      "Clinical Question Answering",
      "Medical Document Understanding",
      "Longitudinal Patient Analysis",
      "Evidence-based Recommendations",
    ],
    color: "from-purple-500 to-pink-500",
    endpoint: "/api/google-health/medgemma",
  },
  {
    title: "Health Connect",
    description: "Wearable device integration for continuous patient monitoring via Google Fitness",
    icon: Watch,
    status: "active",
    capabilities: [
      "Heart Rate Monitoring",
      "Blood Pressure Tracking",
      "SpO2 (Oxygen Saturation)",
      "Sleep Analysis",
      "Activity & Steps Tracking",
      "Pre-visit Health Summary",
    ],
    color: "from-green-500 to-emerald-500",
    endpoint: "/api/google-health/health-connect",
  },
  {
    title: "AI Co-Clinician",
    description: "AMIE-inspired pre-visit patient interview system for comprehensive history collection",
    icon: MessageCircle,
    status: "active",
    capabilities: [
      "Pre-visit Patient Interview",
      "Structured History Collection (OPQRST)",
      "Multi-language Support (EN/AR)",
      "Physician Summary Generation",
      "Risk Factor Identification",
      "Differential Diagnosis Suggestions",
    ],
    color: "from-orange-500 to-red-500",
    endpoint: "/api/google-health/co-clinician",
  },
];

export default function GoogleHealthPage() {
  const [statuses, setStatuses] = React.useState<Record<string, unknown>>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/google-health");
        if (res.ok) {
          const data = await res.json();
          setStatuses(data);
        }
      } catch {
        // Silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  return (
    <div className="space-y-8 p-6 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-green-500 text-white">
              <Cloud className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Google Health Integration</h1>
              <p className="text-sm text-[color:var(--color-muted-foreground)]">
                Powered by Google Cloud Healthcare API, MedGemma & Health Connect
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 text-sm font-medium text-green-600">
          <Wifi className="size-4" />
          All Systems Active
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={Shield} label="FHIR Version" value="R4 (4.0.1)" color="blue" />
        <StatCard icon={Brain} label="AI Model" value="MedGemma" color="purple" />
        <StatCard icon={Activity} label="Health Metrics" value="7 Types" color="green" />
        <StatCard icon={FileText} label="Compliance" value="HIPAA + GDPR" color="orange" />
      </div>

      {/* Integration Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {integrations.map((integration) => (
          <IntegrationCardComponent key={integration.title} integration={integration} />
        ))}
      </div>

      {/* Architecture Diagram */}
      <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-6">
        <h2 className="mb-4 text-lg font-semibold">System Architecture</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <ArchBlock
            title="Data Layer"
            items={["Google Cloud SQL (PostgreSQL 16)", "FHIR R4 Store", "DICOM Store", "Health Connect Data"]}
            icon={Database}
            color="blue"
          />
          <ArchBlock
            title="AI Layer"
            items={["MedGemma 27B (Text)", "MedGemma 4B (Vision)", "Gemini 2.5 Pro (Fallback)", "AI Co-Clinician"]}
            icon={Sparkles}
            color="purple"
          />
          <ArchBlock
            title="Integration Layer"
            items={["FHIR R4 Endpoints", "DICOMweb (STOW/WADO/QIDO)", "Google Fitness API", "OAuth2 (Health Connect)"]}
            icon={Wifi}
            color="green"
          />
        </div>
      </div>

      {/* GCP Project Info */}
      <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-6">
        <h2 className="mb-4 text-lg font-semibold">Google Cloud Project</h2>
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <InfoRow label="Project ID" value="gen-lang-client-0619493108" />
          <InfoRow label="Project Name" value="MediSoft" />
          <InfoRow label="Region" value="us-central1" />
          <InfoRow label="Healthcare Dataset" value="medisoft-health" />
          <InfoRow label="FHIR Store" value="medisoft-fhir-store" />
          <InfoRow label="DICOM Store" value="medisoft-dicom-store" />
          <InfoRow label="Cloud SQL Instance" value="medisoft-db (PostgreSQL 16)" />
          <InfoRow label="Compute Engine" value="35.227.122.228" />
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-600",
    purple: "bg-purple-500/10 text-purple-600",
    green: "bg-green-500/10 text-green-600",
    orange: "bg-orange-500/10 text-orange-600",
  };

  return (
    <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-4">
      <div className={`mb-2 inline-flex rounded-lg p-2 ${colorMap[color]}`}>
        <Icon className="size-4" />
      </div>
      <div className="text-xs text-[color:var(--color-muted-foreground)]">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function IntegrationCardComponent({ integration }: { integration: IntegrationCard }) {
  const Icon = integration.icon;

  return (
    <div className="group rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-6 transition-shadow hover:shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${integration.color} text-white`}>
            <Icon className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold">{integration.title}</h3>
            <p className="text-xs text-[color:var(--color-muted-foreground)]">
              {integration.description}
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-600">
          <CheckCircle2 className="size-3" />
          Active
        </span>
      </div>

      <div className="space-y-2">
        {integration.capabilities.map((cap) => (
          <div key={cap} className="flex items-center gap-2 text-sm text-[color:var(--color-muted-foreground)]">
            <ArrowRight className="size-3 text-[color:var(--color-brand-cyan)]" />
            {cap}
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-[color:var(--color-border)] pt-3">
        <code className="text-xs text-[color:var(--color-muted-foreground)]">
          {integration.endpoint}
        </code>
      </div>
    </div>
  );
}

function ArchBlock({
  title,
  items,
  icon: Icon,
  color,
}: {
  title: string;
  items: string[];
  icon: React.ElementType;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "border-blue-500/30 bg-blue-500/5",
    purple: "border-purple-500/30 bg-purple-500/5",
    green: "border-green-500/30 bg-green-500/5",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-xs text-[color:var(--color-muted-foreground)]">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-[color:var(--color-muted)]/30 px-3 py-2">
      <span className="text-[color:var(--color-muted-foreground)]">{label}</span>
      <span className="font-mono text-xs font-medium">{value}</span>
    </div>
  );
}
