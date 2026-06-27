# MediSoft C-OS — Pre-Launch Fixes (Claude Code Direct)

## Your Role

You are a Senior Developer working on MediSoft C-OS — an intelligent clinical operating system. The CTO has conducted a full audit and identified 7 critical/high-priority issues that must be fixed before launch. Your job is to fix them precisely and safely.

## STRICT RULES — DO NOT VIOLATE

1. DO NOT delete any existing file
2. DO NOT rewrite entire files — only modify the specific lines needed for the fix
3. DO NOT refactor, rename, or reorganize anything outside the scope of the fix
4. DO NOT touch these files: `.env.local`, `ecosystem.config.cjs`, any nginx config, `docker-compose.yml`
5. DO NOT remove any existing functionality, UI components, or features
6. DO NOT change the database schema unless explicitly required by a task
7. DO NOT install new dependencies unless absolutely necessary for the fix
8. DO NOT run `npm run build` or restart any services — the CTO handles deployment
9. ONLY fix the specific issues listed below — nothing else
10. One fix at a time — commit after each fix with the format: `fix(scope): description`
11. If you are unsure about something, STOP and ask before making changes
12. After each fix, briefly explain what you changed and why

## Project Context

MediSoft C-OS is built with:
- Next.js 16 (App Router) + React 19 + TypeScript 5.8
- PostgreSQL 16 (Drizzle ORM) on Google Cloud SQL
- Better-Auth for authentication (self-hosted, email/password)
- Google Gemini for AI features (MediBot, MediScript, MediLab, MediScan)
- Tailwind CSS 4 + shadcn/ui components
- next-intl for i18n (Arabic + English, RTL support)
- PM2 cluster mode (2 instances) on GCE VM
- Nginx reverse proxy with SSL (Let's Encrypt)

Key directories:
```
src/
  app/[locale]/(app)/    → Dashboard pages (all clinical modules)
  app/[locale]/(auth)/   → Login/signup pages
  app/api/               → API routes (65+ endpoints)
  components/            → Reusable UI components
  lib/                   → Business logic, AI clients, validations, storage
  db/                    → Drizzle schema + queries
```

Auth helper pattern used across the app:
```typescript
// Server actions use:
import { requireSession } from "@/lib/auth-helpers";
const session = await requireSession(); // throws if not authenticated

// API routes use:
import { requireSessionApi } from "@/lib/auth-helpers";
const auth = await requireSessionApi();
if ("response" in auth) return auth.response; // returns 401 JSON
// auth.user is available after this check
```

## Current State (Post-Phase 6)

- TypeScript: 0 errors
- Tests: 322/323 passing (1 failing: MediBot GET test)
- Runtime: 0 crashes (previously had 3, all fixed)
- Build: Successful, deployed
- All 12 clinical modules functional
- Bilingual (AR/EN) with RTL support
- Dark mode implemented

## Tasks — Fix in This Exact Order

### Task 1: Add Authentication to Patient Portal APIs

**Problem:** Two patient portal API routes have ZERO authentication. Anyone can read patient appointments and messages without logging in. This is a critical data privacy violation.

**Files to fix:**
- `src/app/api/patient-portal/appointments/route.ts`
- `src/app/api/patient-portal/messages/route.ts`

**Fix:** Add `requireSessionApi()` at the top of each handler (GET, POST, PUT, DELETE). Follow the exact same pattern used in other protected routes:

```typescript
import { requireSessionApi } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;
  
  // ... existing logic continues unchanged
}
```

Apply to ALL exported handlers (GET, POST, PATCH, DELETE) in both files.

**Commit:** `fix(security): add authentication to patient portal API routes`

---

### Task 2: Sanitize dangerouslySetInnerHTML Usage

**Problem:** 3 files use `dangerouslySetInnerHTML` to render AI-generated content without sanitization. This creates XSS risk where malicious content in AI responses could execute scripts.

**Files to fix (search for `dangerouslySetInnerHTML`):**
- The file in MediLab that renders lab report HTML
- The file in PharmaX that renders print-friendly prescription HTML
- The file in MediBot panel that renders AI response HTML

**Fix:** Install DOMPurify and sanitize all HTML before rendering:

```bash
npm install dompurify @types/dompurify
```

Then in each file, replace:
```typescript
// Before (unsafe):
dangerouslySetInnerHTML={{ __html: htmlContent }}

// After (safe):
import DOMPurify from "dompurify";
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }}
```

If the component is server-side, use `isomorphic-dompurify` instead:
```bash
npm install isomorphic-dompurify
```

**Commit:** `fix(security): sanitize dangerouslySetInnerHTML with DOMPurify`

---

### Task 3: Fix Scan Storage (Migrate from Supabase to GCS)

**Problem:** `src/lib/storage/scans.ts` imports `@supabase/supabase-js` but no Supabase environment variables are configured. Scan uploads return 503 error. The app already uses Google Cloud Storage for DICOM — we should use GCS for scan images too.

**Files to fix:**
- `src/lib/storage/scans.ts` — Rewrite to use GCS instead of Supabase

**Fix:** Check if there's already a GCS client configured in the project (look for `@google-cloud/storage` in `package.json` or any existing GCS helper). If yes, use the same client. If not, create a new GCS storage helper using the existing service account.

The new implementation should:
1. Keep the same exported function signatures (`uploadScanImage`, `getScanUrl`, `deleteScanImage`, `isStorageConfigured`)
2. Use GCS bucket instead of Supabase bucket
3. Use signed URLs for private access (scans are sensitive medical images)
4. Check for `GCS_BUCKET_NAME` and `GOOGLE_APPLICATION_CREDENTIALS` env vars

If GCS setup is too complex without knowing the exact credentials, an alternative approach:
- Use the local filesystem with a `/uploads/scans/` directory as a temporary solution
- Add a clear TODO comment that this needs GCS migration
- Make `isStorageConfigured()` return `true` so the upload flow works

**Commit:** `fix(storage): migrate scan storage from Supabase to GCS`

---

### Task 4: Add Error Boundary for Stale Server Actions

**Problem:** After deployments, users with cached pages get "Failed to find Server Action" errors because the action IDs changed. This creates a confusing experience.

**Fix:** Create or update the error boundary to catch this specific error and show a "Please refresh" message:

**File:** `src/app/[locale]/(app)/error.tsx` (already exists — enhance it)

Add detection for the Server Action error pattern and show a user-friendly message with a refresh button:

```typescript
// In the error component, check if the error message contains "Server Action"
if (error.message?.includes("Server Action") || error.digest?.includes("NEXT_NOT_FOUND")) {
  // Show: "The app has been updated. Please refresh to continue."
  // With a refresh button that calls window.location.reload()
}
```

Also add the same check in `src/app/[locale]/(auth)/error.tsx`.

**Commit:** `fix(ux): add refresh prompt for stale server action errors`

---

### Task 5: Fix MediBot GET Endpoint

**Problem:** The test `MediBot > returns status on GET` fails because `/api/medibot` only has a POST handler. The test expects a GET endpoint that returns the bot's status/availability.

**File:** `src/app/api/medibot/route.ts`

**Fix:** Add a simple GET handler that returns the bot's configuration status:

```typescript
export async function GET() {
  const client = getGeminiClient();
  return NextResponse.json({
    available: !!client,
    model: client ? GEMINI_MODEL : null,
    features: ["patient-mode", "general-mode", "mediguard-safety"],
    version: "2.0"
  });
}
```

Note: This GET endpoint should NOT require authentication (it's a health/status check).

**Commit:** `fix(api): add GET status endpoint to medibot route`

---

### Task 6: Add try/catch to Unprotected Routes

**Problem:** 4 API routes lack try/catch error handling. Unhandled exceptions could leak stack traces to clients.

**Files:**
- `src/app/api/mediscan/image/[id]/route.ts`
- `src/app/api/medilab/symptoms/route.ts`
- `src/app/api/notifications/count/route.ts`

**Fix:** Wrap the handler body in try/catch with a generic error response:

```typescript
export async function GET(req: NextRequest) {
  try {
    // ... existing code
  } catch (error) {
    console.error("[API_NAME] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

Do NOT change the existing logic — only wrap it.

**Commit:** `fix(api): add error handling to unprotected routes`

---

### Task 7: Configure Email Driver Fallback

**Problem:** `src/lib/email/index.ts` has no email driver configured. Password reset and email verification won't work. The file already has a console fallback but it should be more explicit.

**File:** `src/lib/email/index.ts`

**Fix:** Ensure the email module:
1. Checks for `RESEND_API_KEY` env var
2. If not set, logs a clear warning at startup (once, not per-request)
3. Falls back to console.log with a formatted email preview
4. Returns `{ success: true, provider: "console" }` so the auth flow doesn't break
5. Add a comment explaining how to configure Resend when ready

Do NOT install Resend package — just make sure the fallback works cleanly without crashing.

**Commit:** `fix(email): ensure clean fallback when email driver not configured`

---

## After All Tasks

Run TypeScript check to confirm 0 errors:
```bash
npx tsc --noEmit
```

Run tests to confirm the MediBot test now passes:
```bash
npx vitest run
```

Then provide a summary of all changes made.

## Git Workflow

```bash
# Before starting:
git checkout -b pre-launch-fixes

# After each task:
git add -A
git commit -m "fix(scope): description"

# After all tasks:
git push origin pre-launch-fixes
```

The CTO will review, merge to main, build, and deploy.
