-- Run this in the Supabase SQL Editor (or it's already applied — see README).
--
-- gemini_api_keys: per-user secret store for the AI photo-analysis
-- provider. Each user brings their own key(s) — RLS lets a user manage only
-- rows where user_id = their own id, same pattern as targets/food_entries/
-- weight_logs (see 02_rls.sql). A user's own active keys are tried first by
-- src/lib/gemini.ts; keys belonging to an admin are the fallback for a user
-- who hasn't added their own yet.

create table if not exists gemini_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  label text,
  key_value text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  last_error_at timestamptz,
  last_error text
);

alter table gemini_api_keys enable row level security;

drop policy if exists "Approved users manage own gemini keys" on gemini_api_keys;
create policy "Approved users manage own gemini keys" on gemini_api_keys for all
  using (auth.uid() = user_id and is_approved());

-- Fallback-key lookups (a user with no key of their own borrowing an
-- admin's) happen server-side via the service-role client in
-- src/lib/gemini.ts, which bypasses RLS entirely — this policy only governs
-- what a signed-in user's own browser session can see/change directly.
