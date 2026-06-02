import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { and, or, ilike, isNull, sql } from "drizzle-orm";
import { calculateAge } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * GET /api/patients/search?q=<query>&limit=10
 * Search patients by name, MRN, or Saudi ID.
 * Returns a simplified patient list for the PatientSelector component.
 */
export async function GET(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10", 10), 50);

  if (query.length < 2) {
    return NextResponse.json({ patients: [] });
  }

  try {
    const searchPattern = `%${query}%`;

    const results = await db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        firstNameAr: patients.firstNameAr,
        lastNameAr: patients.lastNameAr,
        dateOfBirth: patients.dateOfBirth,
        sex: patients.sex,
        mrn: patients.mrn,
        bloodType: patients.bloodType,
        allergies: patients.allergies,
        chronicConditions: patients.chronicConditions,
        insuranceProvider: patients.insuranceProvider,
      })
      .from(patients)
      .where(
        and(
          isNull(patients.deletedAt),
          or(
            ilike(patients.firstName, searchPattern),
            ilike(patients.lastName, searchPattern),
            ilike(patients.firstNameAr, searchPattern),
            ilike(patients.lastNameAr, searchPattern),
            ilike(patients.mrn, searchPattern),
            ilike(patients.saudiId, searchPattern),
            ilike(patients.phone, searchPattern),
          )
        )
      )
      .limit(limit);

    const mapped = results.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      firstNameAr: p.firstNameAr,
      lastNameAr: p.lastNameAr,
      age: calculateAge(p.dateOfBirth),
      sex: p.sex,
      mrn: p.mrn,
      bloodType: p.bloodType,
      allergies: p.allergies ?? [],
      chronicConditions: p.chronicConditions ?? [],
      insuranceProvider: p.insuranceProvider,
    }));

    return NextResponse.json({ patients: mapped });
  } catch (err) {
    console.error("[patients/search] Error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
