-- InfluHunt, phase 5: chat in the database, recruiter-first.
-- Run after 20261027120000_find_talent.sql. Paste into Supabase → SQL Editor → New query → Run.
-- Safe to run again.
--
-- Rules:
--   * One conversation per recruiter + applicant pair (recruiters can message people who
--     never applied). job_id / application_id are only context: the job it started from.
--   * Only a recruiter starts a chat, through start_conversation(), which creates the
--     conversation and its first message together. Nobody can insert conversations directly.
--   * The recruiter in a chat can always send; the applicant only once the recruiter has.
--   * Participants only. No edits, no deletes. Messages are 1–1,000 characters.
--
-- Names and photos are read live (recruiter_profiles, profiles, jobs) rather than copied onto
-- the conversation, so a new logo or job title shows up in old chats too.

-- 1. Tables.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references auth.users (id) on delete cascade,
  applicant_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,                 -- context, if any
  application_id uuid references public.applications (id) on delete set null, -- context, if any
  recruiter_last_read_at timestamptz,
  applicant_last_read_at timestamptz,
  last_message_at timestamptz not null default now(),
  last_message_preview text not null default '',
  created_at timestamptz not null default now(),
  constraint conversations_recruiter_applicant_key unique (recruiter_id, applicant_id)
);

create index if not exists conversations_applicant_idx on public.conversations (applicant_id, last_message_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  sender_role text not null check (sender_role in ('recruiter', 'applicant')),
  body text not null check (char_length(body) between 1 and 1000 and btrim(body) <> ''),
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at desc);

-- 2. Helpers for the rules below. Security definer so policies on one table can look at the
-- other without the two policies calling each other in a loop. Both answer only for chats
-- the caller is part of.

-- 'recruiter' or 'applicant': the caller's side in this chat, or null if they're not in it.
create or replace function public.conversation_side(conversation uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
           when c.recruiter_id = (select auth.uid()) then 'recruiter'
           when c.applicant_id = (select auth.uid()) then 'applicant'
         end
  from public.conversations c
  where c.id = conversation;
$$;

-- Has the recruiter written in this chat yet?
create or replace function public.recruiter_has_written(conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.conversation_id = conversation
      and m.sender_role = 'recruiter'
      and (select auth.uid()) in (c.recruiter_id, c.applicant_id)
  );
$$;

revoke all on function public.conversation_side(uuid) from public, anon;
revoke all on function public.recruiter_has_written(uuid) from public, anon;
grant execute on function public.conversation_side(uuid) to authenticated;
grant execute on function public.recruiter_has_written(uuid) to authenticated;

-- 3. Row Level Security.
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- The recruiter sees their chats; the applicant only once the recruiter has written.
drop policy if exists "Participants can view their conversations" on public.conversations;
create policy "Participants can view their conversations"
  on public.conversations for select
  to authenticated
  using (
    recruiter_id = (select auth.uid())
    or (applicant_id = (select auth.uid()) and public.recruiter_has_written(id))
  );

-- No insert, update or delete policies on conversations: start_conversation() creates them,
-- the trigger below and mark_conversation_read() update them.
revoke insert, update, delete on public.conversations from anon, authenticated;

drop policy if exists "Participants can view messages" on public.messages;
create policy "Participants can view messages"
  on public.messages for select
  to authenticated
  using (public.conversation_side(conversation_id) is not null);

drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and sender_role = public.conversation_side(conversation_id)
    and (sender_role = 'recruiter' or public.recruiter_has_written(conversation_id))
  );

-- No edits or deletes. Inserts may set only these columns (not id or created_at).
revoke insert, update, delete on public.messages from anon, authenticated;
grant insert (conversation_id, sender_id, sender_role, body) on public.messages to authenticated;

-- 4. Each new message updates its chat's preview and time, and counts as read by the sender.
create or replace function public.messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations c
  set last_message_at = new.created_at,
      last_message_preview = left(regexp_replace(btrim(new.body), '\s+', ' ', 'g'), 120),
      recruiter_last_read_at = case when new.sender_role = 'recruiter' then new.created_at else c.recruiter_last_read_at end,
      applicant_last_read_at = case when new.sender_role = 'applicant' then new.created_at else c.applicant_last_read_at end
  where c.id = new.conversation_id;
  return null;
end;
$$;

drop trigger if exists messages_after_insert on public.messages;
create trigger messages_after_insert
  after insert on public.messages
  for each row execute function public.messages_after_insert();

