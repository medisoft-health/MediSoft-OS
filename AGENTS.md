<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## MediSport — Deployment Log

MediSport is mirrored across the standalone `(sport)` route group and the integrated `/medisport` module via shared components in `src/components/sport/` and shared APIs at `/api/sport`. Any change to a shared component/API reflects in both surfaces automatically.

- **Phase 1** (ee47d74): Standalone `(sport)` route group, landing/auth/onboarding, Coach & Trainee dashboards.
- **Phase 2** (d747431): Food Logger, Bio-Age Calculator, GPS Activity Tracker, Micro-Lessons.
- **Phase 3** (8df1c2d): Program Builder, Personal Coach, WADA Check, Medical Context Bridge.
- **Phase 4** (fd019fd): 11 `sport_*` PostgreSQL tables (migration 0004), DB persistence, Social Feed & Challenges.
- **Phase 5** (0799fc2): `sport_body_measurements` (0005), body composition history, Coach↔Trainee linking.
- **Phase 6** (c91cd58): `sport_lab_results` (0006), lab history + comparison, MediSport PWA installability, recharts trends.
- **Phase 7**: Custom PWA icons (runner on emerald gradient), shared `TrendChart`, coach notifications
  (`sport_notifications` table — migration `scripts/0007_medisport_notifications.sql`, **applied to Cloud SQL**),
  live `CoachNotificationBell`, and shared `AthleteProgressPdf` export (jsPDF + html2canvas) on the trainee
  body & labs pages. API additions: `my-notifications` (GET), `mark-notifications-read` (POST), and a
  `notifyCoach()` helper that auto-fires on body-measurement and lab-result saves.
- **Phase 8** (405662b): Coach Verification & Rating System. Migration `scripts/0008_coach_verification.sql` (**applied to Cloud SQL**) expanded `sport_profiles` (education, experience, verification + scoring columns) and added 3 tables: `sport_coach_certifications`, `sport_coach_reviews` (column is `stars`, not `rating`), `sport_coach_requests` (mutual trainee↔coach linking with `initiator` + `status`).
  - **Scoring engine** `src/lib/sport/coach-scoring.ts` — 100-point rubric: education(20) + certs(25) + experience(15) + profile(10) + admin_discretionary(15) + performance(15); `RECOGNIZED_ISSUERS` catalog (NASM/ISSA/ACE/ACSM/REPs + Gulf/local); tier thresholds bronze/silver/gold/elite. New coaches cap at 85 until performance accrues. 17 unit tests (`src/lib/sport/__tests__/coach-scoring.test.ts`).
  - **14 new `/api/sport` actions** — GET: `my-coach-profile`, `admin-verification-queue`, `coach-directory` (public), `coach-public-profile`, `my-coach-requests`, `my-trainee-requests`; POST: `coach-profile-save`, `coach-cert-add`, `coach-cert-remove`, `coach-submit-verification`, `admin-verify-decision`, `request-coach`, `respond-coach-request`, `coach-review`.
  - **Coach document upload** — `src/lib/storage/coach-docs.ts` (GCS + local fallback), `/api/sport/upload` (POST), `/api/sport/coach-doc` (token-based serving).
  - **4 shared components** — `coach-verification-form.tsx`, `admin-coach-verification.tsx`, `coach-directory.tsx`, `coach-requests-panel.tsx` (all in `src/components/sport/`, mirrored to both surfaces).
  - **2 new pages** — `(sport)/admin/coaches/page.tsx` (admin console, admin role only), `(sport)/trainee/coaches/page.tsx` (coach directory). Updated: coach dashboard (verification tab + requests panel), trainee dashboard (Find Coach button), `sport-layout-shell.tsx` (conditional admin link).
  - **i18n** — `findCoach`/`findCoachDesc` in `SportStandalone` (AR + EN).
  - **Verified** — 178 routes, 0 TS errors, 388/388 unit tests; live HTTPS routes 200, auth-gated APIs 401, public `coach-directory` 200; full E2E DB lifecycle (create→approve→directory→request→accept→link→review→cleanup) passed.
  - **Admin role**: set a user's `role` to `admin` in `users` table to expose the admin console. New coaches require admin approval via `admin-verify-decision` before appearing in the public directory.
