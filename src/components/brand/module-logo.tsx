/**
 * Module logo images for the sidebar and page headers.
 *
 * Maps each module key to its real brand logo in public/brand/.
 * Used by the sidebar nav and by each module's landing page.
 */

/** Full logos (with icons) for page headers and dashboard cards */
export const MODULE_LOGOS = {
  mediscript: "/brand/medisoft-mediscript.png",
  pharmax: "/brand/medisoft-pharmax.png",
  medilab: "/brand/medisoft-medilab.png",
  mediscan: "/brand/medisoft-mediscan.png",
  medisport: "/brand/medisport-logo.png",
  medident: "/brand/medident-logo.png",
} as const;

/**
 * Sidebar-specific logos: text-only, same height, no decorative icons.
 * These are pre-cropped and normalized so the first letter (M/P) is
 * exactly the same visual height across all four modules.
 */
export const SIDEBAR_LOGOS = {
  mediscript: "/brand/sidebar-mediscript.png",
  pharmax: "/brand/sidebar-pharmax.png",
  medilab: "/brand/sidebar-medilab.png",
  mediscan: "/brand/sidebar-mediscan.png",
  medisport: "/brand/sidebar-medisport.png",
  medident: "/brand/sidebar-medident.png",
} as const;

export type ModuleKey = keyof typeof MODULE_LOGOS;

interface ModuleLogoProps {
  module: ModuleKey;
  /** Rendered height in px. */
  height?: number;
  /** Max width constraint (px). Prevents wider logos from overflowing. */
  maxWidth?: number;
  /** When true, uses the sidebar-specific (text-only, normalized) logo. */
  sidebarMode?: boolean;
  className?: string;
}

/**
 * Renders the real brand logo for a clinical module.
 *
 * In `sidebarMode`, uses pre-cropped text-only versions where all logos
 * have identical text height. Without sidebar mode (e.g. page headers),
 * renders the full logo with decorative icons.
 */
export function ModuleLogo({
  module,
  height = 20,
  maxWidth,
  sidebarMode = false,
  className,
}: ModuleLogoProps) {
  const src = sidebarMode ? SIDEBAR_LOGOS[module] : MODULE_LOGOS[module];
  const label =
    module === "mediscript"
      ? "MediScript"
      : module === "pharmax"
        ? "PharmaX"
        : module === "medilab"
          ? "MediLab"
          : module === "medisport"
            ? "MediSport"
            : module === "medident"
              ? "MediDent"
              : "MediScan";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label}
      height={height}
      style={{
        height: height,
        width: "auto",
        ...(maxWidth ? { maxWidth, objectFit: "contain" as const } : {}),
      }}
      className={className}
      draggable={false}
    />
  );
}
