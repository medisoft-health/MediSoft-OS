"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Reading {
  recordedAt: Date | string;
  value: number;
}

export interface VitalsTrendChartProps {
  title: string;
  unit: string;
  data: Reading[];
  color?: string;
  refLow?: number;
  refHigh?: number;
  height?: number;
  emptyMessage?: string;
}

/**
 * Heavy implementation of the vitals trend chart. Imports the entire
 * Recharts surface — kept out of the initial route bundle by the
 * `next/dynamic` wrapper in vitals-trend-chart.tsx.
 *
 * Default export is required by next/dynamic.
 */
export default function VitalsTrendChartImpl({
  title,
  unit,
  data,
  color = "#E84A8A",
  refLow,
  refHigh,
  height = 160,
  emptyMessage = "Not enough readings yet for a trend.",
}: VitalsTrendChartProps) {
  const chartData = React.useMemo(() => {
    return data
      .filter((d) => Number.isFinite(d.value))
      .map((d) => ({
        ts: new Date(d.recordedAt).getTime(),
        value: d.value,
      }))
      .sort((a, b) => a.ts - b.ts);
  }, [data]);

  if (chartData.length < 2) {
    return (
      <div className="flex h-[160px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[color:var(--color-border)] text-center">
        <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
          {title}
        </div>
        <div className="text-xs text-[color:var(--color-muted-foreground)]">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[color:var(--color-border)] p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
          {title}
        </div>
        <div className="text-[10px] text-[color:var(--color-muted-foreground)]">
          {chartData.length} readings · {unit}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
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
            width={32}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #E5E7EB",
              fontSize: 12,
            }}
            labelFormatter={(ts) =>
              new Date(Number(ts)).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            }
            formatter={(value) => [`${value} ${unit}`, title]}
          />
          {refLow != null && (
            <Line
              type="monotone"
              dataKey={() => refLow}
              stroke="#10B981"
              strokeDasharray="3 3"
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}
          {refHigh != null && (
            <Line
              type="monotone"
              dataKey={() => refHigh}
              stroke="#F5A04A"
              strokeDasharray="3 3"
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
