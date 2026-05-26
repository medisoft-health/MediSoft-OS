import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names with conflict resolution.
 * @example cn("px-2 py-1", isActive && "bg-primary", "px-4") // → "py-1 bg-primary px-4"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date for clinical displays (e.g. "18 May 2026").
 */
export function formatClinicalDate(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format a patient ID with the MS- prefix used across MediSoft.
 */
export function formatPatientId(id: number | string): string {
  return `MS-${String(id).padStart(6, "0")}`;
}

/**
 * Calculate patient age from date of birth.
 */
export function calculateAge(dob: Date | string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

/**
 * Initials from a full name (e.g. "Sarah Mansour" → "SM").
 */
export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
