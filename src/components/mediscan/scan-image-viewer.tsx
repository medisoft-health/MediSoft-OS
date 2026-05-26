"use client";

import * as React from "react";
import {
  Circle as CircleIcon,
  MousePointer2,
  MoveRight,
  Square as SquareIcon,
  Trash2,
  Type as TypeIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Annotation } from "@/lib/validations/scan";
import { cn } from "@/lib/utils";

/**
 * Image viewer with overlay annotation canvas.
 *
 * Features:
 *   - Pan (drag with select-tool active) + zoom (buttons + scroll wheel)
 *   - Draw rectangle / circle / arrow / text label
 *   - Annotations stored in normalized 0..1 coordinates so they scale
 *     correctly across zoom / window resize
 *   - Read-only mode for the detail page (`readOnly` prop)
 *
 * Stack: pure React + HTMLCanvasElement. No cornerstone, no third-party
 * deps. Bundles in ~6 KB of new JS.
 */

interface Props {
  imageUrl: string;
  /** Annotation state — controlled by the parent so they can be saved. */
  annotations: Annotation[];
  onChange?: (next: Annotation[]) => void;
  readOnly?: boolean;
  /** Optional aspect ratio cap; defaults to 4:3. */
  maxHeight?: number;
}

type Tool = "select" | "rect" | "circle" | "arrow" | "label";

const TOOLS: { id: Tool; label: string; icon: React.ElementType }[] = [
  { id: "select", label: "Pan / Select", icon: MousePointer2 },
  { id: "rect", label: "Rectangle", icon: SquareIcon },
  { id: "circle", label: "Circle", icon: CircleIcon },
  { id: "arrow", label: "Arrow", icon: MoveRight },
  { id: "label", label: "Label", icon: TypeIcon },
];

const COLORS = ["#E84A8A", "#1E3A8C", "#10B981", "#F5A04A", "#FFFFFF"];

const uid = () => Math.random().toString(36).slice(2, 10);

