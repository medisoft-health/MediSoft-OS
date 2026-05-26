# MediSoft C-OS

> The AI-native Clinical Operating System for Saudi Arabia.

**Status:** Phase 6 — Polish (security hardened, tested, performance-tuned)
**Founder:** Hamada Ghaith
**Brand:** *Inspiring Minds*

---

## What this is

MediSoft C-OS is a unified clinical workspace combining four AI-powered modules with a shared patient record and dashboard. Built specifically for the Saudi healthcare market — bilingual-ready (Arabic + English), NPHIES-ready, and SDAIA / NDMO data-sovereignty compliant.

| Module | Role | Primary AI | Status |
|---|---|---|---|
| **MediScript** | Cognitive Clinical Observer — voice → SOAP note + ICD-11 | Gemini 2.5 Pro + Whisper | ✅ Shipped |
| **PharmaX** | Pharmacokinetic Guard — three-layer drug safety | RxNorm + OpenFDA + Gemini | ✅ Shipped |
| **MediLab** | Biomarker Narrative — personalised lab interpretation | Gemini 2.5 Pro | ✅ Shipped |
| **MediScan** | Vision Intelligence — imaging analysis with annotation tools | Gemini 2.5 Pro (multimodal) | ✅ Shipped |
| **Dashboard** | Unified command centre aggregating all of the above | — | ✅ Shipped |

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, React 19) | One codebase, RSC, fastest path |
| Language | **TypeScript** strict | Healthcare = no `any` allowed |
| Styling | **Tailwind 4** + custom OKLCH tokens | Brand-aligned, accessible contrast |
| UI primitives | hand-built shadcn-style + Radix | No external lock-in |
| Database | **Postgres** (Supabase managed) | `JSONB` for FHIR, `pgvector` ready |
| ORM | **Drizzle** | Type-safe, FHIR-friendly |
| Auth | **Better-Auth** (self-hosted) | Compliance-friendly, full control |
| AI engine | **Gemini 2.5 Pro** via Vertex AI | Strong multimodal, GCP-Dammam ready |
| Voice | **OpenAI Whisper** | Medical accuracy, EN+AR code-switching |
| Drug data | **RxNorm** + **OpenFDA Drug Label** | Evidence-based, free |
| Coding | **WHO ICD-11**, LOINC, SNOMED-CT | International + NPHIES-aligned |
| Charts | **Recharts** (lazy-loaded) | Lab trends, dashboard analytics |
| Testing | **Vitest 3** | Pure-function unit tests for clinical logic |

> **Regional hosting:** Production targets **GCP Dammam** or **Oracle Riyadh** for SDAIA data-residency. Development uses Supabase (any region).

---

## Project layout

```
medisoft-cos/
├── src/
│   ├── app/
│   │   ├── (app)/               ← authenticated dashboard route group
│   │   │   ├── layout.tsx       ← sidebar + topbar shell (real session check)
│   │   │   ├── error.tsx        ← group-level error boundary
│   │   │   ├── loading.tsx      ← dashboard skeleton
│   │   │   ├── page.tsx         ← Unified Dashboard (live DB)
│   │   │   ├── patients/        ← list + create wizard + detail (5 tabs)
│   │   │   ├── encounters/      ← read-only signed SOAP view
│   │   │   ├── mediscript/      ← voice → SOAP wizard
│   │   │   ├── pharmax/         ← prescription builder + safety panel
│   │   │   ├── medilab/         ← lab entry + range bars + AI narrative
│   │   │   ├── mediscan/        ← image upload + annotation + Vision AI
│   │   │   └── settings/
│   │   ├── (auth)/              ← /login + /signup + group error boundary
│   │   ├── api/                 ← rate-limited AI + search routes
│   │   ├── globals.css          ← Tailwind 4 theme + brand tokens
│   │   ├── layout.tsx           ← root layout (fonts + metadata)
│   │   └── not-found.tsx        ← global 404
│   ├── components/
│   │   ├── brand/logo.tsx
│   │   ├── layout/dashboard-layout.tsx
│   │   ├── mediscan/scan-image-viewer.tsx
│   │   ├── mediscript/audio-recorder.tsx
│   │   ├── ui/                  ← 19 primitives (Dialog, Sheet, Tabs, etc.)
│   │   └── ui/states.tsx        ← shared <EmptyState> / <ErrorState>
│   ├── db/
│   │   ├── schema.ts            ← 7 clinical tables + audit log + auth
│   │   └── index.ts             ← postgres-js + Drizzle client
│   ├── lib/
│   │   ├── actions/             ← server actions (all using requireSession)
│   │   ├── ai/                  ← Gemini, OpenAI, RxNorm, OpenFDA, WHO ICD-11, SFDA stub
│   │   ├── auth-helpers.ts      ← requireSession + enforceRateLimit
│   │   ├── auth.ts              ← Better-Auth config (email verif wired)
│   │   ├── email/               ← driver abstraction + templates
│   │   ├── medilab/             ← biomarker library + classifier + narrative
│   │   ├── mediscan/            ← Gemini Vision orchestrator
│   │   ├── mediscript/          ← SOAP prompt + client
│   │   ├── pharmax/             ← client helpers
│   │   ├── queries/             ← Drizzle reads (typed, soft-delete aware)
│   │   ├── rate-limit/          ← pluggable in-memory store (Upstash-ready)
│   │   ├── storage/scans.ts     ← Supabase Storage adapter
│   │   ├── validations/         ← Zod schemas (single source of truth)
│   │   └── utils.ts             ← cn, formatters, helpers
│   ├── test/                    ← Vitest setup + factories
│   └── env.ts                   ← @t3-oss/env-nextjs validation
├── drizzle.config.ts
├── vitest.config.ts
├── next.config.ts               ← security headers + bundle analyzer
└── .env.example
```

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

