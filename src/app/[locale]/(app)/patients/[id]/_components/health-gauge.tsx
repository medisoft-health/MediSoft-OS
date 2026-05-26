"use client";

import { cn } from "@/lib/utils";

interface Props {
  score: number;
  size?: number;
  className?: string;
}

export function HealthGauge({ score, size = 160, className }: Props) {
  const R = (size - 20) / 2;
  const C = 2 * Math.PI * R;
  const progress = (score / 100) * C;

  const color = score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : score >= 40 ? "#F97316" : "#EF4444";
  const label = score >= 80 ? "ممتاز" : score >= 60 ? "جيد" : score >= 40 ? "انتباه" : "خطر";

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="#E5E7EB" strokeWidth="12" />
        <circle
          cx={size / 2} cy={size / 2} r={R} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${C}`} strokeDashoffset={`${C - progress}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-[1500ms] ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${color}50)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black tabular-nums" style={{ color }}>{score}</span>
        <span className="text-xs text-gray-500">/ 100</span>
        <span className="mt-0.5 text-xs font-semibold" style={{ color }}>{label}</span>
      </div>
    </div>
  );
}
