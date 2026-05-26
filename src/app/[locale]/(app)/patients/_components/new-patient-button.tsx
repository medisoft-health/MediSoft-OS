"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewPatientSheet } from "./new-patient-sheet";

interface Props {
  label?: string;
  variant?: "brand" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * The single source of truth for opening the New Patient sheet.
 * Used in the topbar (via dashboard-layout) and on the patient list page.
 */
export function NewPatientButton({
  label = "+ New patient",
  variant = "brand",
  size = "sm",
  className,
}: Props) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        {label === "+ New patient" ? (
          <>
            <Plus className="size-4" />
            New patient
          </>
        ) : (
          label
        )}
      </Button>
      <NewPatientSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
