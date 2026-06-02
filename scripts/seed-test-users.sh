#!/bin/bash
# MediSoft C-OS — Seed Test Users directly via PostgreSQL
# Usage: bash scripts/seed-test-users.sh

set -e
source /home/ubuntu/medisoft-app/.env.local

echo "🏥 MediSoft C-OS — Seeding Test Users"
echo "──────────────────────────────────────────────────"

# Better-Auth uses bcrypt-like hashing internally. We'll use the tsx script approach
# to hash passwords using the same algorithm Better-Auth uses.

cd /home/ubuntu/medisoft-app

npx tsx -e "
import { randomUUID } from 'crypto';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Better-Auth uses Scrypt for password hashing
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
  return salt + ':' + derivedKey.toString('hex');
}

interface TestUser {
  name: string;
  email: string;
  password: string;
  role: string;
  specialty: string;
}

const TEST_USERS: TestUser[] = [
  { name: 'Dr. Hamada Ghaith', email: 'hamada@medisofthealth.com', password: 'MediSoft2024!', role: 'admin', specialty: 'General Practice' },
  { name: 'Dr. Ahmed Hassan', email: 'ahmed@medisofthealth.com', password: 'MediTest2024!', role: 'physician', specialty: 'Internal Medicine' },
  { name: 'Dr. Sara Mohamed', email: 'sara@medisofthealth.com', password: 'MediTest2024!', role: 'physician', specialty: 'Pediatrics' },
  { name: 'Dr. Omar Ali', email: 'omar@medisofthealth.com', password: 'MediTest2024!', role: 'physician', specialty: 'Cardiology' },
  { name: 'Dr. Fatima Khalid', email: 'fatima@medisofthealth.com', password: 'MediTest2024!', role: 'physician', specialty: 'Dermatology' },
  { name: 'Demo Doctor', email: 'demo@medisofthealth.com', password: 'DemoAccess2024!', role: 'physician', specialty: 'General Practice' },
  { name: 'Test Physician', email: 'test@medisofthealth.com', password: 'TestAccess2024!', role: 'physician', specialty: 'Orthopedics' },
];

async function createUser(user: TestUser) {
  const userId = randomUUID();
  const accountId = randomUUID();
  const hashedPassword = await hashPassword(user.password);

  try {
    // Check if user already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = \$1', [user.email]);
    if (existing.rows.length > 0) {
      console.log('⚠️  Already exists: ' + user.name + ' (' + user.email + ')');
      return true;
    }

    // Insert user
    await pool.query(
      \`INSERT INTO users (id, email, email_verified, name, role, specialty, is_active, created_at, updated_at)
       VALUES (\$1, \$2, true, \$3, \$4, \$5, true, NOW(), NOW())\`,
      [userId, user.email, user.name, user.role, user.specialty]
    );

    // Insert account (email/password provider)
    await pool.query(
      \`INSERT INTO accounts (id, user_id, account_id, provider_id, password, created_at, updated_at)
       VALUES (\$1, \$2, \$3, 'credential', \$4, NOW(), NOW())\`,
      [accountId, userId, userId, hashedPassword]
    );

    console.log('✅ Created: ' + user.name + ' (' + user.email + ')');
    return true;
  } catch (err: any) {
    console.log('❌ Failed: ' + user.name + ' — ' + err.message);
    return false;
  }
}

async function main() {
  let created = 0;
  for (const user of TEST_USERS) {
    const ok = await createUser(user);
    if (ok) created++;
  }
  console.log('\\n──────────────────────────────────────────────────');
  console.log('✅ Done: ' + created + '/' + TEST_USERS.length + ' users ready.');
  await pool.end();
}

main().catch(console.error);
"
