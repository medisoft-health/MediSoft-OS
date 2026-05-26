"use client";

import * as React from "react";
import {
  AlertTriangle,
  ChevronDown,
  CheckCircle2,
  Loader2,
  Pill,
  Shield,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  fetchDrugLabAlerts,
  type DrugLabAlert,
  type DrugLabAlertResult,
} from "@/lib/medilab/client";
import { cn } from "@/lib/utils";

interface Props {
  labResultId: string;
}

const SEVERITY_CONFIG = {
  critical: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200 border-s-red-600", badge: "destructive" as const, icon: "🔴", label: "CRITICAL" },
  high: { color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200 border-s-orange-500", badge: "warning" as const, icon: "🟠", label: "HIGH" },
  moderate: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200 border-s-amber-500", badge: "warning" as const, icon: "🟡", label: "MODERATE" },
  low: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200 border-s-blue-500", badge: "info" as const, icon: "🔵", label: "LOW" },
};

export function DrugLabAlertsPanel({ labResultId }: Props) {
  const [data, setData] = React.useState<DrugLabAlertResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const result = await fetchDrugLabAlerts(labResultId);
      if (cancelled) return;
      if (result) {
        setData(result);
      } else {
        setError(true);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [labResultId]);

  // Don't render anything while loading or if there's an error
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-4 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" />
          Checking drug-lab interactions...
        </CardContent>
      </Card>
    );
  }

  if (error || !data) return null;

  // No medications — skip
  if (data.totalActiveDrugs === 0) return null;

  // No alerts — show green success
  if (data.alerts.length === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle2 className="size-5 text-emerald-600" />
          <div>
            <div className="text-sm font-semibold text-emerald-800">No Drug-Lab Interactions Detected</div>
            <div className="text-xs text-emerald-600">
              {data.totalActiveDrugs} active medication{data.totalActiveDrugs > 1 ? "s" : ""} checked against {data.analyzedTests} lab results
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Alerts found — show prominent warning
  const criticalCount = data.alerts.filter((a) => a.severity === "critical" || a.severity === "high").length;

  return (
    <Card className={cn("border-2", criticalCount > 0 ? "border-red-300" : "border-amber-300")}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className={cn("size-5", criticalCount > 0 ? "text-red-600" : "text-amber-600")} />
            Drug-Lab Interaction Alerts
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={criticalCount > 0 ? "destructive" : "warning"}>
              {data.alerts.length} alert{data.alerts.length > 1 ? "s" : ""}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              <Pill className="size-3 me-1" />
              {data.totalActiveDrugs} active drug{data.totalActiveDrugs > 1 ? "s" : ""}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {data.alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </CardContent>
    </Card>
  );
}

function AlertCard({ alert }: { alert: DrugLabAlert }) {
  const [expanded, setExpanded] = React.useState(alert.severity === "critical" || alert.severity === "high");
  const config = SEVERITY_CONFIG[alert.severity];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-s-4 transition-all cursor-pointer hover:shadow-sm",
        config.border, config.bg,
      )}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="flex items-start gap-3">
          <span className="text-lg mt-0.5">{config.icon}</span>
          <div>
            <div className={cn("text-sm font-bold", config.color)}>
              {config.label} — {alert.drugName} → {alert.expectedEffect}
            </div>
            <div className="mt-0.5 text-xs text-gray-700">
              <Pill className="inline size-3 me-1" />
              {alert.drugName} {alert.drugDose}
              {alert.drugStartDate && (
                <span className="text-gray-500"> (started: {alert.drugStartDate})</span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-gray-700">
              <Shield className="inline size-3 me-1" />
              {alert.affectedTest} = <span className="font-bold">{alert.currentValue}</span> {alert.unit}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[9px]">
            {alert.confidence}
          </Badge>
          <ChevronDown className={cn("size-4 text-gray-400 transition-transform", expanded && "rotate-180")} />
        </div>
      </div>

      {/* Expandable detail */}
      <div className={cn(
        "overflow-hidden transition-all duration-300",
        expanded ? "max-h-48 opacity-100" : "max-h-0 opacity-0",
      )}>
        <div className="border-t border-gray-200/50 px-3 pb-3 pt-2 space-y-2">
          <div>
            <div className="text-[10px] font-semibold uppercase text-gray-500 mb-0.5">Mechanism</div>
            <p className="text-xs text-gray-800 leading-relaxed">{alert.mechanism}</p>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase text-gray-500 mb-0.5">Recommendation</div>
            <p className={cn("text-xs font-medium leading-relaxed", config.color)}>{alert.recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
