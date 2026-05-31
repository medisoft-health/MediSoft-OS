/**
 * MediSoft C-OS — Database Seed Script
 *
 * Creates demo data so the owner can see the app working immediately
 * after deploy. Run with:
 *
 *   npm run db:seed
 *
 * What it creates:
 *   - 1 admin user (admin@medisoft.sa)
 *   - 1 physician user (dr.sarah@medisoft.sa)
 *   - 3 sample patients with demographics, allergies, and conditions
 *
 * Safe to run multiple times — uses upsert-like checks (skips if
 * email/saudiId already exists).
 *
 * Requires: DATABASE_URL in .env.local (or passed via environment).
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import * as schema from "./schema";
import { randomUUID } from "node:crypto";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required. Add it to .env.local");
  process.exit(1);
}

const conn = postgres(DATABASE_URL, { max: 1, prepare: false });
const db = drizzle(conn, { schema });

const DEMO_PASSWORD = "Medisoft2022!!";

async function main() {
  console.log("🌱 MediSoft seed — starting…\n");

  // ── Admin user ──────────────────────────────────────────────────
  const adminEmail = "medisoft2022@gmail.com";
  const [existingAdmin] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, adminEmail))
    .limit(1);

  let adminId: string;
  if (existingAdmin) {
    adminId = existingAdmin.id;
    console.log(`  ✓ Admin already exists (${adminEmail})`);
  } else {
    const hashedPw = await hashPassword(DEMO_PASSWORD);
    const [admin] = await db
      .insert(schema.users)
      .values({
        email: adminEmail,
        emailVerified: true,
        name: "Hamada Ghaith",
        role: "admin",
        specialty: "Internal Medicine",
        licenseNumber: "SCFHS-ADMIN-001",
        isActive: true,
      })
      .returning({ id: schema.users.id });
    adminId = admin.id;

    // Better-Auth stores the password in the `accounts` table
    await db.insert(schema.accounts).values({
      id: randomUUID(),
      userId: adminId,
      accountId: adminId,
      providerId: "credential",
      password: hashedPw,
    });

    console.log(`  ✓ Created admin: ${adminEmail} / ${DEMO_PASSWORD}`);
  }

  // ── Physician user ──────────────────────────────────────────────
  const physicianEmail = "dr.sarah@medisoft.sa";
  const [existingPhysician] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, physicianEmail))
    .limit(1);

  let physicianId: string;
  if (existingPhysician) {
    physicianId = existingPhysician.id;
    console.log(`  ✓ Physician already exists (${physicianEmail})`);
  } else {
    const hashedPw = await hashPassword(DEMO_PASSWORD);
    const [physician] = await db
      .insert(schema.users)
      .values({
        email: physicianEmail,
        emailVerified: true,
        name: "Dr. Sarah Mansour",
        role: "physician",
        specialty: "Cardiology",
        licenseNumber: "SCFHS-98765",
        isActive: true,
      })
      .returning({ id: schema.users.id });
    physicianId = physician.id;

    await db.insert(schema.accounts).values({
      id: randomUUID(),
      userId: physicianId,
      accountId: physicianId,
      providerId: "credential",
      password: hashedPw,
    });

    console.log(`  ✓ Created physician: ${physicianEmail} / ${DEMO_PASSWORD}`);
  }

  // ── Sample patients ─────────────────────────────────────────────
  const patients = [
    {
      firstName: "Ahmed",
      lastName: "Mostafa",
      firstNameAr: "أحمد",
      lastNameAr: "مصطفى",
      dateOfBirth: "1965-08-14",
      sex: "male" as const,
      bloodType: "O+" as const,
      saudiId: "1087654321",
      phone: "+966501234567",
      email: "ahmed.mostafa@example.com",
      address: { city: "Riyadh", region: "Riyadh", country: "Saudi Arabia" },
      emergencyContact: { name: "Fatima Mostafa", relationship: "Spouse", phone: "+966509876543" },
      insuranceProvider: "Bupa Arabia",
      insuranceId: "BUPA-2026-001",
      allergies: [
        { substance: "Penicillin", reaction: "Rash", severity: "moderate" },
        { substance: "Sulfa drugs", reaction: "Anaphylaxis", severity: "life-threatening" },
      ],
      chronicConditions: [
        { description: "Type 2 diabetes mellitus", icdCode: "5A11", onsetDate: "2018-03-01" },
        { description: "Essential hypertension", icdCode: "BA00", onsetDate: "2015-06-15" },
      ],
      medicalHistory: "Appendectomy 2002. Coronary angioplasty 2022.",
      familyHistory: "Father: MI at 58. Mother: T2DM.",
      socialHistory: "Former smoker (quit 2019). No alcohol. Retired teacher.",
    },
    {
      firstName: "Layla",
      lastName: "Hassan",
      firstNameAr: "ليلى",
      lastNameAr: "حسن",
      dateOfBirth: "1990-03-22",
      sex: "female" as const,
      bloodType: "A+" as const,
      saudiId: "1098765432",
      phone: "+966502345678",
      email: "layla.hassan@example.com",
      address: { city: "Jeddah", region: "Makkah", country: "Saudi Arabia" },
      emergencyContact: { name: "Omar Hassan", relationship: "Brother", phone: "+966503456789" },
      insuranceProvider: "Tawuniya",
      insuranceId: "TWN-2026-045",
      allergies: [
        { substance: "Latex", reaction: "Contact dermatitis", severity: "mild" },
      ],
      chronicConditions: [
        { description: "Asthma, moderate persistent", icdCode: "CA23.0", onsetDate: "2005-09-01" },
      ],
      medicalHistory: "Tonsillectomy age 8. C-section 2020.",
      familyHistory: "Mother: breast cancer at 52 (remission). Father: asthma.",
      socialHistory: "Never smoked. Occasional social gatherings. Software engineer.",
    },
    {
      firstName: "Omar",
      lastName: "Al-Khalidi",
      firstNameAr: "عمر",
      lastNameAr: "الخالدي",
      dateOfBirth: "1978-11-05",
      sex: "male" as const,
      bloodType: "B-" as const,
      saudiId: "1076543210",
      phone: "+966504567890",
      email: "omar.khalidi@example.com",
      address: { city: "Dammam", region: "Eastern Province", country: "Saudi Arabia" },
      emergencyContact: { name: "Nour Al-Khalidi", relationship: "Wife", phone: "+966505678901" },
      insuranceProvider: null,
      insuranceId: null,
      allergies: [],
      chronicConditions: [
        { description: "Chronic kidney disease, stage 3a", icdCode: "GB61.1", onsetDate: "2021-01-10" },
      ],
      medicalHistory: "Right knee arthroscopy 2015. No other surgeries.",
      familyHistory: "Father: CKD stage 5 (on dialysis). Mother: healthy.",
      socialHistory: "Never smoked. No alcohol. Construction project manager.",
    },
  ];

  for (const p of patients) {
    const [existing] = await db
      .select({ id: schema.patients.id })
      .from(schema.patients)
      .where(eq(schema.patients.saudiId, p.saudiId!))
      .limit(1);

    if (existing) {
      console.log(`  ✓ Patient already exists: ${p.firstName} ${p.lastName} (${p.saudiId})`);
      continue;
    }

    const [inserted] = await db
      .insert(schema.patients)
      .values({
        ...p,
        createdById: physicianId,
      })
      .returning({ id: schema.patients.id });

    console.log(
      `  ✓ Created patient: ${p.firstName} ${p.lastName} → MS-${String(inserted.id).padStart(6, "0")}`,
    );
  }

  console.log("\n🏁 Seed complete.\n");
  console.log("  Demo credentials:");
  console.log(`    Admin:     ${adminEmail} / ${DEMO_PASSWORD}`);
  console.log(`    Physician: ${physicianEmail} / ${DEMO_PASSWORD}`);
  console.log("");

  await conn.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
