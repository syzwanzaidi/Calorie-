-- Run this in the Supabase SQL Editor (or it's already applied — see README).
--
-- gemini_api_keys: server-only secret store for the AI photo-analysis
-- provider. RLS is enabled with ZERO policies below, which in Postgres/
-- Supabase means no role — not even an authenticated admin's own session —
-- can read or write this table through PostgREST. Only the service-role
-- client bypasses RLS entirely, which is why every access to this table
-- goes through src/lib/data/apiKeys.ts using createAdminClient(), and every
-- mutation is still gated by requireAdmin() checking the *caller's* session
-- first (same pattern as supabase/02_rls.sql's admin actions) — RLS isn't
-- what stops a non-admin here, requireAdmin() is; RLS is what stops even an
-- admin's own browser session from reading keys back over the normal client.

create table if not exists gemini_api_keys (
  id uuid primary key default gen_random_uuid(),
  label text,
  key_value text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  last_error_at timestamptz,
  last_error text
);

alter table gemini_api_keys enable row level security;
-- Deliberately no policies — see note above.
