/**
 * MediSport — MuscleWiki Retry Sync (fetches missing exercises only)
 * Uses slower rate limiting (1 request/sec) to avoid 429 errors.
 *
 * Usage: node scripts/sync-musclewiki-retry.mjs
 */

import pg from "pg";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.MUSCLEWIKI_API_KEY || "mw_IeDTFlmM_isPSviCDMWRxgDRceiD96wuNy8WcV6Y700";
const BASE_URL = "https://api.musclewiki.com";
const CONCURRENCY = 2; // Only 2 at a time
const DELAY_MS = 1000; // 1 second between batches
const BATCH_SIZE = 50;

let DATABASE_URL;
try {
  const envPath = resolve(__dirname, "../.env.local");
  const envContent = readFileSync(envPath, "utf-8");
  const match = envContent.match(/DATABASE_URL=["']?([^\n"']+)/);
  if (match) DATABASE_URL = match[1];
} catch {}
if (!DATABASE_URL) { console.error("❌ DATABASE_URL not found"); process.exit(1); }

const cleanUrl = DATABASE_URL.replace(/[?&]sslmode=[^&]+/g, "");
const pool = new pg.Pool({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });

async function fetchAPI(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, { headers: { "X-API-Key": API_KEY, "Accept": "application/json" } });
  if (!res.ok) throw new Error(`API error ${res.status}: ${url}`);
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
    for (const ex of data.results) ids.push(ex.id);
    offset += limit;
    await new Promise(r => setTimeout(r, 300));
  }
  return ids;
}

