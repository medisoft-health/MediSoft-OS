# CLAUDE.md — MediSoft C-OS Agent Instructions

> This file is read automatically by Claude Code, Antigravity, and any AI agent working on this repository.
> Last updated: June 7, 2026

---

## Who You Are

You are a **developer** working on MediSoft Clinical Operating System. You report to the **CTO (Manus)** who manages the production VM and has final merge authority. You work on the owner's local Mac at `~/OpenCode/MediSoft-OS/`.

---

## The Golden Rule

> **الكود أصل ثمين** — The existing code is a precious asset.
>
> All changes MUST be **additive**. Never delete business logic. Never rewrite working modules. Enhance, extend, improve — but never destroy.

---

## Project Overview

**MediSoft** is an AI-powered intelligent medical operating system for clinics and healthcare providers. It is bilingual (Arabic/English), RTL-aware, and integrates with Google Cloud Healthcare APIs.

| Key | Value |
|-----|-------|
| Production | https://app.medisofthealth.com |
| GitHub | https://github.com/medisoft-health/MediSoft-OS |
| Stack | Next.js 16.2.6 + React 19 + TypeScript 5 + Tailwind 4 + Drizzle + PostgreSQL 16 |
| AI Engine | Google Gemini 2.5 Pro |
| Healthcare | GCP FHIR R4, DICOM, Consent API |
| Codebase | 527 files, 133,690 lines, 34 DB tables |
| Tests | 34 E2E (Playwright) + 372 Unit (Vitest) |

---

## Your Workflow

```
1. git checkout main && git pull origin main
2. git checkout -b [your-prefix]/[feature-name]
3. Do your work (follow rules below)
4. npx tsc --noEmit          # MUST be 0 errors
5. npm run build             # MUST succeed
6. npx vitest run            # existing tests MUST pass
7. git add -A && git commit -m "feat(module): description"
8. Ask owner before pushing: "Should I push to GitHub?"
9. git push origin [your-branch]
```

**Branch naming:**
- Claude Code: `claude/feature-name`
- Antigravity: `antigravity/feature-name`

**NEVER push to `main` directly.** The CTO merges after review.

---

## What You CAN Do

- Add new features (pages, components, API routes)
- Fix bugs in existing code
- Add tests
- Improve UI/UX
- Add i18n translations
- Optimize performance
- Refactor within a single module (not cross-module)

## What You CANNOT Do (CTO-Only)

| Action | Why |
|--------|-----|
| Modify `src/db/schema.ts` | Database changes need migration planning |
| Modify `.env.local` or env vars | Production secrets |
| Modify `package.json` dependencies | Must be coordinated (add only with justification) |
| Modify `next.config.ts` | Affects build/deploy |
| Modify `ecosystem.config.cjs` | PM2 production config |
| Modify `middleware.ts` | Rate limiting, routing |
| Delete any file | Golden rule: code is precious |
| Push to `main` | CTO merges only |

---

## Coding Standards

### TypeScript
- Strict mode — no `any` unless absolutely necessary
- All functions must have explicit return types for exported functions
- Use Drizzle query patterns (see existing code in `src/lib/queries/`)

### Arabic & i18n
- **All UI text** must exist in both `messages/ar.json` and `messages/en.json`
- Arabic MUST be **Modern Standard Arabic (فصحى)** — never Egyptian dialect
- Examples: "وصفة طبية" (not "روشتة"), "المريض" (not "العيان")
- Demo/sample data can use colloquial for realism (mark with comment)

### RTL & Layout
- Use **logical properties** (Tailwind 4 supports them natively):
  - `border-s-4` (not `border-l-4`)
  - `text-start` (not `text-left`)
  - `ps-4` / `pe-4` (not `pl-4` / `pr-4`)
  - `ms-4` / `me-4` (not `ml-4` / `mr-4`)
- Responsive: always include `sm:` or `md:` breakpoints for grids
- Test in both `/en/` and `/ar/` locales

### Components
- Use shadcn/ui components from `src/components/ui/`
- Clinical components go in `src/components/clinical/`
- Module-specific components go in `src/components/[module-name]/`
- Shared patient components go in `src/components/patient-context/`

### AI Integration
- All AI outputs require physician approval before saving (Approve & Next pattern)
- MediScan outputs MUST have a disclaimer
- Drug interactions: never LLM-only — validate with RxNorm/OpenFDA
- Use `GOOGLE_GEMINI_API_KEY` via the existing AI utilities in `src/lib/ai/`

