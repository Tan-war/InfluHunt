-- InfluHunt, phase 2: jobs.
-- Run after 20261025000000_roles_and_recruiter_profiles.sql. Paste into Supabase →
-- SQL Editor → New query → Run. Safe to run again.

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references auth.users (id),
  title text not null check (btrim(title) <> ''),                       -- job role
  job_type text not null check (job_type in ('full_time', 'part_time', 'freelance', 'internship')),
  -- Same levels the applicant profile will use: Fresher / 0–1 yr / 1–3 yrs / 3+ yrs.
  experience_required text not null check (experience_required in ('fresher', '0_1', '1_3', '3_plus')),
  apply_by timestamptz not null,
  pay_type text not null check (pay_type in ('per_month', 'per_annum', 'unpaid')),
  pay_amount integer,                                                      -- whole rupees
  location_type text not null check (location_type in ('city', 'remote', 'hybrid')),
  city text,
  about_role text not null check (btrim(about_role) <> ''),
  what_you_learn text,
  skills text[] not null check (cardinality(skills) > 0),
  tools text[] not null default '{}',
  platforms text[] not null default '{}',
  contact_email text not null,                                             -- HR mail, shown to applicants
  closed_at timestamptz,                                                   -- set when the recruiter closes it
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_pay_check check (
    (pay_type = 'unpaid' and pay_amount is null) or (pay_type <> 'unpaid' and pay_amount > 0)
  ),
  constraint jobs_city_check check (location_type = 'remote' or coalesce(btrim(city), '') <> ''),
  constraint jobs_contact_email_check check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create index if not exists jobs_recruiter_created_idx on public.jobs (recruiter_id, created_at desc);
create index if not exists jobs_apply_by_idx on public.jobs (apply_by);

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- Open/Closed, defined once. A job is closed once the recruiter closes it or apply_by passes.
-- Also usable as a column from the API: select=*,job_is_open
create or replace function public.job_is_open(job public.jobs)
returns boolean
language sql
stable
set search_path = ''
as $$
  select job.closed_at is null and job.apply_by > now();
$$;

-- Jobs with their recruiter's public details and the computed status, for listing pages.
-- security_invoker: reads go through the callers' own access rules on both tables.
create or replace view public.job_listings
with (security_invoker = true)
as
select
  j.*,
  public.job_is_open(j) as is_open,
  rp.display_name as recruiter_name,
  rp.brand_name,
  rp.logo_url,
  rp.niche,
  rp.primary_link
from public.jobs j
join public.recruiter_profiles rp on rp.id = j.recruiter_id;

grant select on public.job_listings to anon, authenticated;

-- RLS: anyone can read jobs; recruiters with a finished profile post their own; only the
-- owner edits. No deletes: closing is the delete for now.
alter table public.jobs enable row level security;

drop policy if exists "Anyone can view jobs" on public.jobs;
create policy "Anyone can view jobs"
  on public.jobs for select
  to anon, authenticated
  using (true);

drop policy if exists "Recruiters with a profile can post jobs" on public.jobs;
create policy "Recruiters with a profile can post jobs"
  on public.jobs for insert
  to authenticated
  with check (
    recruiter_id = (select auth.uid())
    and exists (
      select 1 from public.recruiter_profiles rp
      where rp.id = (select auth.uid()) and rp.profile_completed
    )
  );

drop policy if exists "Recruiters can edit their own jobs" on public.jobs;
create policy "Recruiters can edit their own jobs"
  on public.jobs for update
  to authenticated
  using (recruiter_id = (select auth.uid()))
  with check (recruiter_id = (select auth.uid()));

revoke delete on public.jobs from anon, authenticated;
