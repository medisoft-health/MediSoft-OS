"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Micro-Interactions — Subtle animations that provide feedback
 * and delight without disrupting clinical workflow.
 */

/**
 * FadeIn — Smooth entrance animation for elements.
 */
export function FadeIn({
  children,
  delay = 0,
  duration = 300,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

/**
 * StaggeredList — Animates children one by one with staggered delays.
 */
export function StaggeredList({
  children,
  staggerDelay = 50,
  className,
}: {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <FadeIn delay={index * staggerDelay}>{child}</FadeIn>
      ))}
    </div>
  );
}

/**
 * PulseOnChange — Briefly pulses when value changes (for vitals).
 */
export function PulseOnChange({
  value,
  children,
  className,
}: {
  value: string | number;
  children: React.ReactNode;
  className?: string;
}) {
  const [isPulsing, setIsPulsing] = React.useState(false);
  const prevValue = React.useRef(value);

  React.useEffect(() => {
    if (prevValue.current !== value) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 600);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <div
      className={cn(
        "transition-all duration-300",
        isPulsing && "scale-105 ring-2 ring-blue-400/50 rounded-lg",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * ProcessingIndicator — Shows that Medical Intelligence is analyzing.
 * Used in MediScan, MediLab, and MediBot.
 */
export function ProcessingIndicator({
  label = "Analyzing",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl",
        "bg-gradient-to-r from-blue-50 to-indigo-50",
        "dark:from-blue-950/30 dark:to-indigo-950/30",
        "border border-blue-100 dark:border-blue-800",
        className
      )}
    >
      {/* Animated brain/pulse icon */}
      <div className="relative size-8">
        <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping" />
        <div className="relative flex items-center justify-center size-8 rounded-full bg-blue-500/10">
          <svg
            className="size-4 text-blue-600 dark:text-blue-400 animate-pulse"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
            />
          </svg>
        </div>
      </div>

      <div className="flex-1">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
          {label}
        </p>
        <div className="flex gap-1 mt-1.5">
          <div className="h-1 w-8 rounded-full bg-blue-300 dark:bg-blue-600 animate-pulse" />
          <div
            className="h-1 w-6 rounded-full bg-blue-200 dark:bg-blue-700 animate-pulse"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="h-1 w-10 rounded-full bg-blue-300 dark:bg-blue-600 animate-pulse"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * SuccessCheckmark — Animated checkmark for completed actions.
 */
export function SuccessCheckmark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center size-12 rounded-full",
        "bg-emerald-100 dark:bg-emerald-900/30",
        className
      )}
    >
      <svg
        className="size-6 text-emerald-600 dark:text-emerald-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 13l4 4L19 7"
          className="animate-draw-check"
          style={{
            strokeDasharray: 24,
            strokeDashoffset: 24,
            animation: "drawCheck 0.4s ease-out 0.2s forwards",
          }}
        />
      </svg>
    </div>
  );
}

/**
 * SkeletonCard — Loading placeholder for clinical cards.
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 dark:border-slate-700 p-4 animate-pulse",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="size-4 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="h-8 w-16 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
      <div className="h-2 w-24 rounded bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}