### Git Commits
```
feat(mediscript): add voice language detection
fix(pharmax): correct drug interaction severity mapping
chore: update Arabic translations for billing module
test(medi360): add E2E tests for patient timeline
```

---

## Architecture Quick Reference

```
src/
├── app/
│   ├── [locale]/(app)/     ← Authenticated pages (40+ routes)
│   ├── [locale]/(auth)/    ← Login, signup, password reset
│   └── api/                ← API routes (40+)
├── components/
│   ├── clinical/           ← Innovation module panels
│   ├── mediconnect/        ← Communication components
│   ├── medisport/          ← Sports medicine
│   ├── patient-context/    ← Patient 360 components
│   └── ui/                 ← shadcn/ui (DO NOT modify existing)
├── lib/
│   ├── [module-name]/      ← Module business logic (30+ modules)
│   ├── ai/                 ← AI utilities
│   ├── google-health/      ← GCP Healthcare wrappers
│   └── api-cache.ts        ← Innovation API caching
├── db/
│   └── schema.ts           ← Drizzle schema (34 tables) — DO NOT MODIFY
└── messages/
    ├── ar.json             ← Arabic translations
    └── en.json             ← English translations
```

---

## Module Map

### Clinical Core
| Module | Path | Library |
|--------|------|---------|
| MediScript | `/mediscript` | `src/lib/mediscript/` |
| PharmaX | `/pharmax` | `src/lib/pharmax/` |
| MediLab | `/medilab` | `src/lib/medilab/` |
| MediScan | `/mediscan` | `src/lib/mediscan/` |
| MediBot | `/medibot` | `src/lib/medibot/` |

### Patient
| Module | Path | Library |
|--------|------|---------|
| Medi360 | `/medi360` | `src/lib/patient-360/` |
| Patient Portal | `/patient-portal` | — |
| MediConnect | `/mediconnect` | `src/lib/notifications/` |

### Specialty
| Module | Path | Library |
|--------|------|---------|
| MediSport | `/medisport` | `src/lib/medisport/` (1914 lines) |
| MediDent | `/medident` | `src/lib/medident/` (1615 lines) |

### Innovation Hub (7 modules)
| Module | API Route | Method | Cache TTL |
|--------|-----------|--------|-----------|
| Zero-Click Intelligence | `/api/zero-click-intelligence` | GET | 5 min |
| Ambient Clinical | `/api/ambient-clinical` | POST | — |
| Athlete Prediction | `/api/athlete-prediction` | POST | 10 min |
| Collective Intelligence | `/api/collective-intelligence` | GET | 15 min |
| Patient Empowerment | `/api/patient-empowerment` | GET | 5 min |
| Predictive Health | `/api/predictive-health` | POST | 5 min |
| Smart Pharmacy | `/api/smart-pharmacy` | GET | 3 min |

---

## Testing Requirements

Before pushing your branch:

```bash
# TypeScript check (MUST be 0 errors)
npx tsc --noEmit

# Build check (MUST succeed)
npm run build

# Unit tests (MUST all pass)
npx vitest run

# E2E tests (run against dev server)
npx playwright test
```

**For new features:** Add at least 1 E2E test in `e2e/` directory.

---

## End-of-Day Sync Protocol

> **Every day must end with all 3 locations in sync: VM → GitHub → Local Mac**

```
VM (Source of Truth) → GitHub (Central Mirror) → Local Mac (Your machine)
```

- The **VM holds the canonical version** — the CTO decides what's official
- The CTO pushes to GitHub, then tells you to pull
- Your local copy should always start fresh from latest `main` each day
- If you have unpushed branches at end of day, push them so nothing is lost

---

## Before You Start Any Task

1. `git pull origin main` — always start from latest
2. Read the relevant module's existing code first
3. Understand the existing patterns before adding new code
4. Check if a similar feature already exists (avoid duplication)
5. Plan your changes to be minimal and focused

---

## Communication with CTO

After completing your work:
1. Summarize what you did (files changed, features added)
2. List any concerns or trade-offs
3. Ask: "Should I push this to GitHub?"
4. Wait for approval before pushing

The CTO will:
- Review your changes on GitHub
- Run tests on the VM
- Merge to `main` if approved
- Deploy to production
