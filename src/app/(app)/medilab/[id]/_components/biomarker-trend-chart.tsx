"use client";

import * as React from "react";
import { Loader2, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { fetchBiomarkerTrend, type TrendPoint } from "@/lib/medilab/client";
import { cn } from "@/lib/utils";

interface Props {
  patientId: number;
  testName: string;
  unit?: string | null;
  referenceLow?: number | null;
  referenceHigh?: number | null;
  /** Auto-load on mount when true; otherwise show a "Load trend" button. */
  autoLoad?: boolean;
}

/**
 * Recharts trend chart for a single biomarker across a patient's lab
 * history. Fetched on-demand to keep the detail page snappy when a
 * panel has 15+ tests.
 */
export function BiomarkerTrendChart({
  patientId,
  testName,
  unit,
  referenceLow,
  referenceHigh,
  autoLoad = false,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [points, setPoints] = React.useState<TrendPoint[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const ps = await fetchBiomarkerTrend(patientId, testName);
      setPoints(ps);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [patientId, testName]);

  React.useEffect(() => {
    if (autoLoad) load();
  }, [autoLoad, load]);

  if (!loaded && !loading) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={load}
        className="text-[11px]"
      >
        <TrendingUp className="size-3.5" />
        Load trend
      </Button>
    );
  }
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-[color:var(--color-muted-foreground)]">
        <Loader2 className="size-3.5 animate-spin" /> Loading…
      </div>
    );
  }
  if (points.length < 2) {
    return (
      <div className="text-[11px] text-[color:var(--color-muted-foreground)]">
        Only {points.length} prior reading{points.length === 1 ? "" : "s"} —
        need at least 2 to chart a trend.
      </div>
    );
  }

  const chartData = points.map((p) => ({
    ts: new Date(p.resultDate).getTime(),
    value: p.value,
  }));

  return (
    <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-3">
      <div className="mb-1 flex items-baseline justify-between text-[10px] text-[color:var(--color-muted-foreground)]">
        <span className="font-semibold uppercase tracking-wider">Trend</span>
        <span>{points.length} readings · {unit ?? ""}</span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(15,23,42,0.06)" vertical={false} />
          <XAxis
            dataKey="ts"
            tickFormatter={(ts) =>
              new Date(ts).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
              })
            }
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "#64748B" }}
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "#64748B" }}
            width={36}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #E5E7EB",
              fontSize: 12,
            }}
            labelFormatter={(ts) =>
              new Date(Number(ts)).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            }
            formatter={(v) => [`${v}${unit ? " " + unit : ""}`, testName]}
          />
          {referenceLow != null && (
            <ReferenceLine
              y={referenceLow}
              stroke="#10B981"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}
          {referenceHigh != null && (
            <ReferenceLine
              y={referenceHigh}
              stroke="#F5A04A"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#E84A8A"
            strokeWidth={2}
            dot={{ r: 3, fill: "#E84A8A" }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// re-export to satisfy unused warning if cn is removed by future trim
export { cn as _ };
