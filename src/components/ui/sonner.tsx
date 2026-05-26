"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Global toast notifications for MediSoft C-OS.
 *
 * Usage:
 *   import { toast } from "sonner";
 *   toast.success("Patient record saved");
 *   toast.error("Failed to sign in");
 *
 * Mount once at the root layout. The styling matches the MediSoft
 * brand surface tokens.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] text-[color:var(--color-foreground)] shadow-lg",
          description: "text-[color:var(--color-muted-foreground)]",
          actionButton:
            "bg-[color:var(--color-brand-pink)] text-white",
          cancelButton:
            "bg-[color:var(--color-muted)] text-[color:var(--color-muted-foreground)]",
        },
      }}
    />
  );
}
