# Calorie+ — Project Specification

This document is the single source of truth for building Calorie+. Hand this whole file to Claude Code as project context before starting development.

---

## 1. Product Overview

Calorie+ is a web-based calorie and macro tracker for gym-goers, built by a solo developer. It supports three food-logging methods (manual search, barcode scan, AI photo recognition) unified into one system, flexible calorie/macro targets, and progress tracking over time.

**Platform:** Web app (responsive), hosted on Vercel, custom domain.
**Users:** Single admin (the founder) to start, architected for multi-user. **Registration is gated by admin approval** — see Section 3.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Hosting | Vercel |
| Database | Supabase Postgres |
| Auth | Supabase Auth (email/password, **no email verification required**) |
| ORM | Drizzle ORM + drizzle-kit |
| Styling | Tailwind CSS |
| Charts | Recharts or Chart.js |
| Barcode scanning | `@zxing/browser` or `quagga2` (client-side camera) |
| Food database | Open Food Facts REST API (manual search + barcode lookup) |
| AI photo recognition | Claude API (vision), called server-side only |

---

## 3. Authentication & Access Control

This is the most important structural requirement beyond the core PRD — read carefully before building auth.

### 3.1 Sign-up flow
- Standard email/password sign-up via Supabase Auth.
- **Email verification is disabled** — turn this off in Supabase dashboard under Authentication → Providers → Email → "Confirm email" toggle set to off.
- On sign-up, a corresponding row is created in `profiles` with `status = 'pending'` and `role = 'user'` (see schema below). This can happen via a Postgres trigger on `auth.users` insert, or in the sign-up API route right after `supabase.auth.signUp()`.

### 3.2 Approval gate
- A newly registered user can authenticate (Supabase Auth has no concept of "pending"), but **must be blocked from using the app** until an admin approves them.
- After login, the app must check the user's `profiles.status`:
  - `pending` → redirect to a "Your account is awaiting approval" screen. No access to dashboard, logging, or any data routes.
  - `approved` → normal access.
  - `rejected` / `suspended` → redirect to a screen explaining access was denied/revoked. No access.
- **This check must happen in at least two places, not just the UI:**
  1. Server-side in a layout/middleware (e.g. Next.js middleware or a root server layout) that redirects based on status before rendering any protected page.
  2. At the database level via Row Level Security (Section 5) — so even if someone bypasses the UI, they cannot read/write `food_entries`, `targets`, or `weight_logs` unless `status = 'approved'`.
- Any server-side route that calls the Claude vision API (photo logging) **must independently verify `status = 'approved'` before making the API call**, since that's the costly operation this whole gate exists to protect.

### 3.3 Roles
- `role` on `profiles`: `'user'` (default) or `'admin'`.
- You (the founder) should manually set your own `profiles.role = 'admin'` directly in the Supabase Table Editor after your first sign-up — there's no self-service way to become admin, by design.

