"use client";

import { cn } from "@/lib/utils";

interface Props {
  value: string | number;
  label: string;
  icon: string;
  color: string;
  sub?: string;
}

export function StatCard({ value, label, icon, color, sub }: Props) {
  return (
    <div className={cn("rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow")}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-black tabular-nums text-gray-900">{value}</div>
          <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          {sub && <div className={cn("text-[10px] mt-0.5 font-medium", color)}>{sub}</div>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}
