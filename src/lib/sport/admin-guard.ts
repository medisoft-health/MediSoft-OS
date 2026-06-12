/**
 * MediSport — Platform Admin Guard
 * --------------------------------
 * The MediSport coach-verification console is restricted to a SINGLE
 * platform owner account. Beyond the database `role = 'admin'` flag, we
 * pin the allowed admin to a specific email so that accidentally (or
 * maliciously) flipping someone's `role` to `admin` is NOT sufficient to
 * reach the admin console or admin APIs.
 *
 * The list is configurable via the `MEDISPORT_ADMIN_EMAILS` env var
 * (comma-separated) but defaults to the owner account. Comparison is
 * case-insensitive and trims whitespace.
 */

const DEFAULT_ADMIN_EMAILS = ["medisoft2022@gmail.com"];

/** Secret, hard-to-guess slug for the private admin entry route. */
export const ADMIN_CONSOLE_SLUG = "console-x7k2";

function allowedAdminEmails(): string[] {
  const raw = process.env.MEDISPORT_ADMIN_EMAILS;
  const list =
    raw && raw.trim().length > 0
      ? raw.split(",").map((s) => s.trim()).filter(Boolean)
      : DEFAULT_ADMIN_EMAILS;
  return list.map((e) => e.toLowerCase());
}

/**
 * Returns true only when the user is BOTH role=admin AND on the
 * allow-list of platform-admin emails. This is the single source of
 * truth for "is this the platform owner".
 */
export function isPlatformAdmin(
  user: { role?: string | null; email?: string | null } | null | undefined,
): boolean {
  if (!user) return false;
  if (user.role !== "admin") return false;
  const email = (user.email ?? "").trim().toLowerCase();
  if (!email) return false;
  return allowedAdminEmails().includes(email);
}