- **Phase 9** (32d0712): Single-owner admin lock + private console route, coach verification emails, coach analytics dashboard, admin bulk verification, ESLint cleanup, and fixed broken MediSport nav links.
  - **Single-owner admin lock** — `src/lib/sport/admin-guard.ts`: `isPlatformAdmin(user)` requires BOTH `role='admin'` AND email on an allow-list (default `medisoft2022@gmail.com`, overridable via `MEDISPORT_ADMIN_EMAILS` env, comma-separated). Both server page guard and the `/api/sport` admin actions (`admin-verification-queue`, `admin-verify-decision`, `admin-bulk-decision`) enforce it. The DB was cleaned so only `medisoft2022@gmail.com` has `role='admin'` (the old `hamada@medisofthealth.com` admin was demoted to `physician`).
  - **Private admin route** — admin console MOVED from `(sport)/admin/coaches` to the secret slug `(sport)/console-x7k2/coaches` (`ADMIN_CONSOLE_SLUG` in admin-guard). It is a server component that calls `requireSession()` + `isPlatformAdmin()` and `redirect()`s unauthorized visitors to `/sport`. Live URL: **`/ar/console-x7k2/coaches`** (unauth → 307 redirect). The admin link in `sport-layout-shell.tsx` is shown only when the pinned email matches.
  - **Coach verification emails** — bilingual (AR/EN) decision template in `src/lib/email/index.ts`, fired best-effort from `applyCoachDecision` on approve/reject/request_info (alongside the in-app notification). NOTE: the email layer currently uses the **console driver only** — no real provider/keys are configured yet, so emails are logged, not sent. Wire `RESEND_API_KEY` (or SMTP) later to activate with no code change. Admin creates/approves coaches manually in the meantime.
  - **Coach analytics** — Migration `scripts/0009_coach_analytics.sql` (**applied to Cloud SQL**) added `sport_coach_score_history` (coach_id, total, tier, breakdown JSONB, rating_avg, rating_count, reason, created_at). `recomputeCoachScore` now records a snapshot on every change (review/admin-decision/cert). New GET action `coach-analytics` returns the score time-series + rating summary (avg, star distribution, sub-axes, recent reviews) + client count. Shared component `src/components/sport/coach-analytics.tsx` (recharts) replaces the placeholder Analytics tab in the coach dashboard.
  - **Admin bulk verification** — refactored single-decision logic into shared `applyCoachDecision()`; new POST action `admin-bulk-decision` (decision + coachIds[] + note) applies the same effects (status + notification + email + score recompute) per coach and returns `{total, succeeded, failed}`. UI: select-all + per-card checkboxes + bulk action bar (approve/reject/request_info) in `admin-coach-verification.tsx`.
  - **ESLint cleanup** — added `eslint-plugin-unused-imports` (auto-fixable), turned off non-fixable `@typescript-eslint/no-unused-vars` in favor of `unused-imports/no-unused-vars` with `^_` ignore convention. Auto-removed ~347 unused imports (898 → ~543 problems). Remaining `no-explicit-any` / `react-hooks/*` are non-blocking and left as-is. Build stays green.
  - **Fixed broken nav** — all MediSport nav links in `sport-layout-shell.tsx` used a non-existent `/sport/...` prefix (404). Corrected to bare locale paths (`/ar/coach`, `/ar/trainee`, `/ar/auth`, `/ar/console-x7k2/coaches`). The `(sport)` route group adds NO URL prefix; `/sport` is only the landing page route.
  - **Verified** — `next build` Compiled successfully (114s, 97 pages, 0 TS errors); DB E2E (`scripts/test_phase9.mjs`) passed (history snapshots, bulk approve, notifications, analytics aggregation); live: `/ar/console-x7k2/coaches` 307, `/ar/coach`+`/ar/trainee`+`/ar/sport` 200, `coach-analytics` 401, `coach-directory` 200; DB confirms exactly 1 admin.

