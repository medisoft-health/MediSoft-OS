# MediSoft C-OS — Deployment Guide

> Get the app running live in ~15 minutes. Free tier everywhere.

---

## Prerequisites

- **Node.js 20+** installed locally
- A **GitHub** account (for Vercel deployment)
- A **Supabase** account (free tier: https://supabase.com)
- A **Vercel** account (free tier: https://vercel.com)

---

## Step 1: Create a Supabase Project

1. Go to https://supabase.com → **New project**
2. Pick a name (e.g. `medisoft-cos`)
3. Choose the **closest region to KSA** (Mumbai `ap-south-1` for dev; Dammam via GCP for production later)
4. Set a strong database password — save it somewhere safe
5. Wait for the project to provision (~30 seconds)

### Get your connection strings

Go to **Settings → Database** and copy:

| What | Where to find | Port |
|---|---|---|
| **Transaction (pooled)** | Connection string → Transaction | 6543 |
| **Direct** | Connection string → Direct | 5432 |

You'll use the **Transaction** URL as `DATABASE_URL` (runtime) and the **Direct** URL as `DIRECT_URL` (migrations only).

### Get your Supabase keys (optional — for MediScan image storage)

Go to **Settings → API** and copy:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> These are only needed if you want MediScan image persistence. Without them, the app still works — image save is disabled with a clear message.

### Create the `scans` bucket (optional)

If you set the Supabase keys above:
1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket** → name it `scans` → set it to **Private**
3. That's it — the app handles uploads and signed URLs automatically

---

## Step 2: Configure Environment

```bash
# Clone the repo (if you haven't)
git clone https://github.com/YOUR_ORG/medisoft-cos.git
cd medisoft-cos/app/medisoft-cos

# Copy the example env file
cp .env.example .env.local
```

Edit `.env.local` and fill in the **REQUIRED** section:

```env
# REQUIRED
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

DATABASE_URL=postgresql://postgres.XXXX:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.XXXX:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres

BETTER_AUTH_SECRET=<run: openssl rand -base64 48>
BETTER_AUTH_URL=http://localhost:3000
```

> **Generate the auth secret**: `openssl rand -base64 48`

### Optional keys (app works without them)

```env
# AI — enables MediScript, PharmaX AI, MediLab narratives, MediScan analysis
GOOGLE_GEMINI_API_KEY=        # https://aistudio.google.com/apikey
OPENAI_API_KEY=               # https://platform.openai.com/api-keys

# Medical APIs
OPENFDA_API_KEY=              # https://open.fda.gov/apis/authentication/
WHO_ICD_CLIENT_ID=            # https://icd.who.int/icdapi
WHO_ICD_CLIENT_SECRET=

# Storage (MediScan images)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Step 3: Install & Push Schema

```bash
# Install dependencies
npm install

# Push the schema to Supabase (creates all tables)
npm run db:push
```

You should see output like:
```
[✓] Changes applied to database
```

### Verify in Drizzle Studio (optional)

```bash
npm run db:studio
# Opens https://local.drizzle.studio — browse your tables
```

---

## Step 4: Seed Demo Data

```bash
npm run db:seed
```

Output:
```
🌱 MediSoft seed — starting…

  ✓ Created admin: admin@medisoft.sa / medisoft-demo-2026
  ✓ Created physician: dr.sarah@medisoft.sa / medisoft-demo-2026
  ✓ Created patient: Ahmed Mostafa → MS-000001
  ✓ Created patient: Layla Hassan → MS-000002
  ✓ Created patient: Omar Al-Khalidi → MS-000003

🏁 Seed complete.

  Demo credentials:
    Admin:     admin@medisoft.sa / medisoft-demo-2026
    Physician: dr.sarah@medisoft.sa / medisoft-demo-2026
```

---

## Step 5: Run Locally

```bash
npm run dev
# → http://localhost:3000
```

Sign in with `admin@medisoft.sa` / `medisoft-demo-2026`.

### Verify everything works

| Action | Expected |
|---|---|
| Sign in | Dashboard loads with 3 patients in the KPI |
| `/patients` | Ahmed, Layla, Omar appear in the grid |
| Click Ahmed | Detail page with 5 tabs, allergies, conditions |
| `/mediscript/new` | Patient picker + voice recorder |
| `/pharmax/new` | Drug search (RxNorm works immediately, no key) |
| `/medilab/new` | Panel picker with CBC, BMP, etc. |
| `/mediscan/new` | Image upload + annotation tools |
| `/settings` | Profile edit, password change, sessions |

---

## Step 6: Deploy to Vercel

### Option A: One-click deploy

1. Push your code to GitHub
2. Go to https://vercel.com/new
3. Import the repository
4. Set the **Root Directory** to `app/medisoft-cos`
5. Add your environment variables (same as `.env.local`, but with production values):

| Variable | Production value |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `BETTER_AUTH_URL` | `https://your-app.vercel.app` |
| `DATABASE_URL` | Your Supabase pooled URL |
| `DIRECT_URL` | Your Supabase direct URL |
| `BETTER_AUTH_SECRET` | The same secret you generated |
| `NODE_ENV` | `production` |

6. Click **Deploy**

### Option B: CLI deploy

```bash
# Install Vercel CLI
npm i -g vercel

# From the app directory
cd app/medisoft-cos
vercel

# Follow the prompts — set the root directory to .
# Add env vars when prompted (or via the Vercel dashboard)
```

### After deploy

1. Update `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` to your actual Vercel URL
2. Redeploy (Vercel auto-deploys on env change)
3. Run the seed script pointing to your production DB:
   ```bash
   DATABASE_URL=<production-url> npm run db:seed
   ```

---

## Step 7: Post-Deploy Checklist

| Item | Status |
|---|---|
| Sign in works with demo credentials | ☐ |
| Dashboard shows 3 patients | ☐ |
| Patient creation works | ☐ |
| Vitals recording + trend chart works | ☐ |
| MediScript voice recording works (browser mic) | ☐ |
| PharmaX drug search works (RxNorm, no key needed) | ☐ |
| Cmd+K global search works | ☐ |
| Settings → profile edit + password change works | ☐ |
| Locale switcher (EN ↔ AR) works | ☐ |
| Mobile layout (sidebar → hamburger menu) works | ☐ |

### Optional: Enable AI features

| Feature | What to set | Where to get it |
|---|---|---|
| Whisper transcription | `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| Gemini SOAP / narrative / vision | `GOOGLE_GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| WHO ICD-11 code verification | `WHO_ICD_CLIENT_ID` + `WHO_ICD_CLIENT_SECRET` | https://icd.who.int/icdapi |
| Higher OpenFDA rate limit | `OPENFDA_API_KEY` | https://open.fda.gov/apis/authentication/ |
| MediScan image persistence | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `scans` bucket | Supabase dashboard |

Add these to Vercel's Environment Variables and redeploy. No code changes needed.

---

## Architecture notes for production

### Rate limiting
The in-memory rate limiter works for single-instance Vercel deployments (each serverless function instance has its own counter). For multi-instance or high-traffic:
1. Create a free Upstash Redis instance: https://upstash.com
2. Add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` to env
3. Implement the Upstash adapter in `src/lib/rate-limit/index.ts` (interface is ready)

### Email verification
The email plumbing is wired but `requireEmailVerification` is `false`. To enable:
1. `npm install resend`
2. Uncomment the Resend driver in `src/lib/email/index.ts`
3. Add `RESEND_API_KEY` to env
4. Set `requireEmailVerification: true` in `src/lib/auth.ts`

### Saudi compliance (GCP Dammam)
For SDAIA data-residency:
1. Provision a GCP project in the Dammam region
2. Move from Supabase → Cloud SQL for PostgreSQL (same schema, different connection string)
3. Switch from Gemini API-key to Vertex AI with ADC auth
4. Configure Nafath IAM (Saudi national ID OAuth) as a Better-Auth provider

These are infrastructure changes — no code refactoring needed.

---

## Troubleshooting

### "Invalid environment variables" on startup
→ Missing required env vars. Check `.env.local` has all 4 required vars.

### "You are using the default secret" warning
→ `BETTER_AUTH_SECRET` is not set or is the placeholder. Generate one: `openssl rand -base64 48`

### Schema push fails with "connection refused"
→ Check your `DIRECT_URL` — it should use port 5432 (direct), not 6543 (pooled).

### Seed script fails with "duplicate key"
→ Safe to ignore. The seed checks for existing records and skips them. Run again without worry.

### MediScan "Save" button disabled
→ Supabase Storage not configured. Set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` and create a `scans` bucket.

### AI features show "Configure to enable" alerts
→ Expected. Set the appropriate API keys and redeploy. No code changes needed.
