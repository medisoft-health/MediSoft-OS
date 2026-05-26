import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { encounters, patients, users } from "@/db/schema";

/**
 * Encounter detail query — returns the encounter row plus the joined
 * patient and physician identities used by the read-only detail page.
 */
export async function getEncounterById(id: string) {
  const [row] = await db
    .select({
      encounter: encounters,
      patient: {
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        dateOfBirth: patients.dateOfBirth,
        sex: patients.sex,
        bloodType: patients.bloodType,
      },
      physician: {
        id: users.id,
        name: users.name,
        specialty: users.specialty,
      },
    })
    .from(encounters)
    .innerJoin(patients, eq(encounters.patientId, patients.id))
    .leftJoin(users, eq(encounters.physicianId, users.id))
    .where(and(eq(encounters.id, id), isNull(encounters.deletedAt)))
    .limit(1);

  return row ?? null;
}

export type EncounterDetail = NonNullable<
  Awaited<ReturnType<typeof getEncounterById>>
>;
