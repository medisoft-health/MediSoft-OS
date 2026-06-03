import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware navigation primitives.
 * Use these instead of next/navigation for locale switching.
 */
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
