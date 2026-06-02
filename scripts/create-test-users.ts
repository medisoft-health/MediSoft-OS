/**
 * Create test user accounts for MediSoft C-OS.
 *
 * Usage: npx tsx scripts/create-test-users.ts
 *
 * This script uses the Better-Auth signup endpoint directly.
 */

const BASE_URL = process.env.BETTER_AUTH_URL || "http://localhost:3000";

interface TestUser {
  name: string;
  email: string;
  password: string;
  role: string;
  specialty?: string;
}

const TEST_USERS: TestUser[] = [
  // Doctors
  {
    name: "Dr. Hamada Ghaith",
    email: "hamada@medisofthealth.com",
    password: "MediSoft2024!",
    role: "admin",
    specialty: "General Practice",
  },
  {
    name: "Dr. Ahmed Hassan",
    email: "ahmed@medisofthealth.com",
    password: "MediTest2024!",
    role: "physician",
    specialty: "Internal Medicine",
  },
  {
    name: "Dr. Sara Mohamed",
    email: "sara@medisofthealth.com",
    password: "MediTest2024!",
    role: "physician",
    specialty: "Pediatrics",
  },
  {
    name: "Dr. Omar Ali",
    email: "omar@medisofthealth.com",
    password: "MediTest2024!",
    role: "physician",
    specialty: "Cardiology",
  },
  {
    name: "Dr. Fatima Khalid",
    email: "fatima@medisofthealth.com",
    password: "MediTest2024!",
    role: "physician",
    specialty: "Dermatology",
  },
  // Test friends
  {
    name: "Demo Doctor",
    email: "demo@medisofthealth.com",
    password: "DemoAccess2024!",
    role: "physician",
    specialty: "General Practice",
  },
  {
    name: "Test Physician",
    email: "test@medisofthealth.com",
    password: "TestAccess2024!",
    role: "physician",
    specialty: "Orthopedics",
  },
];

async function createUser(user: TestUser) {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: user.name,
        email: user.email,
        password: user.password,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Created: ${user.name} (${user.email})`);
      return true;
    } else {
      if (data?.message?.includes("already exists") || data?.code === "USER_ALREADY_EXISTS") {
        console.log(`⚠️  Already exists: ${user.name} (${user.email})`);
        return true;
      }
      console.log(`❌ Failed: ${user.name} — ${JSON.stringify(data)}`);
      return false;
    }
  } catch (err) {
    console.log(`❌ Error: ${user.name} — ${err}`);
    return false;
  }
}

async function main() {
  console.log("🏥 MediSoft C-OS — Creating Test Users");
  console.log(`   Base URL: ${BASE_URL}`);
  console.log("─".repeat(50));

  let created = 0;
  for (const user of TEST_USERS) {
    const ok = await createUser(user);
    if (ok) created++;
  }

  console.log("─".repeat(50));
  console.log(`\n✅ Done: ${created}/${TEST_USERS.length} users ready.\n`);

  console.log("📋 Test Credentials:");
  console.log("─".repeat(50));
  for (const user of TEST_USERS) {
    console.log(`   ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${user.password}`);
    console.log(`   Role: ${user.role} | Specialty: ${user.specialty || "N/A"}`);
    console.log("");
  }
}

main();
