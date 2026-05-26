"use client";

/** Pure SVG donut chart. */
interface Props {
  data: Array<{ label: string; value: number; color: string }>;
  size?: number;
}

export function DonutChart({ data, size = 120 }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = (size - 20) / 2;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((d, i) => {
          const segment = (d.value / total) * C;
          const dash = `${segment} ${C - segment}`;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={R} fill="none" stroke={d.color} strokeWidth="16"
              strokeDasharray={dash} strokeDashoffset={-offset} transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="transition-all duration-700">
              <title>{d.label}: {d.value} ({Math.round((d.value / total) * 100)}%)</title>
            </circle>
          );
          offset += segment;
          return el;
        })}
      </svg>
      <div className="space-y-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-gray-700">{d.label}: {d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
