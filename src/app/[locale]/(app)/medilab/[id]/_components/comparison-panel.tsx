"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowUpRight,
  GitCompareArrows,
  Loader2,
  Minus,
  Plus,
  Sparkles,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  fetchPatientLabs,
  fetchComparison,
  type PatientLabSummary,
  type ComparisonData,
  type ComparisonRow,
} from "@/lib/medilab/client";
import { cn } from "@/lib/utils";

interface Props {
  labResultId: string;
  patientId: number;
}

const directionConfig = {
  improved: { icon: ArrowDownRight, label: "تحسن", badge: "success" as const, color: "text-emerald-600", bg: "bg-emerald-50" },
  worsened: { icon: ArrowUpRight, label: "ساء", badge: "destructive" as const, color: "text-rose-600", bg: "bg-rose-50" },
  stable: { icon: Minus, label: "مستقر", badge: "info" as const, color: "text-gray-500", bg: "" },
  new: { icon: Plus, label: "جديد", badge: "outline" as const, color: "text-blue-600", bg: "bg-blue-50" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

export function ComparisonPanel({ labResultId, patientId }: Props) {
  const [labs, setLabs] = React.useState<PatientLabSummary[]>([]);
  const [labsLoading, setLabsLoading] = React.useState(false);
  const [selectedLabId, setSelectedLabId] = React.useState<string | null>(null);
  const [data, setData] = React.useState<ComparisonData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  // Fetch available labs when panel opens
  async function loadLabs() {
    if (labs.length > 0) return; // already loaded
    setLabsLoading(true);
    const result = await fetchPatientLabs(patientId);
    // Exclude current lab from dropdown
    setLabs(result.filter((l) => l.id !== labResultId));
    setLabsLoading(false);
  }

  function handleOpen() {
    setIsOpen(true);
    loadLabs();
  }

  async function runComparison(compareLabId: string) {
    setSelectedLabId(compareLabId);
    setLoading(true);
    setError(null);
    setData(null);

    const result = await fetchComparison(labResultId, compareLabId);
    if (result.kind === "ok") {
      setData(result.data);
    } else {
      setError(result.message);
      toast.error("Comparison failed", { description: result.message });
    }
    setLoading(false);
  }

  async function generateAICommentary() {
    if (!selectedLabId) return;
    setAiLoading(true);
    const result = await fetchComparison(labResultId, selectedLabId, true);
    if (result.kind === "ok" && result.data.aiCommentary) {
      setData((prev) => prev ? { ...prev, aiCommentary: result.data.aiCommentary } : prev);
      toast.success("Clinical commentary generated");
    } else {
      toast.error("Clinical commentary failed");
    }
    setAiLoading(false);
  }

  if (!isOpen) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Button variant="outline" onClick={handleOpen} className="gap-2">
            <GitCompareArrows className="size-4" />
            مقارنة مع تحليل سابق
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitCompareArrows className="size-5 text-[color:var(--color-brand-magenta)]" />
            مقارنة التحاليل
          </CardTitle>
        </div>
        <CardDescription>
          اختر تحليل سابق لمقارنة النتائج ومعرفة التغييرات
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Lab selector */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1.5 block text-xs font-medium text-gray-700">
              اختر التحليل السابق
            </label>
            <Select
              value={selectedLabId ?? ""}
              onValueChange={(v) => v && runComparison(v)}
              disabled={labsLoading || loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={labsLoading ? "جاري التحميل..." : "اختر..."} />
              </SelectTrigger>
              <SelectContent>
                {labs.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.panelName} — {formatDate(l.resultDate)}
                    {l.laboratory ? ` (${l.laboratory})` : ""}
                  </SelectItem>
                ))}
                {labs.length === 0 && !labsLoading && (
                  <SelectItem value="__none__" disabled>
                    لا توجد تحاليل سابقة
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 py-6 justify-center text-sm text-gray-500">
            <Loader2 className="size-4 animate-spin" />
            جاري المقارنة...
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 rounded-lg p-3">{error}</p>
        )}

        {/* Comparison table */}
        {data && (
          <>
            {/* Summary header */}
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
              <div className="text-gray-700">
                <span className="font-bold">{data.currentPanel}</span>
                <span className="text-gray-400 mx-1">←→</span>
                <span className="font-bold">{data.previousPanel}</span>
              </div>
              <div className="flex flex-wrap gap-2 ms-auto">
                <Badge variant="success">
                  {data.comparison.filter((c) => c.direction === "improved").length} تحسن
                </Badge>
                <Badge variant="destructive">
                  {data.comparison.filter((c) => c.direction === "worsened").length} ساء
                </Badge>
                <Badge variant="info">
                  {data.comparison.filter((c) => c.direction === "stable").length} مستقر
                </Badge>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التحليل</TableHead>
                    <TableHead className="text-center">{formatDate(data.currentDate)}</TableHead>
                    <TableHead className="text-center">{formatDate(data.previousDate)}</TableHead>
                    <TableHead className="text-center">التغيير</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.comparison.map((row, i) => (
                    <ComparisonTableRow key={`${row.testName}-${i}`} row={row} />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* AI Commentary */}
            <div className="space-y-2">
              {!data.aiCommentary && (
                <Button
                  variant="brand"
                  size="sm"
                  onClick={generateAICommentary}
                  disabled={aiLoading}
                  className="gap-1.5"
                >
                  {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {aiLoading ? "جاري التحليل..." : "تحليل AI للتغييرات"}
                </Button>
              )}
              {data.aiCommentary && (
                <div className="rounded-xl border border-[color:var(--color-brand-pink)]/20 bg-[color:var(--color-brand-pink)]/5 p-4" dir="rtl">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800">
                    <Sparkles className="size-4 text-[color:var(--color-brand-magenta)]" />
                    تعليق الذكاء الاصطناعي
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {data.aiCommentary}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Empty state */}
        {!data && !loading && !error && (
          <p className="text-center text-sm text-gray-500 py-4">
            اختر تحليل سابق من القائمة أعلاه لبدء المقارنة
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ComparisonTableRow({ row }: { row: ComparisonRow }) {
  const config = directionConfig[row.direction];
  const Icon = config.icon;

  return (
    <TableRow className={cn(config.bg)}>
      <TableCell className="font-semibold text-gray-900">{row.testName}</TableCell>
      <TableCell className="text-center tabular-nums">
        {row.current ? (
          <span className={cn(
            "font-bold",
            row.current.flag?.includes("critical") ? "text-rose-600"
            : row.current.flag?.includes("high") || row.current.flag?.includes("low") ? "text-amber-600"
            : "text-gray-900",
          )}>
            {row.current.value} <span className="text-xs text-gray-500">{row.current.unit}</span>
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </TableCell>
      <TableCell className="text-center tabular-nums">
        {row.previous ? (
          <span className="text-gray-700">
            {row.previous.value} <span className="text-xs text-gray-500">{row.previous.unit}</span>
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        {row.percentChange != null ? (
          <span className={cn("text-sm font-bold tabular-nums", config.color)}>
            {row.percentChange > 0 ? "+" : ""}{row.percentChange}%
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        <Badge variant={config.badge} className="gap-1 text-[10px]">
          <Icon className="size-3" />
          {config.label}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
