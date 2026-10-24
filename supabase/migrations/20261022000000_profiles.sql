-- InfluHunt: applicant profiles.
-- Paste into Supabase → SQL Editor → New query, then Run. Safe to run again.

-- 1. Table. Columns match the profile form (src/components/ProfileForm.jsx).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,                                  -- from sign-in; the app can't change it (see grants below)
  full_name text,                              -- form: Name
  avatar_url text,                             -- form: Photo (Google photo URL, or an uploaded image as a small data URL for now)
  roles text[] not null default '{}',          -- form: What do you do, or want to try? (up to 3)
  role_other text,                             -- form: the "Other" role text
  work_links text[] not null default '{}',     -- form: Show us your work (up to 5)
  no_work_yet boolean not null default false,  -- form: "I'm just starting..." checkbox
  starting_note text,                          -- form: what they'd like to try first (when no_work_yet)
  skills text[] not null default '{}',         -- form: Skills (up to 5)
  bio text,                                    -- form: Short bio
  city text,                                   -- form: City
  phone text,                                  -- form: Phone number, +91XXXXXXXXXX. Private: only InfluHunt may see it
  channel text,                                -- form: Your own channel or page
  profile_completed boolean not null default false, -- true once the form is saved with all required fields
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Create a profile row whenever someone signs up, filled from Google's metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Anyone who signed in before this migration ran gets a row too.
insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
from auth.users u
on conflict (id) do nothing;

-- 3. Keep updated_at current.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 4. Row Level Security: a signed-in user can read, create and update only their own row.
alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- TODO (recruiter side): recruiters will need a read policy for applicants who applied
-- to their gigs. RLS works on whole rows, so before adding it, move `phone` (private)
-- out of this table or expose profiles to recruiters through a view without it.

-- 5. Column privileges: the app may write every column except email (and the
-- timestamps). Applications go to the verified sign-in address, so it stays read-only.
revoke insert, update on public.profiles from anon, authenticated;
grant insert (id, full_name, avatar_url, roles, role_other, work_links, no_work_yet, starting_note,
              skills, bio, city, phone, channel, profile_completed)
  on public.profiles to authenticated;
grant update (id, full_name, avatar_url, roles, role_other, work_links, no_work_yet, starting_note,
              skills, bio, city, phone, channel, profile_completed)
  on public.profiles to authenticated;
