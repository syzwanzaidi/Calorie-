# Calorie+

Calorie and macro tracker for gym-goers. See [CALORIE_PLUS_SPEC.md](./CALORIE_PLUS_SPEC.md)
for the full product spec this app is built from.

## Stack

Next.js (App Router) · Supabase (Postgres + Auth) · Drizzle ORM (schema/migrations
only — see note below) · Tailwind CSS · Recharts · `@zxing/browser` (barcode) ·
Open Food Facts API · Claude API (photo food recognition).

## First-time setup

1. **Create a Supabase project.**
2. **Disable email confirmation:** Supabase dashboard → Authentication → Providers
   → Email → turn off "Confirm email". Sign-up must work with no email step
   (spec 3.1).
3. **Copy env vars.** Copy `.env.local.example` to `.env.local` and fill in:
   - `DATABASE_URL` — Supabase pooled connection string (port 6543)
   - `DIRECT_URL` — Supabase direct connection string (port 5432), used only
     by drizzle-kit
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project
     Settings → API
   - `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API (**server-only,
     never commit**)
   - `ANTHROPIC_API_KEY` — for photo food logging
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
  before calling Claude, since that's the costly operation the whole gate
  exists to protect.
- **Admin mutations** (`src/app/admin/actions.ts`) always check the
  *requester's* own admin status first via their session, then perform the
  actual write with the service-role client — never through a
  client-writable RLS policy, per spec 3.4.

## Open questions from the spec, as resolved in this build

- **TDEE formula** (`src/lib/tdee.ts`): Mifflin-St Jeor + standard activity
  multipliers, ±20%/+15% for cut/bulk, protein set relative to bodyweight
  (2.0 g/kg cutting, 1.8 g/kg otherwise), fat at 28% of calories, carbs fill
  the remainder. Easy to retune if you want different numbers.
- **Photo-log confidence indicator:** yes — each item Claude extracts from a
  photo carries a low/medium/high confidence badge in the review UI
  (`src/components/PhotoLogger.tsx`).
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
