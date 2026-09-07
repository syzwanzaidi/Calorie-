-- Run this in the Supabase SQL Editor AFTER running drizzle-kit migrations
-- (so the `profiles` table + enums already exist).
--
-- Creates a `profiles` row with status='pending', role='user' whenever a new
-- user signs up via Supabase Auth (spec Section 3.1).

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, status, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', null),
    'pending',
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
