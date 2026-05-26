"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireSession } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import {
  profileUpdateSchema,
  type ProfileUpdateInput,
} from "@/lib/validations/settings";

export type SettingsActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Update the current user's profile fields (name, specialty, license).
 *
 * Does NOT update email (that requires Better-Auth's verify-email flow)
 * or role (admin-only operation).
 */
export async function updateProfile(
  raw: unknown,
): Promise<SettingsActionResult> {
  const session = await requireSession();
  if (!session.ok) {
    return { ok: false, error: "You must be signed in." };
  }
  const user = session.user;

  const parsed = profileUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { ok: false, error: "Please correct the fields.", fieldErrors };
  }

  const input: ProfileUpdateInput = parsed.data;

  try {
    await db
      .update(users)
      .set({
        name: input.name.trim(),
        specialty: input.specialty?.trim() || null,
        licenseNumber: input.licenseNumber?.trim() || null,
      })
      .where(eq(users.id, user.id));

    await logAudit({
      actorId: user.id,
      action: "patient.update", // reuse closest existing action; TODO: add "user.update"
      resourceType: "user",
      resourceId: user.id,
      metadata: {
        fields: ["name", "specialty", "licenseNumber"],
      },
    });

    revalidatePath("/settings");
    revalidatePath("/"); // sidebar shows user name

    return { ok: true };
  } catch (err) {
    console.error("[settings.updateProfile] failed", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unexpected error",
    };
  }
}