function mapExercise(ex) {
  let videoUrl = null, thumbnailUrl = null;
  if (ex.videos && ex.videos.length > 0) {
    const maleFront = ex.videos.find(v => v.gender === "male" && v.angle === "front");
    const first = maleFront || ex.videos[0];
    videoUrl = first.url;
    thumbnailUrl = first.og_image;
  }
  const bodyPartMap = {
    Chest: "chest", "Mid and Lower Chest": "chest", "Upper Pectoralis": "chest",
    Biceps: "upper arms", "Long Head Bicep": "upper arms", "Short Head Bicep": "upper arms",
    Triceps: "upper arms", "Long Head Tricep": "upper arms",
    Forearms: "lower arms", "Wrist Extensors": "lower arms", "Wrist Flexors": "lower arms",
    Quads: "upper legs", "Inner Quadriceps": "upper legs", "Outer Quadricep": "upper legs",
    "Rectus Femoris": "upper legs", Hamstrings: "upper legs", "Lateral Hamstrings": "upper legs",
    "Medial Hamstrings": "upper legs", Glutes: "upper legs", "Gluteus Maximus": "upper legs",
    "Gluteus Medius": "upper legs", "Inner Thigh": "upper legs", Groin: "upper legs",
    Calves: "lower legs", Gastrocnemius: "lower legs", Soleus: "lower legs",
    Tibialis: "lower legs", Feet: "lower legs",
    Shoulders: "shoulders", "Front Shoulders": "shoulders", "Anterior Deltoid": "shoulders",
    "Lateral Deltoid": "shoulders", "Posterior Deltoid": "shoulders", "Rear Shoulders": "shoulders",
    Lats: "back", "Lower back": "back", Traps: "back", "Traps (mid-back)": "back",
    "Lower Traps": "back", "Upper Traps": "back",
    Abdominals: "waist", "Lower Abdominals": "waist", "Upper Abdominals": "waist", Obliques: "waist",
    Neck: "neck",
  };
  const bodyParts = [...new Set((ex.primary_muscles || []).map(m => bodyPartMap[m] || "full body"))];
  const difficultyMap = { Beginner: "beginner", Intermediate: "intermediate", Advanced: "advanced", Expert: "advanced" };
  const categoryToEquipment = {
    Barbell: "barbell", Dumbbells: "dumbbell", Bodyweight: "body weight", Cables: "cable",
    Machine: "machine", Kettlebells: "kettlebell", Band: "resistance band",
    "Smith-Machine": "smith machine", "Medicine-Ball": "medicine ball", Medicineball: "medicine ball",
    TRX: "trx", Plate: "plate", "Bosu-Ball": "bosu ball", Cardio: "cardio",
    Recovery: "foam roller", Stretches: "body weight", Yoga: "body weight", Pilates: "body weight",
    Vitruvian: "machine",
  };
  return {
    exerciseId: `mw_${ex.id}`, name: ex.name, gifUrl: thumbnailUrl, videoUrl,
    bodyParts: JSON.stringify(bodyParts),
    equipments: JSON.stringify([categoryToEquipment[ex.category] || ex.category?.toLowerCase() || "other"]),
    targetMuscles: JSON.stringify(ex.primary_muscles || []),
    secondaryMuscles: JSON.stringify([]),
    instructions: JSON.stringify(ex.steps || []),
    source: "musclewiki",
    difficulty: difficultyMap[ex.difficulty] || "intermediate",
    forceType: ex.force?.toLowerCase() || null,
    mechanic: ex.mechanic?.toLowerCase() || null,
    category: ex.category || null,
    grips: JSON.stringify(ex.grips || []),
  };
}

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
           name = EXCLUDED.name, gif_url = EXCLUDED.gif_url, body_parts = EXCLUDED.body_parts,
           equipments = EXCLUDED.equipments, target_muscles = EXCLUDED.target_muscles,
           secondary_muscles = EXCLUDED.secondary_muscles, instructions = EXCLUDED.instructions,
           source = EXCLUDED.source, difficulty = EXCLUDED.difficulty, force_type = EXCLUDED.force_type,
           mechanic = EXCLUDED.mechanic, category = EXCLUDED.category, grips = EXCLUDED.grips,
           video_url = EXCLUDED.video_url, synced_at = NOW()`,
        [ex.exerciseId, ex.name, ex.gifUrl, ex.bodyParts, ex.equipments, ex.targetMuscles,
         ex.secondaryMuscles, ex.instructions, ex.source, ex.difficulty, ex.forceType,
         ex.mechanic, ex.category, ex.grips, ex.videoUrl]
      );
    }
    await client.query("COMMIT");
  } catch (err) { await client.query("ROLLBACK"); throw err; }
  finally { client.release(); }
}

async function main() {
  console.log("🏋️ MediSport — MuscleWiki Retry Sync (missing exercises only)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Get all API IDs
  console.log("\n📋 Fetching all exercise IDs from API...");
  const allIds = await getAllExerciseIds();
  console.log(`  Total in API: ${allIds.length}`);

  // Get already-synced IDs from DB
  const { rows } = await pool.query(
    `SELECT exercise_id FROM sport_exercise_library WHERE source = 'musclewiki'`
  );
  const existingIds = new Set(rows.map(r => parseInt(r.exercise_id.replace("mw_", ""))));
  console.log(`  Already in DB: ${existingIds.size}`);

  const missingIds = allIds.filter(id => !existingIds.has(id));
  console.log(`  Missing: ${missingIds.length}`);

  if (missingIds.length === 0) {
    console.log("\n✅ All exercises already synced!");
    await pool.end();
    return;
  }

  // Fetch missing with slow rate
  console.log(`\n📥 Fetching ${missingIds.length} missing exercises (slow mode)...`);
  const fetched = [];
  let failed = 0;

  for (let i = 0; i < missingIds.length; i += CONCURRENCY) {
    const batch = missingIds.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (id) => {
      try { return await fetchAPI(`/exercises/${id}`); }
      catch { failed++; return null; }
    }));
    fetched.push(...results.filter(Boolean));
    process.stdout.write(`\r  Progress: ${i + batch.length}/${missingIds.length} (fetched: ${fetched.length}, failed: ${failed})`);
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\n✅ Fetched ${fetched.length} new exercises (${failed} failed)`);

  if (fetched.length > 0) {
    console.log("\n💾 Storing in database...");
    const mapped = fetched.map(mapExercise);
    for (let b = 0; b < mapped.length; b += BATCH_SIZE) {
      const batch = mapped.slice(b, b + BATCH_SIZE);
      await upsertBatch(batch);
      process.stdout.write(`\r  DB: ${Math.min(b + BATCH_SIZE, mapped.length)}/${mapped.length}`);
    }
  }

  const { rows: stats } = await pool.query(`SELECT source, COUNT(*) as count FROM sport_exercise_library GROUP BY source`);
  console.log("\n\n📊 Final Stats:");
  for (const row of stats) console.log(`   ${row.source}: ${row.count}`);
  const { rows: total } = await pool.query(`SELECT COUNT(*) as total FROM sport_exercise_library`);
  console.log(`   TOTAL: ${total[0].total}`);
  console.log("✅ Done!");
  await pool.end();
}

main().catch(err => { console.error("❌", err); process.exit(1); });
