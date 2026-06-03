"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/**
 * Command palette primitive (Cmd+K). Built on the `cmdk` library plus
 * MediSoft styling.
 *
 * Two usage patterns:
 *   1) Inline: <Command>...</Command>
 *   2) Dialog: <CommandDialog open={...} onOpenChange={...}>...</CommandDialog>
 */
export const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(function Command({ className, ...props }, ref) {
  return (
    <CommandPrimitive
      ref={ref}
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-xl bg-[color:var(--color-card)] text-[color:var(--color-foreground)]",
        className,
      )}
      {...props}
    />
  );
});

interface CommandDialogProps extends React.ComponentProps<typeof Dialog> {
  /** Override the dialog content className (e.g. width). */
  contentClassName?: string;
  children: React.ReactNode;
}

export function CommandDialog({
  children,
  contentClassName,
  ...props
}: CommandDialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent
        hideClose
        className={cn("max-w-xl overflow-hidden p-0", contentClassName)}
      >
        <Command className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[color:var(--color-muted-foreground)] [&_[cmdk-input-wrapper]_svg]:size-4 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]_svg]:size-4">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(function CommandInput({ className, ...props }, ref) {
  return (
    <div className="flex items-center gap-2 border-b border-[color:var(--color-border)] px-3" cmdk-input-wrapper="">
      <Search className="size-4 shrink-0 text-[color:var(--color-muted-foreground)]" />
      <CommandPrimitive.Input
        ref={ref}
        className={cn(
          "flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-[color:var(--color-muted-foreground)] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    </div>
  );
});

export const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(function CommandList({ className, ...props }, ref) {
  return (
    <CommandPrimitive.List
      ref={ref}
      className={cn(
        "max-h-[400px] overflow-y-auto overflow-x-hidden p-1",
        className,
      )}
      {...props}
    />
  );
});

export const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>(function CommandEmpty(props, ref) {
  return (
    <CommandPrimitive.Empty
      ref={ref}
      className="py-8 text-center text-sm text-[color:var(--color-muted-foreground)]"
      {...props}
    />
  );
});

export const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(function CommandGroup({ className, ...props }, ref) {
  return (
    <CommandPrimitive.Group
      ref={ref}
      className={cn("overflow-hidden p-1 text-[color:var(--color-foreground)]", className)}
      {...props}
    />
  );
});

export const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(function CommandSeparator({ className, ...props }, ref) {
  return (
    <CommandPrimitive.Separator
      ref={ref}
      className={cn("-mx-1 h-px bg-[color:var(--color-border)]", className)}
      {...props}
    />
  );
});

export const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(function CommandItem({ className, ...props }, ref) {
  return (
    <CommandPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none",
        "data-[selected=true]:bg-[color:var(--color-brand-pink)]/10 data-[selected=true]:text-[color:var(--color-brand-magenta)]",
        "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

export function CommandShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "ms-auto text-xs tracking-widest text-[color:var(--color-muted-foreground)]",
        className,
      )}
      {...props}
    />
  );
}
