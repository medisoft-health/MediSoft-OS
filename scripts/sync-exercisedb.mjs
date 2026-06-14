/**
 * ExerciseDB Sync Script
 * 
 * Strategy: Uses the hasaneyldrm/exercises-dataset (1324 exercises) as the primary source,
 * combined with ExerciseDB CDN for GIF URLs.
 * 
 * The dataset contains exercise IDs embedded in filenames (e.g. "0001-2gPfomN.gif")
 * which map to ExerciseDB's CDN: https://static.exercisedb.dev/media/{id}.gif
 * 
 * Usage: node scripts/sync-exercisedb.mjs
 */

import pg from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Config ───
const DATASET_URL = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json";
const EXERCISEDB_CDN = "https://static.exercisedb.dev/media";
const BATCH_INSERT_SIZE = 50;

// ─── Load env ───
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch (e) {
    console.error("Could not load .env.local:", e.message);
  }
}

loadEnv();

// ─── Database connection ───
function getPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const cleanUrl = url.replace(/[?&]sslmode=[^&]*/g, "");
  return new pg.Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
    max: 5,
  });
}

// ─── Extract ExerciseDB ID from gif filename ───
function extractExerciseDbId(gifPath) {
  // Format: "videos/0001-2gPfomN.gif" -> "2gPfomN"
  const filename = gifPath.split("/").pop().replace(".gif", "");
  const parts = filename.split("-");
  return parts.length > 1 ? parts.slice(1).join("-") : parts[0];
}

// ─── Build CDN GIF URL ───
function buildGifUrl(gifPath) {
  const id = extractExerciseDbId(gifPath);
  return `${EXERCISEDB_CDN}/${id}.gif`;
}

// ─── Parse instructions into array ───
function parseInstructions(instructions) {
  if (!instructions) return [];
  // instructions is an object with language keys
  const en = instructions.en || instructions.EN || "";
  if (!en) return [];
  // Split into sentences for step-by-step
  const sentences = en.split(/\.\s+/).filter(s => s.trim().length > 0);
  return sentences.map((s, i) => `Step:${i + 1} ${s.trim().replace(/\.$/, "")}.`);
}

// ─── Main sync function ───
async function syncExercises() {
  console.log("🏋️ ExerciseDB Full Sync — Starting...\n");
  console.log(`📥 Downloading dataset from GitHub...`);

  // Fetch the full dataset
  const response = await fetch(DATASET_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch dataset: ${response.status}`);
  }
  const exercises = await response.json();
  console.log(`✅ Downloaded ${exercises.length} exercises\n`);

  const pool = getPool();
  let totalInserted = 0;
  let totalUpdated = 0;
  let errors = 0;

  try {
    // Process in batches
    for (let i = 0; i < exercises.length; i += BATCH_INSERT_SIZE) {
      const batch = exercises.slice(i, i + BATCH_INSERT_SIZE);
      
      for (const ex of batch) {
        try {
          const exerciseId = extractExerciseDbId(ex.gif_url || "");
          const gifUrl = buildGifUrl(ex.gif_url || "");
          const bodyParts = [ex.body_part || ex.category].filter(Boolean);
          const equipments = [ex.equipment].filter(Boolean);
          const targetMuscles = [ex.target].filter(Boolean);
          const secondaryMuscles = ex.secondary_muscles || [];
          const instructions = parseInstructions(ex.instructions);

          const result = await pool.query(
            `INSERT INTO sport_exercise_library 
              (exercise_id, name, gif_url, body_parts, equipments, target_muscles, secondary_muscles, instructions, synced_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             ON CONFLICT (exercise_id) DO UPDATE SET
              name = EXCLUDED.name,
              gif_url = EXCLUDED.gif_url,
              body_parts = EXCLUDED.body_parts,
              equipments = EXCLUDED.equipments,
              target_muscles = EXCLUDED.target_muscles,
              secondary_muscles = EXCLUDED.secondary_muscles,
              instructions = EXCLUDED.instructions,
              synced_at = NOW()
             RETURNING (xmax = 0) AS is_insert`,
            [
              exerciseId,
              ex.name,
              gifUrl,
              JSON.stringify(bodyParts),
              JSON.stringify(equipments),
              JSON.stringify(targetMuscles),
              JSON.stringify(secondaryMuscles),
              JSON.stringify(instructions),
            ]
          );

          if (result.rows[0]?.is_insert) {
            totalInserted++;
          } else {
            totalUpdated++;
          }
        } catch (err) {
          errors++;
          if (errors <= 5) {
            console.error(`  ⚠️ Error on "${ex.name}": ${err.message}`);
          }
        }
      }

      const progress = Math.min(i + BATCH_INSERT_SIZE, exercises.length);
      process.stdout.write(`\r  📊 Progress: ${progress}/${exercises.length} (${Math.round(progress/exercises.length*100)}%)`);
    }

    console.log("\n");

    // Final count
    const finalCount = await pool.query("SELECT COUNT(*) FROM sport_exercise_library");
    
    // Stats by body part
    const bodyPartStats = await pool.query(`
      SELECT bp, COUNT(*) as cnt 
      FROM sport_exercise_library, jsonb_array_elements_text(body_parts) as bp 
      GROUP BY bp ORDER BY cnt DESC
    `);

    console.log("═".repeat(50));
    console.log("🎉 SYNC COMPLETE!");
    console.log("═".repeat(50));
    console.log(`  📊 Total in DB: ${finalCount.rows[0].count}`);
    console.log(`  ➕ Inserted: ${totalInserted}`);
    console.log(`  🔄 Updated: ${totalUpdated}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`  📅 Synced at: ${new Date().toISOString()}`);
    console.log("\n  📋 By Body Part:");
    for (const row of bodyPartStats.rows) {
      console.log(`     ${row.bp}: ${row.cnt}`);
    }
    console.log("═".repeat(50));

  } catch (err) {
    console.error("\n❌ SYNC FAILED:", err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run
syncExercises();
