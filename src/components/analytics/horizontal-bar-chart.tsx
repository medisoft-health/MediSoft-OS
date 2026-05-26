"use client";

import { cn } from "@/lib/utils";

/** Horizontal bar chart — for age groups, risk distribution, etc. */
interface Props {
  data: Array<{ label: string; value: number; color?: string }>;
  maxValue?: number;
}

export function HorizontalBarChart({ data, maxValue }: Props) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-gray-700 min-w-[60px] text-end">{d.label}</span>
          <div className="flex-1 h-4 rounded-full bg-gray-100 overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-700")}
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color ?? "#3B82F6" }} />
          </div>
          <span className="text-xs font-bold tabular-nums text-gray-700 min-w-[30px]">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