export function ScanImageViewer({
  imageUrl,
  annotations,
  onChange,
  readOnly,
  maxHeight = 540,
}: Props) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const [tool, setTool] = React.useState<Tool>("select");
  const [color, setColor] = React.useState<string>(COLORS[0]);
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // Drawing in-progress (in normalized coords).
  const [draft, setDraft] = React.useState<Annotation | null>(null);
  const drawingRef = React.useRef(false);
  const startRef = React.useRef<{ x: number; y: number } | null>(null);

  // Track image natural dimensions for normalized coord conversion.
  const [natural, setNatural] = React.useState<{ w: number; h: number } | null>(null);
  const [imgLoaded, setImgLoaded] = React.useState(false);

  // Layout: container width drives canvas size; aspect ratio from image.
  const [containerW, setContainerW] = React.useState(800);
  React.useEffect(() => {
    function measure() {
      if (wrapRef.current) setContainerW(wrapRef.current.clientWidth);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const aspect = natural ? natural.h / natural.w : 0.75;
  const baseHeight = Math.min(containerW * aspect, maxHeight);
  const displayW = containerW;
  const displayH = baseHeight;

  // ── Draw the annotations canvas ─────────────────────────────────
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgLoaded) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, displayW, displayH);

    const all = draft ? [...annotations, draft] : annotations;
    for (const a of all) {
      drawAnnotation(ctx, a, displayW, displayH, a.id === selectedId);
    }
  }, [annotations, draft, displayW, displayH, imgLoaded, selectedId]);

  // ── Helpers ─────────────────────────────────────────────────────
  function eventToNorm(
    e: React.MouseEvent<HTMLCanvasElement> | React.PointerEvent<HTMLCanvasElement>,
  ): { x: number; y: number } {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  }

  function commitDraft(d: Annotation) {
    if (!onChange) return;
    onChange([...annotations, d]);
  }

  function removeAnnotation(id: string) {
    if (!onChange) return;
    onChange(annotations.filter((a) => a.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function pickAt(x: number, y: number): string | null {
    // Find topmost annotation at (x,y). Reverse order for "click on top".
    for (let i = annotations.length - 1; i >= 0; i--) {
      const a = annotations[i];
      if (a.kind === "rect" && a.w != null && a.h != null) {
        if (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) return a.id;
      } else if (a.kind === "circle" && a.w != null && a.h != null) {
        const cx = a.x + a.w / 2;
        const cy = a.y + a.h / 2;
        const rx = a.w / 2 || 0.001;
        const ry = a.h / 2 || 0.001;
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) return a.id;
      } else if (a.kind === "arrow" && a.x2 != null && a.y2 != null) {
        // Hit-test along the line within a small tolerance.
        const dist = pointToSegment(x, y, a.x, a.y, a.x2, a.y2);
        if (dist < 0.01) return a.id;
      } else if (a.kind === "label") {
        if (Math.abs(x - a.x) < 0.05 && Math.abs(y - a.y) < 0.04) return a.id;
      }
    }
    return null;
  }

  // ── Pointer handlers ────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = eventToNorm(e);
    if (tool === "select") {
      const hit = pickAt(p.x, p.y);
      setSelectedId(hit);
      return;
    }
    if (tool === "label") {
      const text = window.prompt("Label text:")?.trim();
      if (!text) return;
      commitDraft({
        id: uid(),
        kind: "label",
        x: p.x,
        y: p.y,
        text,
        color,
      });
      return;
    }
    drawingRef.current = true;
    startRef.current = p;
    setDraft({
      id: uid(),
      kind: tool,
      x: p.x,
      y: p.y,
      w: tool === "arrow" ? undefined : 0,
      h: tool === "arrow" ? undefined : 0,
      x2: tool === "arrow" ? p.x : undefined,
      y2: tool === "arrow" ? p.y : undefined,
      color,
    });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly || !drawingRef.current || !startRef.current) return;
    const p = eventToNorm(e);
    setDraft((d) => {
      if (!d) return d;
      if (d.kind === "arrow") {
        return { ...d, x2: p.x, y2: p.y };
      }
      // rect/circle — anchor at start, extend to current.
      const sx = Math.min(startRef.current!.x, p.x);
      const sy = Math.min(startRef.current!.y, p.y);
      return {
        ...d,
        x: sx,
        y: sy,
        w: Math.abs(p.x - startRef.current!.x),
        h: Math.abs(p.y - startRef.current!.y),
      };
    });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (!drawingRef.current || !draft) {
      drawingRef.current = false;
      return;
    }
    drawingRef.current = false;
    // Discard zero-size shapes.
    const tooSmall =
      (draft.kind !== "arrow" && (draft.w ?? 0) < 0.005 && (draft.h ?? 0) < 0.005) ||
      (draft.kind === "arrow" &&
        Math.hypot(
          (draft.x2 ?? draft.x) - draft.x,
          (draft.y2 ?? draft.y) - draft.y,
        ) < 0.005);
    if (!tooSmall) {
      commitDraft(draft);
    }
    setDraft(null);
    startRef.current = null;
  };

  // ── Zoom & pan ──────────────────────────────────────────────────
  function zoomIn() {
    setZoom((z) => Math.min(5, +(z * 1.25).toFixed(2)));
  }
  function zoomOut() {
    setZoom((z) => Math.max(0.25, +(z / 1.25).toFixed(2)));
  }
  function reset() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  // Drag-to-pan only when select tool is active.
  const panDragRef = React.useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  const onContainerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (tool !== "select" || readOnly) return;
    if (e.target instanceof HTMLCanvasElement) return; // canvas owns it
    panDragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  };
  const onContainerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panDragRef.current) return;
    const dx = e.clientX - panDragRef.current.x;
    const dy = e.clientY - panDragRef.current.y;
    setPan({ x: panDragRef.current.px + dx, y: panDragRef.current.py + dy });
  };
  const onContainerPointerUp = () => {
    panDragRef.current = null;
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-2">
          <div role="group" className="flex overflow-hidden rounded-lg border border-[color:var(--color-border)]">
            {TOOLS.map((t) => {
              const Icon = t.icon;
              const active = tool === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTool(t.id)}
                  title={t.label}
                  aria-pressed={active}
                  className={cn(
                    "grid h-9 w-9 place-items-center transition-colors",
                    active
                      ? "bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]"
                      : "text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]",
                  )}
                >
                  <Icon className="size-4" />
                </button>
              );
            })}
          </div>
          <div className="h-6 w-px bg-[color:var(--color-border)]" />
          <div className="flex items-center gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                title={c}
                className={cn(
                  "size-6 rounded-full border-2 transition-transform",
                  color === c ? "scale-110 border-[color:var(--color-foreground)]" : "border-[color:var(--color-border)]",
                )}
                style={{ background: c }}
              />
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={zoomOut} title="Zoom out">
              <ZoomOut className="size-4" />
            </Button>
            <span className="w-12 text-center text-xs tabular-nums text-[color:var(--color-muted-foreground)]">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="icon" onClick={zoomIn} title="Zoom in">
              <ZoomIn className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={reset} title="Reset view">
              <RotateCcw className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Canvas stage */}
      <div
        ref={wrapRef}
        className="relative overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-muted)]"
        style={{ touchAction: "none" }}
        onPointerDown={onContainerPointerDown}
        onPointerMove={onContainerPointerMove}
        onPointerUp={onContainerPointerUp}
        onPointerCancel={onContainerPointerUp}
      >
         <div
          style={{
            width: displayW,
            height: displayH,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: panDragRef.current ? "none" : "transform .15s ease",
          }}
          className="relative"
        >
          {/* Loading indicator before image loads */}
          {!imgLoaded && (
            <div
              className="absolute inset-0 z-0 flex items-center justify-center text-sm text-[color:var(--color-muted-foreground)]"
              style={{ width: displayW, height: displayH }}
            >
              Loading image…
            </div>
          )}
          {/*
            Intentionally a raw <img>, not next/image.
            The src is either a browser blob URL (URL.createObjectURL) for
            unsaved uploads, or a short-lived Supabase signed URL — neither
            is a static or CDN-friendly asset, so next/image's optimizer
            would either fail to fetch them or leak the signed URL through
            its proxy cache. The medical-imaging context also requires
            pixel-perfect rendering with no recompression.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Scan"
            draggable={false}
            onLoad={(e) => {
              const t = e.currentTarget;
              setNatural({ w: t.naturalWidth, h: t.naturalHeight });
              setImgLoaded(true);
              console.log(`[scan-viewer] Image loaded: ${t.naturalWidth}x${t.naturalHeight}`);
            }}
            onError={() => {
              console.error("[scan-viewer] Image failed to load:", imageUrl?.slice(0, 80));
            }}
            className="relative z-0 block select-none object-contain"
            style={{ width: displayW, height: displayH, maxWidth: "100%", maxHeight: "100%" }}
          />
          <canvas
            ref={canvasRef}
            className={cn(
              "absolute inset-0 z-10",
              tool === "select"
                ? readOnly
                  ? "cursor-default"
                  : "cursor-grab"
                : "cursor-crosshair",
            )}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>
      </div>

      {/* Annotation list */}
      {annotations.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
            Annotations ({annotations.length})
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {annotations.map((a) => (
              <li
                key={a.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-2 text-xs",
                  selectedId === a.id && "ring-2 ring-[color:var(--color-brand-pink)]",
                )}
                onClick={() => setSelectedId(a.id)}
              >
                <span
                  className="size-3 shrink-0 rounded-full border"
                  style={{ background: a.color }}
                />
                <span className="capitalize">{a.kind}</span>
                {a.text && (
                  <span className="truncate text-[color:var(--color-muted-foreground)]">
                    {a.text}
                  </span>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAnnotation(a.id);
                    }}
                    className="ml-auto grid size-6 place-items-center rounded text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-destructive)]"
                    aria-label={`Remove ${a.kind}`}
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Canvas drawing helpers
// ─────────────────────────────────────────────────────────────────
function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  a: Annotation,
  w: number,
  h: number,
  selected: boolean,
) {
  ctx.strokeStyle = a.color;
  ctx.fillStyle = a.color;
  ctx.lineWidth = selected ? 3 : 2;

  if (a.kind === "rect" && a.w != null && a.h != null) {
    ctx.strokeRect(a.x * w, a.y * h, a.w * w, a.h * h);
  } else if (a.kind === "circle" && a.w != null && a.h != null) {
    const cx = (a.x + a.w / 2) * w;
    const cy = (a.y + a.h / 2) * h;
    const rx = (a.w / 2) * w;
    const ry = (a.h / 2) * h;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (a.kind === "arrow" && a.x2 != null && a.y2 != null) {
    const x1 = a.x * w;
    const y1 = a.y * h;
    const x2 = a.x2 * w;
    const y2 = a.y2 * h;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    // arrowhead
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const head = 12;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - head * Math.cos(angle - Math.PI / 6),
      y2 - head * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      x2 - head * Math.cos(angle + Math.PI / 6),
      y2 - head * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fill();
  } else if (a.kind === "label" && a.text) {
    ctx.font = "bold 14px Inter, system-ui, sans-serif";
    const text = a.text;
    const metrics = ctx.measureText(text);
    const padX = 8;
    const padY = 4;
    const lineH = 18;
    const tx = a.x * w;
    const ty = a.y * h;
    // background pill
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(tx, ty - lineH, metrics.width + padX * 2, lineH + padY);
    ctx.fillStyle = a.color;
    ctx.fillText(text, tx + padX, ty - 6);
  }
}

function pointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const fx = x1 + t * dx;
  const fy = y1 + t * dy;
  return Math.hypot(px - fx, py - fy);
}