> `node_modules` is symlinked to `/var/folders/.../opencode/medisoft-node_modules` to keep iCloud from syncing 500 MB of dependencies.

### 2. Create a Supabase project (free tier)

1. Go to https://supabase.com → New project (pick the closest region to KSA: `ap-south-1` Mumbai is fine for dev).
2. Copy the **Transaction** connection string (port 6543) and **Direct** connection string (port 5432).

### 3. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local — fill in the REQUIRED block (DATABASE_URL, DIRECT_URL,
# BETTER_AUTH_SECRET, NEXT_PUBLIC_APP_URL).
# Generate a secret with:  openssl rand -base64 48
```

**Every other env var is optional.** The app boots without AI keys; modules that depend on them show a clear "Configure X to enable" alert and the manual entry path always works.

### 4. Push the schema

```bash
npm run db:push        # creates all tables in your Supabase Postgres
npm run db:studio      # optional: open Drizzle Studio at https://local.drizzle.studio
```

### 5. Run the app

```bash
npm run dev
# → http://localhost:3000
```

### 6. Verify the build

```bash
npm run typecheck      # tsc --noEmit
npm test               # 184 vitest unit tests
npm run build          # production build, 30 routes
```

---

## Quality commands

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript only — `tsc --noEmit` |
| `npm test` | Run Vitest suite (~580 ms) |
| `npm run test:watch` | Re-run on save |
| `npm run test:coverage` | Coverage report (`coverage/index.html`) |
| `npm run analyze` | `ANALYZE=1 next build` → bundle reports in `.next/analyze/` |
| `npm run db:push` | Drizzle schema push |
| `npm run db:studio` | Drizzle Studio |

---

## Database schema

7 core clinical tables + audit log + 3 auth tables.

| Table | Purpose | Key features |
|---|---|---|
| `users` | Physicians + admins | roles, specialty, Saudi National ID, licence |
| `patients` | FHIR Patient resource | bilingual names, address JSONB, allergies, NPHIES insurance |
| `encounters` | MediScript SOAP notes | raw + corrected transcript, ICD-11 codes, FHIR Composition |
| `prescriptions` | PharmaX MedicationRequest | RxNorm CUI, interactions JSONB, severity-tagged |
| `lab_results` | MediLab DiagnosticReport | LOINC, AI narrative, critical flags, trend analysis |
| `scans` | MediScan ImagingStudy | image storage key, AI findings, mandatory disclaimer |
| `vitals` | FHIR Observation (vital-signs) | BP, HR, temp, SpO₂, BMI |
| `audit_log` | SDAIA-required audit trail | every PHI access, tamper-evident |

All clinical tables use `JSONB` for FHIR resource mirrors, `timestamp with time zone` for everything (UTC), and `deletedAt` soft-deletes for compliance.

---

## Security & compliance posture

- **Server actions** — every mutation goes through `requireSession()`; emits an audit-log entry; uses `revalidatePath()` to keep RSC cache honest.
- **Rate limiting** — all AI routes are user-keyed and policy-bounded (`10/min` Gemini, `10/min` Whisper, `20/min` PharmaX). In-memory today, Upstash-ready (`src/lib/rate-limit/index.ts`).
- **Email verification** — fully wired in Better-Auth; verification email currently logs to console. To make it mandatory: configure a real driver in `src/lib/email/index.ts` and flip `requireEmailVerification: true` in `src/lib/auth.ts`.
- **Soft-delete** — every clinical table queries `WHERE deleted_at IS NULL`.
- **Cookies** — `medisoft_` prefix, `Secure` in production, 12-hour clinical-shift TTL, refreshed every hour, cookie-cached for 5 min.
- **Security headers** — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(self), microphone=(self), geolocation=()`.
- **AI safety** — every Gemini call uses a `responseSchema`; output is defensively re-validated with Zod; AI invention is forbidden by system prompts; medical disclaimers are schema-required on imaging records.

---

## Roadmap

| Phase | Goal | Status |
|---|---|---|
| **1. Foundation** | Schema, auth shell, branded layout | ✅ **Done** |
| **2. Patients + Dashboard** | Real CRUD, search, live aggregates | ✅ **Done** |
| **3. MediScript** | Audio → Whisper → Gemini SOAP → ICD-11 | ✅ **Done** |
| **4. PharmaX** | RxNorm autocomplete + OpenFDA + AI interaction analysis | ✅ **Done** |
| **5. MediLab + MediScan** | Lab narratives + image AI + trend charts | ✅ **Done** |
| **6. Polish** | Tests, error states, mobile, audit middleware, security hardening | ✅ **Done (PR-8a–8d)** |
| **7. Saudi compliance** | Nafath IAM, NPHIES, GCP Dammam deploy, SDAIA audit trail hardening | Next |
| **8. Production lift** | Upstash rate-limit adapter, Resend email driver, observability, CI gates | Next |

---

## Design system

Tokens live in `src/app/globals.css` under `@theme`. The brand colors and gradients are derived directly from the `Medisoft/index.html` brand book one folder up.

| Token | Value | Use |
|---|---|---|
| `--color-brand-pink` | `#E84A8A` | Action / primary CTA |
| `--color-brand-navy` | `#1E3A8C` | Trust / secondary |
| `grad-brand` | cyan → purple → pink → orange | Hero, upgrade card |
| `grad-pink-navy` | pink → navy | Headings, brand CTAs, active state |

---

## License

Proprietary © 2026 MediSoft. All rights reserved.
