"use client";

/** Pure SVG bar chart for encounter trends. */
interface Props {
  data: Array<{ month: string; count: number }>;
}

export function EncounterChart({ data }: Props) {
  if (data.length === 0) return <p className="text-xs text-gray-400 text-center py-8">لا توجد بيانات</p>;

  const max = Math.max(...data.map((d) => d.count), 1);
  const W = 100;
  const H = 60;
  const barW = W / data.length - 2;

  return (
    <svg viewBox={`0 0 ${W} ${H + 12}`} className="w-full h-40" preserveAspectRatio="none">
      {data.map((d, i) => {
        const barH = (d.count / max) * H;
        const x = i * (W / data.length) + 1;
        return (
          <g key={i}>
            <rect x={x} y={H - barH} width={barW} height={barH} rx="1.5"
              fill="#3B82F6" opacity="0.8" className="transition-all duration-500 hover:opacity-100">
              <title>{d.month}: {d.count}</title>
            </rect>
            <text x={x + barW / 2} y={H + 8} textAnchor="middle" className="text-[3px] fill-gray-500">
              {d.month.slice(5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
