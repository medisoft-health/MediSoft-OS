"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchBiomarkerTrend, type TrendPoint } from "@/lib/medilab/client";

/**
 * Biomarker trend wrapper.
 *
 * The Recharts-rendering canvas is lazy-loaded so the lab-detail page's
 * initial JS doesn't carry Recharts when the user hasn't pressed "Load
 * trend" on any of the result rows.
 */
const BiomarkerChartCanvas = dynamic(
  () => import("./biomarker-chart-canvas"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[140px] items-center justify-center rounded-xl border border-dashed border-[color:var(--color-border)] text-[11px] text-[color:var(--color-muted-foreground)]">
        Loading chart…
      </div>
    ),
  },
);

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
 * Per-biomarker trend chart with three states:
 *   1. Pre-load: a small "Load trend" button (default — keeps the lab
 *      detail page snappy when a panel has 15+ tests)
 *   2. Loading
 *   3. Loaded: either the Recharts canvas or a "need ≥2 readings" hint
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
      <Button variant="ghost" size="sm" onClick={load} className="text-[11px]">
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
    <BiomarkerChartCanvas
      testName={testName}
      unit={unit ?? undefined}
      referenceLow={referenceLow ?? undefined}
      referenceHigh={referenceHigh ?? undefined}
      data={chartData}
      readingCount={points.length}
    />
  );
}
