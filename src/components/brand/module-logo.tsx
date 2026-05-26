/**
 * Module logo images for the sidebar and page headers.
 *
 * Maps each module key to its real brand logo in public/brand/.
 * Used by the sidebar nav and by each module's landing page.
 */

export const MODULE_LOGOS = {
  mediscript: "/brand/medisoft-mediscript.png",
  pharmax: "/brand/medisoft-pharmax.png",
  medilab: "/brand/medisoft-medilab.png",
  mediscan: "/brand/medisoft-mediscan.png",
} as const;

export type ModuleKey = keyof typeof MODULE_LOGOS;

interface ModuleLogoProps {
  module: ModuleKey;
  /** Height in the sidebar (default 20px). Use a larger value for page headers. */
  height?: number;
  className?: string;
}

/**
 * Renders the real brand logo for a clinical module.
 *
 * Usage:
 *   <ModuleLogo module="mediscript" />               — sidebar (20px)
 *   <ModuleLogo module="mediscript" height={40} />   — page header
 */
export function ModuleLogo({ module, height = 20, className }: ModuleLogoProps) {
  const src = MODULE_LOGOS[module];
  const label =
    module === "mediscript"
      ? "MediScript"
      : module === "pharmax"
        ? "PharmaX"
        : module === "medilab"
          ? "MediLab"
          : "MediScan";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label}
      height={height}
      style={{ height, width: "auto" }}
      className={className}
      draggable={false}
    />
  );
}
