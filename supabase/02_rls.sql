-- Run this in the Supabase SQL Editor after 01_profiles_trigger.sql.
-- This is the RLS from spec Section 5, plus one addition (see the trigger at
-- the bottom): the spec's "Users update own basic profile" policy is a row-
-- level check only — Postgres RLS `using`/`with check` clauses can't
-- restrict individual *columns*, so on their own they would let an
-- authenticated user set their own `role`/`status`/`approved_by`/
-- `approved_at` via a plain PATCH to /rest/v1/profiles. The trigger below
-- closes that gap by silently reverting those four columns to their prior
-- value unless the request is the service role or an existing admin —
-- matching the intent stated in the spec's SQL comment.

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

-- Column-level lockdown for role/status/approved_by/approved_at (see note above).
create or replace function protect_profile_admin_columns() returns trigger as $$
begin
  -- service_role (used by the admin server actions) bypasses this check entirely.
  if auth.role() = 'service_role' then
    return new;
  end if;

  if not is_admin() then
    new.role := old.role;
    new.status := old.status;
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists protect_profile_admin_columns_trigger on profiles;

create trigger protect_profile_admin_columns_trigger
  before update on profiles
  for each row execute function protect_profile_admin_columns();
