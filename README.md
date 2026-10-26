# Calorie+

A calorie and macro tracker for gym-goers. Log food three ways (search, barcode scan, or a photo analysed by AI), set calorie and macro targets from your own stats, and watch your progress over time. New accounts are approved by an admin before they can use the app.

See [CALORIE_PLUS_SPEC.md](./CALORIE_PLUS_SPEC.md) for the full product spec this app is built from.

## Features

**Food logging, three ways, one unified log**
- **Search:** look up foods in the Open Food Facts database and adjust the portion
- **Barcode scan:** use the device camera to scan a product and pull its nutrition data
- **AI photo:** take a photo of a meal and Gemini returns an editable draft with each item's estimated macros and a low/medium/high confidence badge. Nothing is saved until you confirm
- Edit or delete any entry, and re-log recent foods in one tap

**Targets**
- Calculated from height, weight, age, sex, activity level and goal (cut, maintain or bulk) with the Mifflin-St Jeor formula, or set manually
- Every change is stored as a new row, so target history is kept

**Progress**
- Daily dashboard showing logged vs. target for calories and macros, and the budget remaining
- Trend charts for calories and macros over the last 14 days
- Weight log with a 90-day trend line

**Access control**
- Email and password sign-up with no email step
- Every new account starts as `pending` until an admin approves it at `/admin`
- Approval is enforced in three layers: route-level proxy, server-side checks in every gated layout, action and route handler, and Postgres Row Level Security
- Each user can add their own Gemini API key in Settings, so AI photo usage is not limited by one shared quota

## Screens

| Route | Access | Purpose |
|---|---|---|
| `/signup`, `/login` | public | Create an account and sign in |
| `/pending` | signed in, awaiting approval | Waiting-for-approval message |
| `/denied` | signed in, rejected or suspended | Access denied message |
| `/dashboard` | approved | Daily log, macro meters, quick logging |
| `/log/search`, `/log/scan`, `/log/photo` | approved | The three logging flows |
| `/trends` | approved | Calorie, macro and weight charts |
| `/settings` | approved | Profile, targets and Gemini keys |
| `/admin` | admin | Approve sign-ups and manage users |

## Stack

Next.js (App Router) and React, Supabase (Postgres and Auth), Drizzle ORM (schema and migrations only, see the architecture notes below), Tailwind CSS, Recharts, `@zxing/browser` for barcode scanning, the Open Food Facts API, and the Gemini API for photo food recognition. Designed to be hosted on Vercel.

## First-time setup

1. **Create a Supabase project.**
2. **Disable email confirmation:** Supabase dashboard → Authentication → Providers
   → Email → turn off "Confirm email". Sign-up must work with no email step
   (spec 3.1).
