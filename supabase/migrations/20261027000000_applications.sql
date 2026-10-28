-- InfluHunt, phase 3: applications, status changes, and the notifications table.
-- Run after 20261026000000_jobs.sql. Paste into Supabase → SQL Editor → New query → Run.
-- Safe to run again.

-- 1. Applications: one per job per person.
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id),
  applicant_id uuid not null references auth.users (id),
  pitch text check (char_length(pitch) <= 150),      -- optional one-liner: "Why you?"
  status text not null default 'applied'
    check (status in ('applied', 'viewed', 'shortlisted', 'not_selected')),
  status_updated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (job_id, applicant_id)
);

create index if not exists applications_job_idx on public.applications (job_id, created_at desc);
create index if not exists applications_applicant_idx on public.applications (applicant_id, created_at desc);

alter table public.applications enable row level security;

-- Applicants apply for themselves, with a finished applicant profile, to an open job.
drop policy if exists "Applicants can apply to open jobs" on public.applications;
create policy "Applicants can apply to open jobs"
  on public.applications for insert
  to authenticated
  with check (
    applicant_id = (select auth.uid())
    and status = 'applied'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'applicant' and p.profile_completed
    )
    and exists (select 1 from public.jobs j where j.id = job_id and public.job_is_open(j))
  );

-- Applicants see their own applications; recruiters see the ones for their own jobs.
drop policy if exists "Applicants and job owners can view applications" on public.applications;
create policy "Applicants and job owners can view applications"
  on public.applications for select
  to authenticated
  using (
    applicant_id = (select auth.uid())
    or exists (select 1 from public.jobs j where j.id = job_id and j.recruiter_id = (select auth.uid()))
  );

-- No updates or deletes from the browser: status changes go through set_application_status().
revoke insert, update, delete on public.applications from anon, authenticated;
grant insert (job_id, applicant_id, pitch) on public.applications to authenticated;

-- 2. Notifications (both roles). Rows are only ever created by the database. The bell and
-- the notifications page come in phase 6; status changes start creating rows now.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('new_application', 'application_status', 'new_message')),
  title text not null,
  body text,
  link text not null,                                  -- in-app path
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete on public.notifications from anon, authenticated;

-- 3. Status changes, by the recruiter who owns the job. Allowed moves:
--    applied → viewed / shortlisted / not_selected, viewed → shortlisted / not_selected,
--    shortlisted ↔ not_selected. Shortlisted and Not selected notify the applicant.
create or replace function public.set_application_status(application_id uuid, new_status text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  app public.applications;
  job_title text;
  allowed boolean;
begin
  select a.* into app
  from public.applications a
  join public.jobs j on j.id = a.job_id
  where a.id = application_id and j.recruiter_id = auth.uid()
  for update of a;

  if not found then
    raise exception 'not_found';
  end if;
  if app.status = new_status then
    return new_status;
  end if;

  allowed := case app.status
    when 'applied' then new_status in ('viewed', 'shortlisted', 'not_selected')
    when 'viewed' then new_status in ('shortlisted', 'not_selected')
    when 'shortlisted' then new_status = 'not_selected'
    when 'not_selected' then new_status = 'shortlisted'
    else false
  end;
  if not allowed then
    raise exception 'invalid_status_change';
  end if;

  update public.applications
  set status = new_status, status_updated_at = now()
  where id = app.id;

  if new_status in ('shortlisted', 'not_selected') then
    select j.title into job_title from public.jobs j where j.id = app.job_id;
    insert into public.notifications (user_id, type, title, body, link)
    values (
      app.applicant_id,
      'application_status',
      case when new_status = 'shortlisted'
        then 'You''ve been shortlisted for ' || job_title || ' 🎉'
        else 'Update on ' || job_title
      end,
      case when new_status = 'shortlisted'
        then 'The creator may message you here.'
        else 'This one didn''t work out. Keep going, new gigs are added every week.'
      end,
      '/jobs/' || app.job_id
    );
  end if;

  return new_status;
end;
$$;

revoke all on function public.set_application_status(uuid, text) from public, anon;
grant execute on function public.set_application_status(uuid, text) to authenticated;

-- 4. What recruiters may see of applicants. Applicant profiles stay private (no broad read
-- policy on profiles); these functions return public fields only: never email or phone.

-- Everyone who applied to one of the caller's jobs.
create or replace function public.get_job_applicants(job uuid)
returns table (
  application_id uuid,
  applicant_id uuid,
  status text,
  pitch text,
  applied_at timestamptz,
  full_name text,
  avatar_url text,
  roles text[],
  role_other text
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.applicant_id, a.status, a.pitch, a.created_at,
         p.full_name, p.avatar_url, p.roles, p.role_other
  from public.applications a
  join public.jobs j on j.id = a.job_id
  join public.profiles p on p.id = a.applicant_id
  where a.job_id = job and j.recruiter_id = auth.uid()
  order by a.created_at desc;
$$;

revoke all on function public.get_job_applicants(uuid) from public, anon;
grant execute on function public.get_job_applicants(uuid) to authenticated;

-- One applicant's public profile, for signed-in recruiters. (Phase 4 adds more fields.)
create or replace function public.get_candidate(candidate uuid)
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  roles text[],
  role_other text,
  skills text[],
  work_links text[],
  no_work_yet boolean,
  starting_note text,
  bio text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, p.avatar_url, p.roles, p.role_other, p.skills, p.work_links,
         p.no_work_yet, p.starting_note, p.bio, p.created_at
  from public.profiles p
  where p.id = candidate
    and p.role = 'applicant'
    and p.profile_completed
    and exists (select 1 from public.profiles me where me.id = auth.uid() and me.role = 'recruiter');
$$;

revoke all on function public.get_candidate(uuid) from public, anon;
grant execute on function public.get_candidate(uuid) to authenticated;
