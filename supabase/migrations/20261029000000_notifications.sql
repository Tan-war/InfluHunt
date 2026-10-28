-- InfluHunt, phase 6: in-app notifications.
-- Run after 20261027130000_chat.sql. Paste into Supabase → SQL Editor → New query → Run.
-- Safe to run again.
--
-- The notifications table and its "own rows only" read rule came in phase 3, along with
-- status-change notifications (set_application_status). This adds:
--   * a notification for the recruiter when someone applies,
--   * mark_notifications_read() (the browser still can't insert, update or delete rows),
--   * Realtime, so the bell updates live.
-- Chat messages don't notify: the chat icon's unread count covers them.

-- 1. New application → the job's recruiter: "<name> applied for <job>", opening that
-- applicant's profile in application mode.
create or replace function public.notify_new_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_row public.jobs;
  applicant_name text;
begin
  select j.* into job_row from public.jobs j where j.id = new.job_id;
  select coalesce(nullif(btrim(p.full_name), ''), 'Someone') into applicant_name
  from public.profiles p where p.id = new.applicant_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    job_row.recruiter_id,
    'new_application',
    coalesce(applicant_name, 'Someone') || ' applied for ' || job_row.title,
    case when coalesce(btrim(new.pitch), '') <> '' then '“' || btrim(new.pitch) || '”' end,
    '/recruiter/candidates/' || new.applicant_id || '?application=' || new.id
  );
  return null;
end;
$$;

drop trigger if exists applications_notify_recruiter on public.applications;
create trigger applications_notify_recruiter
  after insert on public.applications
  for each row execute function public.notify_new_application();

-- 2. Mark my notifications read: these ids, or all of them when ids is null.
create or replace function public.mark_notifications_read(ids uuid[] default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications n
  set read_at = now()
  where n.user_id = (select auth.uid())
    and n.read_at is null
    and (ids is null or n.id = any (ids));
$$;

revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- The trigger function is only for the trigger.
revoke all on function public.notify_new_application() from public, anon, authenticated;

-- 3. Realtime: the bell hears new rows live. Realtime checks the "own rows only" read rule
-- for each listener.
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end
$$;
