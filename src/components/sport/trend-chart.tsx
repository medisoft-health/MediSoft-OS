"use client";

/**
 * Shared TrendChart for MediSport — visualizes serial metrics over time.
 * Reused by body-composition history and lab-results history.
 * Multi-series line chart with RTL-aware layout and emerald theming.
 */

import * as React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TrendSeries = {
  key: string;
  label: string;
  color: string;
};

export type TrendPoint = Record<string, string | number | null> & {
  label: string;
};

const PALETTE = [
  "#059669", // emerald-600
  "#0d9488", // teal-600
  "#6366f1", // indigo-500
  "#f59e0b", // amber-500
  "#ec4899", // pink-500
  "#8b5cf6", // violet-500
];

export function trendColor(i: number): string {
  return PALETTE[i % PALETTE.length];
}

export function TrendChart({
  data,
  series,
  height = 260,
  rtl = false,
}: {
  data: TrendPoint[];
  series: TrendSeries[];
  height?: number;
  rtl?: boolean;
}) {
  if (!data || data.length < 2) {
    return null;
  }
  return (
    <div style={{ width: "100%", height }} dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#64748b" }}
            reversed={rtl}
          />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} width={36} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
