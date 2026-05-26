"use client";

/** Ranked list component — for top diagnoses, top medications. */
interface Props {
  items: Array<{ label: string; value: string | number; sub?: string }>;
  title: string;
}

export function RankedList({ items, title }: Props) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-800 mb-3">{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">لا توجد بيانات</p>
      ) : (
        <ol className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-600">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-900 truncate">{item.label}</div>
                {item.sub && <div className="text-[10px] text-gray-500">{item.sub}</div>}
              </div>
              <span className="text-xs font-bold tabular-nums text-gray-700">{item.value}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
