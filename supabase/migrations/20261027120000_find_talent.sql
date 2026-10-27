-- InfluHunt, phase 4: Find Talent and safe candidate data.
-- Run after 20261027000000_applications.sql. Paste into Supabase → SQL Editor → New query → Run.
-- Safe to run again.

-- 1. New applicant profile fields that the Find Talent filters need. All optional, so
-- existing profiles stay complete; people who leave them empty just don't match that filter.
alter table public.profiles
  add column if not exists experience_level text,                  -- same levels as jobs.experience_required
  add column if not exists job_types text[] not null default '{}', -- job types they're open to
  add column if not exists platforms text[] not null default '{}'; -- platforms they've worked on

alter table public.profiles drop constraint if exists profiles_experience_level_check;
alter table public.profiles add constraint profiles_experience_level_check
  check (experience_level in ('fresher', '0_1', '1_3', '3_plus'));

alter table public.profiles drop constraint if exists profiles_job_types_check;
alter table public.profiles add constraint profiles_job_types_check
  check (job_types <@ array['full_time', 'part_time', 'freelance', 'internship']);

alter table public.profiles drop constraint if exists profiles_platforms_check;
alter table public.profiles add constraint profiles_platforms_check check (cardinality(platforms) <= 5);

-- The profile form may write the new columns (grants are per column; see the first migration).
grant insert (experience_level, job_types, platforms) on public.profiles to authenticated;
grant update (experience_level, job_types, platforms) on public.profiles to authenticated;

-- 2. What a recruiter may see of an applicant. Public fields only: never email, phone or city.
do $$
begin
  create type public.candidate_profile as (
    id uuid,
    full_name text,
    avatar_url text,
    roles text[],            -- type of creator
    role_other text,         -- what they typed for "Other"
    skills text[],
    experience_level text,
    job_types text[],
    platforms text[],
    work_links text[],
    bio text,
    is_just_starting boolean,
    starting_note text,      -- "what I'd like to try first", written for creators to read
    created_at timestamptz
  );
exception
  when duplicate_object then null;
end
$$;

-- The one gate. Profiles keep their "own row only" rules (no broad recruiter read policy);
-- this function reads past them, but only for signed-in recruiters, only completed applicant
-- profiles, and only the columns above. Everything below reads through it.
create or replace function public.candidate_profiles()
returns setof public.candidate_profile
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, p.avatar_url, p.roles, p.role_other, p.skills,
         p.experience_level, p.job_types, p.platforms,
         case when p.no_work_yet then '{}'::text[] else p.work_links end,
         p.bio, p.no_work_yet, p.starting_note, p.created_at
  from public.profiles p
  where p.role = 'applicant'
    and p.profile_completed
    and exists (select 1 from public.profiles me where me.id = (select auth.uid()) and me.role = 'recruiter');
$$;

revoke all on function public.candidate_profiles() from public, anon;
grant execute on function public.candidate_profiles() to authenticated;

-- Find Talent search, newest profiles first. q matches name, creator type and skills
-- (case-insensitive "contains"). skill_filter matches anyone with at least one of the skills.
-- Empty or null filters are ignored.
create or replace function public.search_candidates(
  q text default null,
  skill_filter text[] default null,
  creator_type text default null,
  job_type text default null,
  experience text default null,
  page_size integer default 20,
  page_offset integer default 0
)
returns setof public.candidate_profile
language sql
stable
set search_path = ''
as $$
  select c.*
  from public.candidate_profiles() c
  where (
      coalesce(btrim(q), '') = ''
      or strpos(lower(coalesce(c.full_name, '')), lower(btrim(q))) > 0
      or exists (
        select 1 from unnest(c.roles || c.role_other || c.skills) t
        where strpos(lower(t), lower(btrim(q))) > 0
      )
    )
    and (
      coalesce(cardinality(skill_filter), 0) = 0
      or exists (
        select 1 from unnest(c.skills) s
        where lower(btrim(s)) in (select lower(btrim(f)) from unnest(skill_filter) f)
      )
    )
    and (creator_type is null or creator_type = any (c.roles))
    and (job_type is null or job_type = any (c.job_types))
    and (experience is null or c.experience_level = experience)
  order by c.created_at desc, c.id
  limit least(greatest(page_size, 1), 50)
  offset greatest(page_offset, 0);
$$;

revoke all on function public.search_candidates(text, text[], text, text, text, integer, integer) from public, anon;
grant execute on function public.search_candidates(text, text[], text, text, text, integer, integer) to authenticated;

-- Skills to offer in the Skills filter: the ones candidates actually list, most common first.
create or replace function public.candidate_skill_options()
returns setof text
language sql
stable
set search_path = ''
as $$
  select min(btrim(s))
  from public.candidate_profiles() c, unnest(c.skills) s
  where btrim(s) <> ''
  group by lower(btrim(s))
  order by count(*) desc, min(btrim(s))
  limit 60;
$$;

revoke all on function public.candidate_skill_options() from public, anon;
grant execute on function public.candidate_skill_options() to authenticated;

-- One candidate (replaces the phase 3 version, which had fewer fields).
drop function if exists public.get_candidate(uuid);
create function public.get_candidate(candidate uuid)
returns setof public.candidate_profile
language sql
stable
set search_path = ''
as $$
  select c.* from public.candidate_profiles() c where c.id = candidate;
$$;

revoke all on function public.get_candidate(uuid) from public, anon;
grant execute on function public.get_candidate(uuid) to authenticated;