3. **Create `.env.local`** in the project root (env files are git-ignored, so there is no example file in the repo) with:
   - `DATABASE_URL` — Supabase pooled connection string (port 6543)
   - `DIRECT_URL` — Supabase direct connection string (port 5432), used only
     by drizzle-kit
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project
     Settings → API
   - `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API (**server-only,
     never commit**)
   - `GEMINI_API_KEY` — bootstrap/fallback key for photo food logging (get
     one free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)).
     Once the app is running, each user can add their own key at
     Settings → AI photo analysis instead — see the note below.
4. **Install deps:** `npm install`
5. **Create the schema:** `npm run db:push` (or `npm run db:generate` +
   apply the generated SQL, if you'd rather review migrations before
   applying them)
6. **Run the Supabase-only SQL**, in order, in the Supabase SQL Editor (these
   aren't Drizzle-managed — triggers and RLS policies live outside the
   Drizzle schema):
   - `supabase/01_profiles_trigger.sql` — auto-creates a `profiles` row
     (`status='pending'`) on sign-up
   - `supabase/02_rls.sql` — Row Level Security policies (the spec's
     Section 5 SQL, plus a column-lock trigger — see the comment at the top
     of that file for why)
   - `supabase/03_gemini_keys.sql` — the `gemini_api_keys` table (with RLS)
     used for per-user Gemini keys in Settings
7. **Sign up** once through the running app, then in the Supabase Table
   Editor set your own `profiles.role = 'admin'` and `profiles.status =
   'approved'` — there's no self-service way to become admin, by design
   (spec 3.3).
8. `npm run dev` and go to `/admin` to approve future sign-ups.

## Architecture notes worth knowing before you touch this

- **Drizzle vs. runtime queries.** `src/db/schema.ts` is the source of truth
  for the schema and is what `drizzle-kit` reads to generate/push migrations.
  But `src/db/index.ts` (a direct `postgres.js` connection via `DATABASE_URL`)
  is **not** used anywhere in the request path — that connection
  authenticates as a role that bypasses Row Level Security, which would
  silently defeat RLS as an enforcement layer. All runtime reads/writes
  (`src/lib/data/*.ts`) go through the Supabase client instead
  (`src/lib/supabase/server.ts` / `client.ts`), which carries the signed-in
  user's JWT and is subject to RLS. `src/lib/supabase/types.ts` is a
  hand-written `Database` type mirroring the Drizzle schema in
  PostgREST's (snake_case) shape — regenerate it with
  `npx supabase gen types typescript` if you'd rather not hand-maintain it.
- **`src/proxy.ts`, not `middleware.ts`.** This project is on Next.js 16,
  which renamed the middleware file convention to `proxy` and changed a few
  of its semantics — see the comment at the top of that file.
- **Three-layer approval gate** (spec 3.2): `src/proxy.ts` (route-level
  redirect), `requireApproved()`/`requireAdmin()` in `src/lib/auth.ts`
  (re-checked in every gated layout, Server Action, and Route Handler), and
  Postgres RLS (`supabase/02_rls.sql`). The photo-logging route
  (`src/app/api/log/photo/route.ts`) independently re-verifies approval
  before calling Gemini — that's still the point of the gate even on a free
  tier, since free-tier quota is a shared, finite resource too.
- **Admin mutations** (`src/app/admin/actions.ts`) always check the
  *requester's* own admin status first via their session, then perform the
  actual write with the service-role client — never through a
  client-writable RLS policy, per spec 3.4.
- **Gemini keys are per-user, not a single shared secret.** `gemini_api_keys`
  (`supabase/03_gemini_keys.sql`) has a normal RLS policy — `auth.uid() =
  user_id` — same pattern as `targets`/`food_entries`/`weight_logs`, managed
  at Settings → AI photo analysis by every approved user for themselves (not
  admin-gated; there's nothing secret about *which* key is yours to see).
  `analyzeFoodPhoto()` (`src/lib/gemini.ts`) tries the calling user's own
  active keys first, then an admin's as a fallback for someone who hasn't
  added their own yet, then `GEMINI_API_KEY` as a last resort — so usage
  scales with the number of users instead of one key's free-tier quota being
  shared by everyone. Resolving the fallback tier requires the service-role
  client (a user's own RLS-scoped session can't see another user's key row),
  so that lookup lives server-side in `src/lib/data/apiKeys.ts` and is never
  exposed through a Server Action.
- **The Gemini SDK retries 429/5xx internally by default** — up to 5
  attempts, backoff up to 60s, completely invisible to the caller. Stacked
  under this app's own model/key fallback, that turned one real test into a
  131-second call before finally succeeding (measured live during
  development). Every call in `src/lib/gemini.ts` now disables that
  (`retryOptions: { attempts: 1 }`) and sets an explicit per-request timeout
  instead, plus a wall-clock deadline across the whole key/model fallback
  chain — worth knowing if you ever add another provider here, since the
  same footgun likely exists in other SDKs too.

## Open questions from the spec, as resolved in this build

- **TDEE formula** (`src/lib/tdee.ts`): Mifflin-St Jeor + standard activity
  multipliers, ±20%/+15% for cut/bulk, protein set relative to bodyweight
  (2.0 g/kg cutting, 1.8 g/kg otherwise), fat at 28% of calories, carbs fill
  the remainder. Easy to retune if you want different numbers.
- **Photo-log confidence indicator:** yes — each item Gemini extracts from a
  photo carries a low/medium/high confidence badge in the review UI
  (`src/components/PhotoLogger.tsx`).
- **Photo-recognition provider:** the spec (Section 2/10) specifies the
  Claude API. This build uses the Gemini API instead (`src/lib/gemini.ts`,
  `gemini-3.8-flash`) at the user's explicit request, to use its free tier
  rather than pay for Anthropic API credits — and per-user keys (see above)
  rather than one shared key, so usage isn't bottlenecked on a single
  account's quota as more users sign up.
- **CSV export:** not in this build — flagged as a fast follow.
- **Admin notification on new sign-up:** not in this build (periodic `/admin`
  checks only) — an email notification would need a transactional email
  provider, which the spec didn't specify.

## One design-system note

The spec's macro palette (`--protein`/`--carbs`/`--fat`) has the
protein↔carbs pair below the recommended normal-vision distinguishability
threshold in both light and dark mode (they're close in hue/lightness). I
kept the spec's exact hex values as given rather than override a stated
brand decision, but every place that uses them also carries a text label
(legend, tooltip, or inline text) so identity is never color-alone. If you
want the pair easier to tell apart at a glance, nudging `--carbs` toward a
more yellow/green hue (away from `--protein`'s red-orange) would fix it.

## Scripts

- `npm run dev` / `build` / `start` / `lint`
- `npm run db:generate` — generate a Drizzle migration from schema changes
- `npm run db:push` — push the schema directly (good for early development)
- `npm run db:studio` — Drizzle Studio, browse the DB
