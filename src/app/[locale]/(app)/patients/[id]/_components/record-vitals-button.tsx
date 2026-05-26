"use client";

import * as React from "react";
import { Activity, Plus } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { VitalsFormSheet } from "./vitals-form-sheet";

interface Props {
  patientId: number;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  label?: string;
  className?: string;
  /** When false, shows the Plus icon instead of Activity. */
  icon?: "activity" | "plus";
}

/** Reusable trigger for the vitals sheet. */
export function RecordVitalsButton({
  patientId,
  variant = "outline",
  size = "sm",
  label = "Record vitals",
  className,
  icon = "activity",
}: Props) {
  const [open, setOpen] = React.useState(false);
  const Icon = icon === "plus" ? Plus : Activity;
  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Icon className="size-4" />
        {label}
      </Button>
      <VitalsFormSheet
        patientId={patientId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
