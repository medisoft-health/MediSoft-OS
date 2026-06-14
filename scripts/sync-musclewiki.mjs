/**
 * MediSport — MuscleWiki Premium Sync Script
 *
 * Fetches all 1899 exercises from MuscleWiki API (with full details)
 * and stores them in sport_exercise_library with source='musclewiki'.
 *
 * Strategy:
 * 1. Get all exercise IDs from the list endpoint (paginated, 100/page)
 * 2. Fetch full details for each exercise (with concurrency control)
 * 3. Upsert into sport_exercise_library
 *
 * Usage: node scripts/sync-musclewiki.mjs
 */

import pg from "pg";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ───
const API_KEY = process.env.MUSCLEWIKI_API_KEY || "mw_IeDTFlmM_isPSviCDMWRxgDRceiD96wuNy8WcV6Y700";
const BASE_URL = "https://api.musclewiki.com";
const CONCURRENCY = 5; // Parallel requests at a time
const DELAY_MS = 200; // Delay between batches to respect rate limits
const BATCH_SIZE = 50; // DB insert batch size

// ─── Load DB URL ───
let DATABASE_URL;
try {
  const envPath = resolve(__dirname, "../.env.local");
  const envContent = readFileSync(envPath, "utf-8");
  const match = envContent.match(/DATABASE_URL=["']?([^\n"']+)/);
  if (match) DATABASE_URL = match[1];
} catch {}
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in .env.local");
  process.exit(1);
}

// Strip sslmode from URL and use rejectUnauthorized:false
const cleanUrl = DATABASE_URL.replace(/[?&]sslmode=[^&]+/g, "");
const pool = new pg.Pool({
  connectionString: cleanUrl,
  ssl: { rejectUnauthorized: false },
});

// ─── API Helpers ───
async function fetchAPI(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: { "X-API-Key": API_KEY, "Accept": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${url}`);
  }
  return res.json();
}

async function getAllExerciseIds() {
  const ids = [];
  let offset = 0;
  const limit = 100;
  let total = Infinity;

  while (offset < total) {
    const data = await fetchAPI(`/exercises?limit=${limit}&offset=${offset}`);
    total = data.total;
    for (const ex of data.results) {
      ids.push(ex.id);
    }
    offset += limit;
    process.stdout.write(`\r  Fetching IDs: ${ids.length}/${total}`);
  }
  console.log(`\n✅ Got ${ids.length} exercise IDs`);
  return ids;
}

async function fetchExerciseDetails(id) {
  try {
    return await fetchAPI(`/exercises/${id}`);
  } catch (err) {
    console.warn(`⚠️  Failed to fetch exercise ${id}: ${err.message}`);
    return null;
  }
}

async function fetchBatch(ids) {
  const results = [];
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(fetchExerciseDetails));
    results.push(...batchResults.filter(Boolean));
    if (i + CONCURRENCY < ids.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }
  return results;
}

// ─── Map MuscleWiki exercise to our DB schema ───
function mapExercise(ex) {
  // Get the best video URL (prefer male front angle)
  let videoUrl = null;
  let thumbnailUrl = null;
  if (ex.videos && ex.videos.length > 0) {
    const maleFront = ex.videos.find((v) => v.gender === "male" && v.angle === "front");
    const first = maleFront || ex.videos[0];
    videoUrl = first.url;
    thumbnailUrl = first.og_image;
  }

  // Map body parts from primary muscles
  const bodyPartMap = {
    Chest: "chest",
    "Mid and Lower Chest": "chest",
    "Upper Pectoralis": "chest",
    Biceps: "upper arms",
    "Long Head Bicep": "upper arms",
    "Short Head Bicep": "upper arms",
    Triceps: "upper arms",
    "Long Head Tricep": "upper arms",
    Forearms: "lower arms",
    "Wrist Extensors": "lower arms",
    "Wrist Flexors": "lower arms",
    Quads: "upper legs",
    "Inner Quadriceps": "upper legs",
    "Outer Quadricep": "upper legs",
    "Rectus Femoris": "upper legs",
    Hamstrings: "upper legs",
    "Lateral Hamstrings": "upper legs",
    "Medial Hamstrings": "upper legs",
    Glutes: "upper legs",
    "Gluteus Maximus": "upper legs",
    "Gluteus Medius": "upper legs",
    "Inner Thigh": "upper legs",
    Groin: "upper legs",
    Calves: "lower legs",
    Gastrocnemius: "lower legs",
    Soleus: "lower legs",
    Tibialis: "lower legs",
    Feet: "lower legs",
    Shoulders: "shoulders",
    "Front Shoulders": "shoulders",
    "Anterior Deltoid": "shoulders",
    "Lateral Deltoid": "shoulders",
    "Posterior Deltoid": "shoulders",
    "Rear Shoulders": "shoulders",
    Lats: "back",
    "Lower back": "back",
    Traps: "back",
    "Traps (mid-back)": "back",
    "Lower Traps": "back",
    "Upper Traps": "back",
    Abdominals: "waist",
    "Lower Abdominals": "waist",
    "Upper Abdominals": "waist",
    Obliques: "waist",
    Neck: "neck",
  };

  // Determine body parts from primary muscles
  const bodyParts = [...new Set(
    (ex.primary_muscles || []).map((m) => bodyPartMap[m] || "full body")
  )];

  // Map difficulty
  const difficultyMap = {
    Beginner: "beginner",
    Intermediate: "intermediate",
    Advanced: "advanced",
    Expert: "advanced",
  };

  // Map category to equipment
  const categoryToEquipment = {
    Barbell: "barbell",
    Dumbbells: "dumbbell",
    Bodyweight: "body weight",
    Cables: "cable",
    Machine: "machine",
    Kettlebells: "kettlebell",
    Band: "resistance band",
    "Smith-Machine": "smith machine",
    "Medicine-Ball": "medicine ball",
    Medicineball: "medicine ball",
    TRX: "trx",
    Plate: "plate",
    "Bosu-Ball": "bosu ball",
    Cardio: "cardio",
    Recovery: "foam roller",
    Stretches: "body weight",
    Yoga: "body weight",
    Pilates: "body weight",
    Vitruvian: "machine",
  };

  return {
    exerciseId: `mw_${ex.id}`,
    name: ex.name,
    gifUrl: thumbnailUrl, // Use OG image as thumbnail
    videoUrl: videoUrl,
    bodyParts: JSON.stringify(bodyParts),
    equipments: JSON.stringify([categoryToEquipment[ex.category] || ex.category?.toLowerCase() || "other"]),
    targetMuscles: JSON.stringify(ex.primary_muscles || []),
    secondaryMuscles: JSON.stringify([]), // MuscleWiki doesn't separate secondary in this API
    instructions: JSON.stringify(ex.steps || []),
    source: "musclewiki",
    difficulty: difficultyMap[ex.difficulty] || "intermediate",
    forceType: ex.force?.toLowerCase() || null,
    mechanic: ex.mechanic?.toLowerCase() || null,
    category: ex.category || null,
    grips: JSON.stringify(ex.grips || []),
  };
}

// ─── DB Upsert ───
async function upsertBatch(exercises) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const ex of exercises) {
      await client.query(
        `INSERT INTO sport_exercise_library 
         (exercise_id, name, gif_url, body_parts, equipments, target_muscles, secondary_muscles, instructions, source, difficulty, force_type, mechanic, category, grips, video_url, synced_at)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13, $14::jsonb, $15, NOW())
         ON CONFLICT (exercise_id) DO UPDATE SET
           name = EXCLUDED.name,
           gif_url = EXCLUDED.gif_url,
           body_parts = EXCLUDED.body_parts,
           equipments = EXCLUDED.equipments,
           target_muscles = EXCLUDED.target_muscles,
           secondary_muscles = EXCLUDED.secondary_muscles,
           instructions = EXCLUDED.instructions,
           source = EXCLUDED.source,
           difficulty = EXCLUDED.difficulty,
           force_type = EXCLUDED.force_type,
           mechanic = EXCLUDED.mechanic,
           category = EXCLUDED.category,
           grips = EXCLUDED.grips,
           video_url = EXCLUDED.video_url,
           synced_at = NOW()`,
        [
          ex.exerciseId, ex.name, ex.gifUrl, ex.bodyParts, ex.equipments,
          ex.targetMuscles, ex.secondaryMuscles, ex.instructions, ex.source,
          ex.difficulty, ex.forceType, ex.mechanic, ex.category, ex.grips, ex.videoUrl,
        ]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ─── Main ───
async function main() {
  console.log("🏋️ MediSport — MuscleWiki Premium Sync");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Step 1: Add new columns if they don't exist
  console.log("\n📐 Ensuring DB columns exist...");
  const client = await pool.connect();
  try {
    await client.query(`ALTER TABLE sport_exercise_library ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'exercisedb'`);
    await client.query(`ALTER TABLE sport_exercise_library ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20)`);
    await client.query(`ALTER TABLE sport_exercise_library ADD COLUMN IF NOT EXISTS force_type VARCHAR(20)`);
    await client.query(`ALTER TABLE sport_exercise_library ADD COLUMN IF NOT EXISTS mechanic VARCHAR(20)`);
    await client.query(`ALTER TABLE sport_exercise_library ADD COLUMN IF NOT EXISTS category VARCHAR(50)`);
    await client.query(`ALTER TABLE sport_exercise_library ADD COLUMN IF NOT EXISTS grips JSONB DEFAULT '[]'`);
    await client.query(`ALTER TABLE sport_exercise_library ADD COLUMN IF NOT EXISTS video_url TEXT`);
    console.log("  ✅ Columns ready");
  } finally {
    client.release();
  }

  // Step 2: Get all exercise IDs
  console.log("\n📋 Fetching exercise list...");
  const ids = await getAllExerciseIds();

  // Step 3: Fetch full details in batches
  console.log("\n📥 Fetching exercise details...");
  const allExercises = [];
  const totalBatches = Math.ceil(ids.length / BATCH_SIZE);

  for (let b = 0; b < totalBatches; b++) {
    const batchIds = ids.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    const batchExercises = await fetchBatch(batchIds);
    allExercises.push(...batchExercises);
    process.stdout.write(`\r  Progress: ${allExercises.length}/${ids.length} exercises fetched`);
  }
  console.log(`\n✅ Fetched ${allExercises.length} exercises with full details`);

  // Step 4: Map and upsert
  console.log("\n💾 Storing in database...");
  const mapped = allExercises.map(mapExercise);
  const dbBatches = Math.ceil(mapped.length / BATCH_SIZE);

  for (let b = 0; b < dbBatches; b++) {
    const batch = mapped.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    await upsertBatch(batch);
    process.stdout.write(`\r  DB Progress: ${Math.min((b + 1) * BATCH_SIZE, mapped.length)}/${mapped.length}`);
  }

  // Step 5: Summary
  const { rows } = await pool.query(`SELECT source, COUNT(*) as count FROM sport_exercise_library GROUP BY source`);
  console.log("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 Final Library Stats:");
  for (const row of rows) {
    console.log(`   ${row.source}: ${row.count} exercises`);
  }
  const totalRow = await pool.query(`SELECT COUNT(*) as total FROM sport_exercise_library`);
  console.log(`   TOTAL: ${totalRow.rows[0].total} exercises`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ MuscleWiki sync complete!");

  await pool.end();
}

main().catch((err) => {
  console.error("\n❌ Sync failed:", err);
  process.exit(1);
});