-- 5. Recruiters start chats here, and only here. Returns the conversation id.
-- Reuses the existing chat with this applicant if there is one.
create or replace function public.start_conversation(applicant_id uuid, first_message text, job_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  target uuid := start_conversation.applicant_id;
  context_job uuid := start_conversation.job_id;
  msg text := btrim(coalesce(start_conversation.first_message, ''));
  app_id uuid;
  cid uuid;
begin
  if uid is null then
    raise exception 'not_signed_in';
  end if;
  if not exists (
    select 1 from public.profiles p
    join public.recruiter_profiles rp on rp.id = p.id
    where p.id = uid and p.role = 'recruiter' and rp.profile_completed
  ) then
    raise exception 'not_a_recruiter';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = target and p.role = 'applicant' and p.profile_completed
  ) then
    raise exception 'applicant_not_found';
  end if;
  if char_length(msg) < 1 or char_length(msg) > 1000 then
    raise exception 'invalid_message';
  end if;
  if context_job is not null then
    if not exists (select 1 from public.jobs j where j.id = context_job and j.recruiter_id = uid) then
      raise exception 'job_not_found';
    end if;
    select a.id into app_id from public.applications a where a.job_id = context_job and a.applicant_id = target;
  end if;

  insert into public.conversations as c (recruiter_id, applicant_id, job_id, application_id)
  values (uid, target, context_job, app_id)
  on conflict on constraint conversations_recruiter_applicant_key do nothing
  returning c.id into cid;

  if cid is null then
    select c.id into cid from public.conversations c where c.recruiter_id = uid and c.applicant_id = target;
  end if;

  insert into public.messages (conversation_id, sender_id, sender_role, body)
  values (cid, uid, 'recruiter', msg);

  return cid;
end;
$$;

revoke all on function public.start_conversation(uuid, text, uuid) from public, anon;
grant execute on function public.start_conversation(uuid, text, uuid) to authenticated;

-- 6. Mark a chat read up to now, for the caller's side.
create or replace function public.mark_conversation_read(conversation uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  update public.conversations c
  set recruiter_last_read_at = now()
  where c.id = conversation and c.recruiter_id = uid
    and (c.recruiter_last_read_at is null or c.recruiter_last_read_at < c.last_message_at);

  update public.conversations c
  set applicant_last_read_at = now()
  where c.id = conversation and c.applicant_id = uid
    and (c.applicant_last_read_at is null or c.applicant_last_read_at < c.last_message_at);
end;
$$;

revoke all on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- 7. The caller's chats for the chat list, newest first, with the other person's public
-- details (never email or phone) and the unread count. Applicants only see chats where the
-- recruiter has written.
create or replace function public.my_conversations()
returns table (
  id uuid,
  my_side text,
  other_id uuid,
  other_name text,
  other_avatar_url text,
  other_roles text[],          -- recruiter's view: the applicant's creator type
  other_role_other text,
  recruiter_brand_name text,   -- applicant's view: the recruiter's brand
  job_id uuid,
  job_title text,
  application_id uuid,
  last_message_at timestamptz,
  last_message_preview text,
  unread_count integer,
  recruiter_has_written boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id,
         case when s.is_recruiter then 'recruiter' else 'applicant' end,
         case when s.is_recruiter then c.applicant_id else c.recruiter_id end,
         case when s.is_recruiter then ap.full_name else rp.display_name end,
         case when s.is_recruiter then ap.avatar_url else rp.logo_url end,
         case when s.is_recruiter then ap.roles end,
         case when s.is_recruiter then ap.role_other end,
         rp.brand_name,
         c.job_id,
         j.title,
         c.application_id,
         c.last_message_at,
         c.last_message_preview,
         (
           select count(*)::integer from public.messages m
           where m.conversation_id = c.id
             and m.sender_role <> case when s.is_recruiter then 'recruiter' else 'applicant' end
             and m.created_at > coalesce(
               case when s.is_recruiter then c.recruiter_last_read_at else c.applicant_last_read_at end,
               '-infinity'::timestamptz)
         ),
         exists (select 1 from public.messages m where m.conversation_id = c.id and m.sender_role = 'recruiter'),
         c.created_at
  from public.conversations c
  cross join lateral (select c.recruiter_id = (select auth.uid()) as is_recruiter) s
  left join public.recruiter_profiles rp on rp.id = c.recruiter_id
  left join public.profiles ap on ap.id = c.applicant_id
  left join public.jobs j on j.id = c.job_id
  where c.recruiter_id = (select auth.uid())
     or (
       c.applicant_id = (select auth.uid())
       and exists (select 1 from public.messages m where m.conversation_id = c.id and m.sender_role = 'recruiter')
     )
  order by c.last_message_at desc;
$$;

revoke all on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;

-- 8. Realtime: new messages and chat-list changes arrive live. Realtime checks the select
-- policies above for each listener, so people only receive their own chats.
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table public.conversations;
exception
  when duplicate_object then null;
end
$$;
