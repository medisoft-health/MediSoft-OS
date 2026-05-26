"use client";

/**
 * Sparkline canvas — lazy-loaded Recharts mini line chart.
 * Default export required by next/dynamic in infographic-report.tsx.
 *
 * This is intentionally a separate file so Recharts is NOT in the initial
 * bundle. It's only loaded if the infographic actually renders sparklines.
 */

import * as React from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

export interface SparklineCanvasProps {
  data: Array<{ ts: number; value: number }>;
  color: string;
}

export default function SparklineCanvas({ data, color }: SparklineCanvasProps) {
  if (data.length < 2) return null;

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          animationDuration={1000}
          animationEasing="ease-out"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
