"use client";

/**
 * SVG-based radar/spider chart for 5 risk categories.
 * Lightweight, no external dependencies.
 */

interface Props {
  data: Array<{ label: string; value: number }>; // 0-100 scale
  size?: number;
}

export function RadarChart({ data, size = 240 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 30;
  const levels = [25, 50, 75, 100];
  const n = data.length;
  if (n < 3) return null;

  const angleStep = (2 * Math.PI) / n;

  function polarToXY(angle: number, r: number): [number, number] {
    return [cx + r * Math.cos(angle - Math.PI / 2), cy + r * Math.sin(angle - Math.PI / 2)];
  }

  // Build polygon path for data
  const points = data.map((d, i) => {
    const r = (d.value / 100) * maxR;
    return polarToXY(i * angleStep, r);
  });
  const polygonPath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ") + " Z";

  // Risk color based on average
  const avg = data.reduce((s, d) => s + d.value, 0) / n;
  const fillColor = avg > 60 ? "rgba(239, 68, 68, 0.15)" : avg > 40 ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)";
  const strokeColor = avg > 60 ? "#EF4444" : avg > 40 ? "#F59E0B" : "#10B981";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {/* Grid circles */}
      {levels.map((level) => (
        <circle key={level} cx={cx} cy={cy} r={(level / 100) * maxR}
          fill="none" stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray={level === 50 ? "4 2" : "none"}
        />
      ))}

      {/* Axis lines + labels */}
      {data.map((d, i) => {
        const angle = i * angleStep;
        const [lx, ly] = polarToXY(angle, maxR + 18);
        const [ax, ay] = polarToXY(angle, maxR);
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={ax} y2={ay} stroke="#D1D5DB" strokeWidth="0.5" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
              className="text-[9px] fill-gray-600 font-medium">
              {d.label}
            </text>
          </g>
        );
      })}

      {/* 50% threshold ring (moderate level) */}
      <circle cx={cx} cy={cy} r={(50 / 100) * maxR} fill="none" stroke="#F59E0B" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />

      {/* Data polygon */}
      <path d={polygonPath} fill={fillColor} stroke={strokeColor} strokeWidth="2" className="transition-all duration-700" />

      {/* Data points */}
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill={strokeColor} stroke="white" strokeWidth="2" />
      ))}
    </svg>
  );
}