- **Phase 13** (2ef166e): My Health Journey — Complete Experience System.
  - **11 new DB tables:** `sport_journey_goals`, `sport_checkins`, `sport_streaks`, `sport_user_achievements`, `sport_journey_milestones`, `sport_journey_notes`, `sport_weekly_reports`, `sport_medical_prescriptions`, `sport_emergency_alerts`, `sport_xp_log`, `sport_achievements` (seeded with 16 achievements).
  - **Migration:** `scripts/0011_journey_system.sql` (**applied to Cloud SQL**).
  - **New API route:** `/api/sport/journey` — 15+ endpoints (checkin, my-journey, streaks, achievements, timeline, weekly-report, prescription, emergency-check, acknowledge-emergency, quick-note, etc.).
  - **Journey Engine:** `src/lib/sport/journey-engine.ts` — XP system, streak logic, achievement checking, emergency threshold detection.
  - **New Pages:**
    - `/trainee/journey` — Main Journey Timeline (milestones, goals, stats, level display)
    - `/trainee/journey/checkin` — Daily Check-in (30-second swipe UX: mood, sleep, energy, pain, weight, water)
    - `/trainee/journey/achievements` — Gamification (levels, XP bar, earned/locked badges)
    - `/trainee/journey/prescription` — Medical Sport Prescription (PDF-ready, lab-based)
    - `/trainee/journey/weekly-report` — Auto-generated weekly summaries
  - **New Components:**
    - `emergency-mode.tsx` — Full-screen critical health alert (10 thresholds, emergency contacts, acknowledge flow)
    - `journey-quick-actions.tsx` — Floating action button with bottom sheets (quick note, food ask, supplement ask, InBody data)
  - **Journey Layout:** `journey/layout.tsx` wraps all journey pages with Emergency Mode + Quick Actions.
  - **Navigation:** Journey (🧭 رحلتي) added to bottom nav, desktop nav, mobile menu. Hero card on trainee dashboard.
  - **i18n:** `SportJourney` namespace (70 keys AR/EN).
  - **Gamification:** 5 levels (Beginner→Legend), XP per action (check-in 10, workout 25, streak bonus 5×days), 16 achievements.
  - **Emergency Mode:** 10 critical thresholds (BP>180, glucose>300/<54, Hb<7, K+>6/<2.5, HR>120, chest pain, creatinine>4). Blocks all training, shows emergency contacts (911, 997).
  - **Verified:** Build compiled successfully, all 5 journey pages return 200, API requires auth (401 without).

- **Phase 12** (1dde237): MuscleWiki Premium API Integration — 974 exercises with videos, difficulty, force type.
  - **API Key:** `MUSCLEWIKI_API_KEY` in `.env.local`
  - **Sync Scripts:** `scripts/sync-musclewiki.mjs` (full sync, rate-limited), `scripts/sync-musclewiki-retry.mjs` (retry missing)
  - **Schema Updates:** `sport_exercise_library` extended: source, difficulty, force_type, mechanic, category, grips (JSONB), video_url
  - **API Updates:** `exercise-library` GET: new filters (source, difficulty, forceType); `exercise-library-filters` GET: returns sources, difficulties, forceTypes
  - **Frontend:** `/trainee/exercises` rewritten with Premium badge, video player (autoplay loop muted), difficulty/force badges, source/difficulty/forceType advanced filters. `/coach/program-builder` fixed API contract + Premium badge + video support.
  - **Data:** 2298 total exercises (974 MuscleWiki Premium + 1324 ExerciseDB). MuscleWiki exercises include MP4 videos (male, front angle), difficulty levels, force types.
  - **NOTE:** MuscleWiki API rate-limits at ~1000 requests. Remaining 925 exercises can be synced later with `node scripts/sync-musclewiki-retry.mjs`.

