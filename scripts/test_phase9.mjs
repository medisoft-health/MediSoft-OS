// Phase 9 E2E smoke test (DB-level): verifies score-history snapshots,
// bulk decision side effects, and analytics aggregation queries.
// Run: node scripts/test_phase9.mjs
import pg from "pg";
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const url = env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^"|"$/g, "");
if (!url) throw new Error("DATABASE_URL not found");
const clean = url.replace(/[?&]sslmode=[^&]*/g, "");
const client = new pg.Client({ connectionString: clean, ssl: { rejectUnauthorized: false } });

const log = (...a) => console.log(...a);
let coachA, coachB, adminId;

async function main() {
  await client.connect();
  log("Connected.");

  // 0) Confirm new table exists
  const t = await client.query(
    `SELECT to_regclass('public.sport_coach_score_history') AS tbl`
  );
  if (!t.rows[0].tbl) throw new Error("sport_coach_score_history missing");
  log("OK: sport_coach_score_history exists.");

  // Resolve admin (Hamada)
  const adm = await client.query(
    `SELECT id FROM users WHERE lower(email)=lower($1) LIMIT 1`,
    ["medisoft2022@gmail.com"]
  );
  adminId = adm.rows[0]?.id;
  if (!adminId) throw new Error("Admin account not found");
  log("Admin id:", adminId);

  // 1) Create two throwaway coach users + sport profiles
  const mk = async (suffix) => {
    const email = `__test_coach_${suffix}_${Date.now()}@example.com`;
    const ins = await client.query(
      `INSERT INTO users (id, name, email, email_verified, role, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, true, 'physician', now(), now()) RETURNING id`,
      [`Test Coach ${suffix}`, email]
    );
    const id = ins.rows[0].id;
    await client.query(
      `INSERT INTO sport_profiles (user_id, role, verification_status, highest_degree, years_experience, submitted_at, created_at, updated_at)
       VALUES ($1,'coach','submitted','bachelor',5,now(),now(),now())`,
      [id]
    );
    return id;
  };
  coachA = await mk("A");
  coachB = await mk("B");
  log("Created coaches:", coachA, coachB);

  // 2) Simulate score-history snapshots (as recompute would)
  for (const cid of [coachA, coachB]) {
    await client.query(
      `INSERT INTO sport_coach_score_history (coach_id, total, tier, breakdown, rating_avg, rating_count, reason, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now() - interval '2 days'),
              ($1,$8,$9,$10,$11,$12,$13, now())`,
      [
        cid,
        45, "bronze", JSON.stringify({ academic: 12, certifications: 0, experience: 15, completeness: 8, adminDiscretion: 0, performance: 10 }), "0", 0, "submit",
        72, "gold", JSON.stringify({ academic: 12, certifications: 20, experience: 15, completeness: 10, adminDiscretion: 5, performance: 10 }), "0", 0, "admin",
      ]
    );
  }
  const hist = await client.query(
    `SELECT count(*)::int AS n FROM sport_coach_score_history WHERE coach_id = ANY($1)`,
    [[coachA, coachB]]
  );
  log("Score-history rows for test coaches:", hist.rows[0].n, "(expected 4)");
  if (hist.rows[0].n !== 4) throw new Error("history snapshot count mismatch");

  // 3) Simulate a BULK approve: set both to verified + insert notifications
  for (const cid of [coachA, coachB]) {
    await client.query(
      `UPDATE sport_profiles SET verification_status='verified', verified_at=now(), coach_score='72', coach_tier='gold' WHERE user_id=$1`,
      [cid]
    );
    await client.query(
      `INSERT INTO sport_notifications (user_id, actor_id, type, title, body, link, created_at)
       VALUES ($1,$2,'coach-verification','تم اعتماد حسابك كمدرب','تهانينا','/coach/verification', now())`,
      [cid, adminId]
    );
  }
  const verified = await client.query(
    `SELECT count(*)::int AS n FROM sport_profiles WHERE user_id = ANY($1) AND verification_status='verified'`,
    [[coachA, coachB]]
  );
  log("Verified after bulk:", verified.rows[0].n, "(expected 2)");
  if (verified.rows[0].n !== 2) throw new Error("bulk verify mismatch");

  const notifs = await client.query(
    `SELECT count(*)::int AS n FROM sport_notifications WHERE user_id = ANY($1)`,
    [[coachA, coachB]]
  );
  log("Notifications created:", notifs.rows[0].n, "(expected >= 2)");
  if (notifs.rows[0].n < 2) throw new Error("notifications missing");

  // 4) Analytics aggregation query (mirrors coach-analytics history fetch)
  const series = await client.query(
    `SELECT total, tier, reason, created_at FROM sport_coach_score_history
     WHERE coach_id=$1 ORDER BY created_at ASC`,
    [coachA]
  );
  log("Analytics series for coachA:", series.rows.map((r) => `${r.total}/${r.tier}`).join(" -> "));
  if (series.rows.length !== 2) throw new Error("analytics series mismatch");

  log("\nALL PHASE 9 DB CHECKS PASSED ✅");
}

async function cleanup() {
  try {
    for (const cid of [coachA, coachB].filter(Boolean)) {
      await client.query(`DELETE FROM sport_coach_score_history WHERE coach_id=$1`, [cid]);
      await client.query(`DELETE FROM sport_notifications WHERE user_id=$1`, [cid]);
      await client.query(`DELETE FROM sport_profiles WHERE user_id=$1`, [cid]);
      await client.query(`DELETE FROM users WHERE id=$1`, [cid]);
    }
    log("Cleanup done.");
  } catch (e) {
    console.error("Cleanup error:", e.message);
  }
}

main()
  .catch((e) => {
    console.error("TEST FAILED:", e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await client.end();
  });
