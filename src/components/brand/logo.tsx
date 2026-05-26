import { cn } from "@/lib/utils";

interface LogoProps {
  /** Variant: `mark` is the geometric icon only; `lockup` is full logo with text. */
  variant?: "mark" | "lockup";
  className?: string;
  /** Accessible label */
  label?: string;
}

/**
 * The MediSoft brand logo — uses the real brand assets from
 * public/brand/ (transparent PNGs generated from the original
 * logo files).
 *
 * Two variants:
 *   - `mark`: the colorful geometric cube icon only (for collapsed sidebar, favicons)
 *   - `lockup`: full "MediSoft - Inspiring Minds" logo with text (for expanded sidebar, login)
 */
export function Logo({
  variant = "mark",
  className,
  label = "MediSoft",
}: LogoProps) {
  if (variant === "lockup") {
    return (
      <span
        role="img"
        aria-label={label}
        className={cn("inline-flex items-center", className)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/medisoft-full.png"
          srcSet="/brand/medisoft-full@2x.png 2x"
          alt={label}
          className="h-9 w-auto"
          width={160}
          height={36}
          draggable={false}
        />
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={label}
      className={cn("inline-block", className)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/medisoft-mark.png"
        srcSet="/brand/medisoft-mark@2x.png 2x"
        alt={label}
        className="size-full object-contain"
        width={32}
        height={32}
        draggable={false}
      />
    </span>
  );
}
