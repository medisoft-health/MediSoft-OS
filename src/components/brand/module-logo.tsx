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
  /** Max width constraint (default: none). Useful in the sidebar to prevent overflow. */
  maxWidth?: number;
  className?: string;
}

/**
 * Renders the real brand logo for a clinical module.
 *
 * All four logos share the same native height (120px) so at any given
 * `height` the first letter of each brand name aligns perfectly.
 * Use `maxWidth` in tight containers (e.g. sidebar) so wider logos
 * (MediLab, MediScan with icons) scale down proportionally instead
 * of overflowing.
 *
 * Usage:
 *   <ModuleLogo module="mediscript" />                          — sidebar (20px)
 *   <ModuleLogo module="mediscript" height={20} maxWidth={120} /> — sidebar constrained
 *   <ModuleLogo module="mediscript" height={40} />              — page header
 */
export function ModuleLogo({
  module,
  height = 20,
  maxWidth,
  className,
}: ModuleLogoProps) {
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
      style={{
        height,
        width: "auto",
        ...(maxWidth ? { maxWidth, objectFit: "contain" as const } : {}),
      }}
      className={className}
      draggable={false}
    />
  );
}
