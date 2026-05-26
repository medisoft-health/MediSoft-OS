"use client";

import dynamic from "next/dynamic";
import type { VitalsTrendChartProps } from "./vitals-trend-chart-impl";

/**
 * Lazy-loaded wrapper around the Recharts-based trend chart.
 *
 * Recharts is ~80 KB gz on its own. The patient detail page renders 4
 * trend charts on the Vitals tab, but those tabs aren't always visited,
 * and the chart is below the fold even when they are. `next/dynamic`
 * with `ssr: false` keeps the bundle out of the initial route payload
 * — the chart code only loads when the component actually mounts.
 *
 * Public API is identical to the impl so existing consumers don't change.
 */
const VitalsTrendChartLazy = dynamic(
  () => import("./vitals-trend-chart-impl"),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[160px] items-center justify-center rounded-xl border border-dashed border-[color:var(--color-border)] text-[color:var(--color-muted-foreground)]"
        aria-label="Loading chart"
      >
        <span className="text-xs">Loading chart…</span>
      </div>
    ),
  },
);

export function VitalsTrendChart(props: VitalsTrendChartProps) {
  return <VitalsTrendChartLazy {...props} />;
}
