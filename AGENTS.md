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

### System notes
- DB: PostgreSQL on Google Cloud SQL; apply new `sport_*` migrations from `scripts/000N_*.sql` via `psql "$DATABASE_URL"`.
- Deploy: `next build` then `pm2 restart all` (cluster, 2 instances, port 3000) behind Nginx → https://app.medisofthealth.com.
- All `my-*` user-data API actions require a session (401 without auth); reference catalogs (food/exercise/wada/lessons) are public.
- PWA: manifest `public/sport-manifest.webmanifest`, SW `public/sport-sw.js`, icons `public/images/medisport-icon-*.png`.
