/**
 * Seed test users using Drizzle ORM (same DB connection as the app).
 * Usage: npx tsx scripts/seed-users-drizzle.ts
 */
import { randomUUID } from "crypto";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return salt + ":" + derivedKey.toString("hex");
}

const DATABASE_URL = "postgresql://medisoft:R9HskrRxUZBNMHW9KV1W2EHTXGpuGbLg@34.18.169.53:5432/medisoft_db";

const pool = new Pool({ connectionString: DATABASE_URL });

interface TestUser {
  name: string;
  email: string;
  password: string;
  role: string;
  specialty: string;
}

const TEST_USERS: TestUser[] = [
  { name: "Dr. Hamada Ghaith", email: "hamada@medisofthealth.com", password: "MediSoft2024!", role: "admin", specialty: "General Practice" },
  { name: "Dr. Ahmed Hassan", email: "ahmed@medisofthealth.com", password: "MediTest2024!", role: "physician", specialty: "Internal Medicine" },
  { name: "Dr. Sara Mohamed", email: "sara@medisofthealth.com", password: "MediTest2024!", role: "physician", specialty: "Pediatrics" },
  { name: "Dr. Omar Ali", email: "omar@medisofthealth.com", password: "MediTest2024!", role: "physician", specialty: "Cardiology" },
  { name: "Dr. Fatima Khalid", email: "fatima@medisofthealth.com", password: "MediTest2024!", role: "physician", specialty: "Dermatology" },
  { name: "Demo Doctor", email: "demo@medisofthealth.com", password: "DemoAccess2024!", role: "physician", specialty: "General Practice" },
  { name: "Test Physician", email: "test@medisofthealth.com", password: "TestAccess2024!", role: "physician", specialty: "Orthopedics" },
];

async function createUser(client: Pool, user: TestUser) {
  const userId = randomUUID();
  const accountId = randomUUID();
  const hashedPassword = await hashPassword(user.password);

  try {
    // Check if user already exists
    const existing = await client.query("SELECT id FROM users WHERE email = $1", [user.email]);
    if (existing.rows.length > 0) {
      console.log(`⚠️  Already exists: ${user.name} (${user.email})`);
      return true;
    }

    // Insert user
    await client.query(
      `INSERT INTO users (id, email, email_verified, name, role, specialty, is_active, created_at, updated_at)
       VALUES ($1, $2, true, $3, $4, $5, true, NOW(), NOW())`,
      [userId, user.email, user.name, user.role, user.specialty]
    );

    // Insert account (email/password provider)
    await client.query(
      `INSERT INTO accounts (id, user_id, account_id, provider_id, password, created_at, updated_at)
       VALUES ($1, $2, $3, 'credential', $4, NOW(), NOW())`,
      [accountId, userId, userId, hashedPassword]
    );

    console.log(`✅ Created: ${user.name} (${user.email})`);
    return true;
  } catch (err: any) {
    console.log(`❌ Failed: ${user.name} — ${err.message}`);
    return false;
  }
}

async function main() {
  console.log("🏥 MediSoft C-OS — Seeding Test Users");
  console.log("──────────────────────────────────────────────────");

  let created = 0;
  for (const user of TEST_USERS) {
    const ok = await createUser(pool, user);
    if (ok) created++;
  }

  console.log("\n──────────────────────────────────────────────────");
  console.log(`✅ Done: ${created}/${TEST_USERS.length} users ready.`);

  console.log("\n📋 Test Credentials:");
  console.log("──────────────────────────────────────────────────");
  for (const user of TEST_USERS) {
    console.log(`   ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${user.password}`);
    console.log(`   Role: ${user.role} | Specialty: ${user.specialty}`);
    console.log("");
  }

  await pool.end();
}

main().catch(console.error);
