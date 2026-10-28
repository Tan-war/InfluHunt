-- InfluHunt, phase 1: account roles, recruiter profiles, and the avatars Storage bucket.
-- Run after 20261022000000_profiles.sql. Paste into Supabase → SQL Editor → New query → Run.
-- Safe to run again.

-- 1. Role: each account is either an applicant or a recruiter, set once.
alter table public.profiles
  add column if not exists role text check (role in ('applicant', 'recruiter'));

-- Existing applicants who already completed their profile.
update public.profiles set role = 'applicant' where role is null and profile_completed;

-- The browser can't write `role` directly: the column grants in the first migration list
-- only the profile form's columns, and `role` isn't one of them. The one way to set it is
-- this function, and only while it's still empty.
create or replace function public.set_my_role(new_role text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_signed_in';
  end if;
  if new_role not in ('applicant', 'recruiter') then
    raise exception 'invalid_role';
  end if;

  update public.profiles set role = new_role where id = uid and role is null;
  if not found then
    -- Either the role is already set, or (rarely) the profile row is missing.
    if exists (select 1 from public.profiles where id = uid) then
      raise exception 'role_already_set';
    end if;
    insert into public.profiles (id, email, role)
    select u.id, u.email, new_role from auth.users u where u.id = uid;
  end if;
  return new_role;
end;
$$;

revoke all on function public.set_my_role(text) from public, anon;
grant execute on function public.set_my_role(text) to authenticated;

-- 2. Recruiter profiles: public, so applicants can see who they're applying to.
create table if not exists public.recruiter_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  brand_name text not null,                 -- channel / brand name
  email text not null,                      -- from sign-in; filled by the trigger below
  primary_link text not null check (primary_link ~* '^https://'),
  logo_url text,
  niche text,
  platforms text[] not null default '{}',
  bio text check (char_length(bio) <= 500),
  profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Email always comes from the sign-in account, and "completed" is worked out here, so the
-- browser can't fake either. Completed = every step 1 field is filled.
create or replace function public.recruiter_profiles_fill()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.email := (select u.email from auth.users u where u.id = new.id);
  new.profile_completed :=
    coalesce(btrim(new.display_name), '') <> ''
    and coalesce(btrim(new.brand_name), '') <> ''
    and coalesce(btrim(new.primary_link), '') <> ''
    and coalesce(btrim(new.logo_url), '') <> ''
    and coalesce(btrim(new.niche), '') <> '';
  return new;
end;
$$;

drop trigger if exists recruiter_profiles_fill on public.recruiter_profiles;
create trigger recruiter_profiles_fill
  before insert or update on public.recruiter_profiles
  for each row execute function public.recruiter_profiles_fill();

drop trigger if exists recruiter_profiles_set_updated_at on public.recruiter_profiles;
create trigger recruiter_profiles_set_updated_at
  before update on public.recruiter_profiles
  for each row execute function public.set_updated_at();

alter table public.recruiter_profiles enable row level security;

drop policy if exists "Anyone can view recruiter profiles" on public.recruiter_profiles;
create policy "Anyone can view recruiter profiles"
  on public.recruiter_profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "Recruiters can create their own profile" on public.recruiter_profiles;
create policy "Recruiters can create their own profile"
  on public.recruiter_profiles for insert
  to authenticated
  with check (
    (select auth.uid()) = id
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'recruiter')
  );

drop policy if exists "Recruiters can update their own profile" on public.recruiter_profiles;
create policy "Recruiters can update their own profile"
  on public.recruiter_profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Column privileges: email and profile_completed are set by the trigger, not the browser.
revoke insert, update on public.recruiter_profiles from anon, authenticated;
grant insert (id, display_name, brand_name, primary_link, logo_url, niche, platforms, bio)
  on public.recruiter_profiles to authenticated;
grant update (id, display_name, brand_name, primary_link, logo_url, niche, platforms, bio)
  on public.recruiter_profiles to authenticated;

-- 3. Storage: "avatars" bucket for photos and logos. Public to read; 2 MB; jpg/png/webp.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Each user can only add, replace or remove files in their own folder: avatars/<user id>/...
-- Images are shown through their public URLs, which a public bucket serves to everyone with
-- no policy. The select policy below is only what replacing a file needs, and it's limited
-- to the user's own folder so nobody can list everyone's files.
drop policy if exists "Avatar images are publicly readable" on storage.objects;
drop policy if exists "Users can see files in their own avatar folder" on storage.objects;
create policy "Users can see files in their own avatar folder"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can upload to their own avatar folder" on storage.objects;
create policy "Users can upload to their own avatar folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can replace files in their own avatar folder" on storage.objects;
create policy "Users can replace files in their own avatar folder"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can delete files in their own avatar folder" on storage.objects;
create policy "Users can delete files in their own avatar folder"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