- **Phase 11** (cb60082): Live Session Progressive Overload + Medical Training Adjustments + Coach Builder v2.
  - **New GET API actions:** `exercise-history` (all logged sets for an exercise), `session-history` (completed sessions with stats), `progressive-overload-suggestion` (next-session recommendation), `medical-training-adjustments` (analyze lab markers → training recommendations).
  - **New POST API actions:** `update-progressive-overload` (update exercise progress after session), `apply-medical-adjustments` (apply lab-driven adjustments to active plan).
  - **Medical Intelligence Integration (9 markers):** Hemoglobin, Ferritin, Vitamin D, Testosterone, Cortisol, CRP, HbA1c, Blood Pressure, Cholesterol LDL. Each generates: condition, impact, recommendation (AR+EN), severity (critical/warning/info), specific adjustments (maxIntensity, reduceSetsBy, increaseRestBy, maxDaysPerWeek, avoidExerciseTypes, preferExerciseTypes).
  - **New component** `src/components/sport/medical-training-adjustments.tsx` — shared reusable widget showing medical adjustments summary + detail cards + apply button.
  - **Medical Bridge page** updated: shows real-time medical adjustments section when linked.
  - **Training page** updated: fetches previousBest before session start, calls update-progressive-overload after session completion.
  - **Coach Program Builder v2** — complete rewrite: uses real 1324 exercises from DB (not legacy static array), GIF previews in cards, search with debounce, body part filter chips, expandable exercise cards with full GIF + instructions, pagination (20/page).
  - **Bug fixes:** `lab.results` → `lab.markers` (correct column), marker key normalization (vitaminD→vitamind, CRP(hs)→crphs).
  - **Verified** — `next build` Compiled (2.4min, 0 errors); PM2 online; exercise-library API 200; auth-gated endpoints 401.

- **Phase 10** (5d2b111): ExerciseDB Integration — 1324 real exercises with animated GIFs.
  - **Migration** `scripts/0010_sport_exercise_library.sql` (**applied to Cloud SQL**) — `sport_exercise_library` table (exercise_id UNIQUE, name, gif_url, body_parts JSONB, equipments JSONB, target_muscles JSONB, secondary_muscles JSONB, instructions JSONB, synced_at, created_at). GIN indexes on body_parts, equipments, target_muscles.
  - **Sync script** `scripts/sync-exercisedb.mjs` — downloads full dataset (1324 exercises) from GitHub `hasaneyldrm/exercises-dataset`, maps GIF URLs to ExerciseDB CDN (`https://static.exercisedb.dev/media/{id}.gif`), upserts into DB. Run: `node scripts/sync-exercisedb.mjs`.
  - **New API actions** — `exercise-library` (GET, paginated, filterable by q/bodyPart/equipment/target), `exercise-library-filters` (GET, returns distinct body parts/equipments/targets for filter dropdowns).
  - **Rewritten page** `/trainee/exercises` — fetches from DB API, displays exercises in responsive grid with animated GIF thumbnails, expandable cards with full-size GIF + instructions, server-side search/filter, pagination (24/page), body part quick-scroll chips, advanced equipment/target filters.
  - **Drizzle schema** — `sportExerciseLibrary` added to `src/db/schema.ts`.
  - **Data stats** — 1324 exercises: upper arms(292), upper legs(227), back(203), waist(169), chest(163), shoulders(143), lower legs(59), lower arms(37), cardio(29), neck(2). Equipment: body weight(325), dumbbell(294), cable(157), barbell(154), leverage machine(81), band(54), smith machine(48), kettlebell(41), +more.
  - **Verified** — `next build` Compiled successfully (110s, 0 errors); API endpoints return correct data; GIF CDN URLs verified (HTTP 200); live at `https://sport.medisofthealth.com/ar/trainee/exercises`.

### System notes
- DB: PostgreSQL on Google Cloud SQL; apply new `sport_*` migrations from `scripts/000N_*.sql` via `psql "$DATABASE_URL"`.
- Deploy: `next build` then `pm2 restart all` (cluster, 2 instances, port 3000) behind Nginx → https://app.medisofthealth.com.
- All `my-*` user-data API actions require a session (401 without auth); reference catalogs (food/exercise/wada/lessons) are public.
- PWA: manifest `public/sport-manifest.webmanifest`, SW `public/sport-sw.js`, icons `public/images/medisport-icon-*.png`.
