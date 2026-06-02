"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Landing Page Animation Wrappers — Adds smooth entrance animations
 * and glassmorphism effects to the 3-portal landing page.
 */

export function AnimatedPortalCard({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={cn(
        "transition-all duration-700 ease-out",
        visible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-8 scale-95",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Floating particles background for the landing page.
 */
export function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient orbs */}
      <div className="absolute top-20 start-10 size-72 rounded-full bg-gradient-to-br from-pink-400/10 to-purple-400/10 blur-3xl animate-float-slow" />
      <div className="absolute bottom-20 end-10 size-96 rounded-full bg-gradient-to-br from-blue-400/10 to-cyan-400/10 blur-3xl animate-float-slow-reverse" />
      <div className="absolute top-1/2 start-1/3 size-48 rounded-full bg-gradient-to-br from-emerald-400/5 to-teal-400/5 blur-2xl animate-float-medium" />
    </div>
  );
}

/**
 * Animated Logo Reveal for the landing page header.
 */
export function LogoReveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <div
      className={cn(
        "transition-all duration-1000 ease-out",
        visible ? "opacity-100 scale-100" : "opacity-0 scale-90",
        className
      )}
    >
      {children}
    </div>
  );
}
