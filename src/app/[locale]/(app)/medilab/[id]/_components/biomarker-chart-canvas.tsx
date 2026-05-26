"use client";

import * as React from "react";
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

export interface BiomarkerChartCanvasProps {
  testName: string;
  unit?: string | null;
  referenceLow?: number | null;
  referenceHigh?: number | null;
  /** Already filtered + ready to render: ts is ms-epoch, value is finite. */
  data: Array<{ ts: number; value: number }>;
  readingCount: number;
}

/**
 * Heavy Recharts impl. Default export required by next/dynamic.
 *
 * Kept out of the initial route bundle by the wrapper in
 * biomarker-trend-chart.tsx. Recharts is ~80 KB gz; the patient detail
 * page never imports it directly.
 */
export default function BiomarkerChartCanvas({
  testName,
  unit,
  referenceLow,
  referenceHigh,
  data,
  readingCount,
}: BiomarkerChartCanvasProps) {
  return (
    <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-3">
      <div className="mb-1 flex items-baseline justify-between text-[10px] text-[color:var(--color-muted-foreground)]">
        <span className="font-semibold uppercase tracking-wider">Trend</span>
        <span>
          {readingCount} readings · {unit ?? ""}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
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