### 3.4 Admin dashboard
A separate route (e.g. `/admin`), accessible only to users with `role = 'admin'` (enforced both in middleware and RLS). Required functionality:
- **Pending users list** — shows users with `status = 'pending'`, with their email and sign-up date, and Approve / Reject buttons.
- **All users list** — every user with their current status and role, with the ability to change status (approve, reject, suspend an already-approved user) and see basic usage info (e.g. entries logged, last active).
- Approve/reject/suspend actions should be implemented as **server-side actions using the Supabase service role key** (never exposed to the client), which:
  1. Verifies the requester is an admin (check the calling admin's own session/role first).
  2. Updates the target user's `status` (and optionally records `approved_by` / `approved_at`).
- Do **not** expose a client-side RLS policy that lets any authenticated user update `status` or `role` on any row, including their own — those columns should only ever be writable through the admin-gated server action.

---

## 4. Data Model (Drizzle schema)

```ts
import {
  pgTable, uuid, text, integer, real, timestamp, pgEnum,
} from "drizzle-orm/pg-core";

export const mealTypeEnum = pgEnum("meal_type", ["breakfast", "lunch", "dinner", "snack"]);
export const logSourceEnum = pgEnum("log_source", ["manual", "barcode", "photo"]);
export const goalEnum = pgEnum("goal", ["cut", "maintain", "bulk"]);
export const activityLevelEnum = pgEnum("activity_level", ["sedentary", "light", "moderate", "active", "very_active"]);
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const userStatusEnum = pgEnum("user_status", ["pending", "approved", "rejected", "suspended"]);

// Extends Supabase's auth.users with app-specific profile + access-control data.
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = auth.users.id
  displayName: text("display_name"),
  heightCm: real("height_cm"),
  sex: text("sex"),
  birthYear: integer("birth_year"),
  activityLevel: activityLevelEnum("activity_level").default("moderate"),
  goal: goalEnum("goal").default("maintain"),

  role: userRoleEnum("role").notNull().default("user"),
  status: userStatusEnum("status").notNull().default("pending"),
  approvedBy: uuid("approved_by"), // profiles.id of the admin who approved/rejected
  approvedAt: timestamp("approved_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const targets = pgTable("targets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  calories: integer("calories").notNull(),
  proteinG: integer("protein_g").notNull(),
  carbsG: integer("carbs_g").notNull(),
  fatG: integer("fat_g").notNull(),
  source: text("source").notNull().default("manual"), // 'auto' | 'manual'
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).defaultNow(),
});

export const foodEntries = pgTable("food_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: real("quantity").notNull().default(1),
  unit: text("unit"),
  calories: integer("calories").notNull(),
  proteinG: real("protein_g").notNull(),
  carbsG: real("carbs_g").notNull(),
  fatG: real("fat_g").notNull(),
  mealType: mealTypeEnum("meal_type").notNull().default("snack"),
  source: logSourceEnum("source").notNull().default("manual"),
  barcode: text("barcode"),
  loggedAt: timestamp("logged_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const weightLogs = pgTable("weight_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  weightKg: real("weight_kg").notNull(),
  loggedAt: timestamp("logged_at", { withTimezone: true }).defaultNow(),
});
```

---

## 5. Row Level Security (run in Supabase SQL Editor)

```sql
-- Helper: is the current user an admin?
create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- Helper: is the current user approved?
create or replace function is_approved() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and status = 'approved'
  );
$$ language sql security definer;

alter table profiles enable row level security;
alter table targets enable row level security;
alter table food_entries enable row level security;
alter table weight_logs enable row level security;

-- Profiles: users can read/update their own basic info; admins can read/update all.
-- IMPORTANT: role/status/approved_by/approved_at are NOT updatable through this policy —
-- those are only ever changed via the admin server action using the service role key.
create policy "Users read own profile" on profiles for select using (auth.uid() = id or is_admin());
create policy "Users update own basic profile" on profiles for update using (auth.uid() = id);
create policy "Admins manage all profiles" on profiles for all using (is_admin());

-- Targets, food entries, weight logs: only approved users can read/write their own data.
create policy "Approved users manage own targets" on targets for all
  using (auth.uid() = user_id and is_approved());

create policy "Approved users manage own food entries" on food_entries for all
  using (auth.uid() = user_id and is_approved());

create policy "Approved users manage own weight logs" on weight_logs for all
  using (auth.uid() = user_id and is_approved());
```

---

## 6. Core App Features

### 6.1 Food logging (three methods → one unified entry system)
- **Manual entry**: search Open Food Facts by name, select item, adjust portion.
- **Barcode scan**: browser camera (`getUserMedia`) + barcode decode, lookup via Open Food Facts barcode API.
- **Photo/AI**: user photo → server route → Claude vision API with a structured prompt → returns an editable draft entry (user confirms/adjusts portions before saving).
- All three write to `food_entries` with a `source` tag. Support edit/delete on any entry. Support "favorites"/"recent" for one-tap re-logging.

### 6.2 Targets
- Auto-calculated via TDEE (Mifflin-St Jeor or similar, using height/weight/age/sex/activity/goal) **or** manual override.
- New `targets` row inserted on change (history preserved via `effectiveFrom`).

### 6.3 Progress tracking
- Daily view: logged vs. target (calories + macros), remaining budget.
- Trends: weekly/monthly charts per macro.
- Weight tracking: separate log, trend line, tied to cut/bulk/maintain goal.

---

## 7. Screens / Routes

| Route | Access | Purpose |
|---|---|---|
| `/signup`, `/login` | public | Auth |
| `/pending` | authenticated, status = pending | "Awaiting approval" message |
| `/denied` | authenticated, status = rejected/suspended | Access denied message |
| `/dashboard` | authenticated, status = approved | Daily log, macro bars, quick-log actions |
| `/log/search`, `/log/scan`, `/log/photo` | approved | The three logging flows |
| `/trends` | approved | Weekly/monthly charts, weight log |
| `/settings` | approved | Edit profile, targets |
| `/admin` | role = admin | Pending approvals + full user management |

---

## 8. Design System

Premium, data-forward aesthetic — numbers are the hero, hairline dividers instead of card/shadow kits, macro color-coding used consistently everywhere.

```
Light mode:
  --bg: #F2F3EF   --surface: #FFFFFF   --text: #16181C   --text-muted: #6B6E68
  --hairline: #DBDCD5   --accent: #8FB520
  --protein: #C24A34   --carbs: #C48325   --fat: #2E6FA3

Dark mode:
  --bg: #15171B   --surface: #1C1F24   --text: #EDEEE9   --text-muted: #8C8F87
  --hairline: #2C2F34   --accent: #C7ED5E
  --protein: #E8836C   --carbs: #E8B563   --fat: #6FA8D8
```

Typography: **Space Grotesk** (700 weight, tabular numerals) for all numeric data — calories, macros, weight. **Inter** for everything else (nav, labels, body text). This split is deliberate: numbers are the product, so they get the distinct treatment.

---

## 9. Environment Variables

```
DATABASE_URL=            # Supabase pooled connection (port 6543) — runtime queries
DIRECT_URL=               # Supabase direct connection (port 5432) — drizzle-kit migrations
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # server-only — used for admin approve/reject actions, never exposed client-side
ANTHROPIC_API_KEY=            # server-only — used for photo food logging
```

---

## 10. Third-Party Integrations

- **Open Food Facts**: free, no API key required. Barcode lookup + text search endpoints.
- **Claude vision API**: server-side only, structured prompt to extract food items + estimated portions/macros from a photo. Return as an editable draft, never auto-save.
- **Lyfta** (workout tracker) was evaluated for future workout-tracking integration — it has **no public developer API**. If workout tracking is added later, integrate with **Google Fit, Apple Health, Strava, or Fitbit** public APIs instead (Lyfta already syncs to these).

---

## 11. Out of Scope for v1
- Workout/exercise logging (future — see Section 10 note)
- Social features, meal planning/recipes, native mobile app, micronutrient tracking

## 12. Open Questions (decide before/during build)
- Exact TDEE formula and activity multipliers
- Whether photo-logged entries show a confidence indicator
- CSV export — v1 or later?
- Notification method for admin when a new user signs up (email? just check `/admin` periodically?)
