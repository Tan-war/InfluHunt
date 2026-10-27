-- Sample applicants for testing Find Talent: 24 completed applicant profiles (more than one
-- page of 20, so "Load more" shows). Four are "I'm just starting". Each has a fake phone and
-- city, so you can check in DevTools → Network that neither ever reaches the recruiter side.
--
-- Profiles must belong to an account, so this also creates 24 placeholder accounts
-- (emails end in @sample.influhunt.test). They have no password and can't sign in.
--
-- Run after the phase 4 migration (20261027120000_find_talent.sql).
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run again: it updates the
-- same 24 people instead of adding more. To remove them, run the block at the bottom.

-- 1. The sample people, in a temporary table that disappears when this run ends.
drop table if exists pg_temp.sample_talent;
create temp table sample_talent as
with sample (n, full_name, roles, role_other, skills, experience_level, job_types, platforms,
             work_links, no_work_yet, starting_note, bio, city) as (
  values
  (1, 'Aarav Mehta', array['Video editor'], null, array['Premiere Pro', 'Reels editing', 'Color grading'], '1_3',
     array['freelance', 'part_time'], array['YouTube', 'Instagram'], array['https://www.youtube.com/@aaravcuts'], false, null,
     'I edit long-form YouTube videos and Reels for tech and finance channels. Fast turnaround, clean pacing.', 'Mumbai'),
  (2, 'Diya Sharma', array['Thumbnail designer'], null, array['Photoshop', 'Figma', 'Canva'], '0_1',
     array['freelance'], array['YouTube'], array['https://www.behance.net/diyasharma'], false, null,
     'Thumbnail designer focused on high-CTR designs for gaming and vlog channels.', 'Pune'),
  (3, 'Kabir Singh', array['Scriptwriter', 'Researcher'], null, array['Storytelling', 'Research', 'Hooks'], '1_3',
     array['part_time', 'freelance'], array['YouTube', 'LinkedIn'], array['https://drive.google.com/drive/folders/kabir-scripts'], false, null,
     'Scriptwriter for explainer and documentary-style videos. I love turning dense topics into stories.', 'Delhi'),
  (4, 'Ananya Iyer', array['Social media manager'], null, array['Content calendar', 'Copywriting', 'Instagram Insights'], '3_plus',
     array['full_time'], array['Instagram', 'LinkedIn', 'X'], array['https://www.instagram.com/ananya.socials'], false, null,
     'Four years running Instagram and LinkedIn for D2C brands and creators. Grew two accounts past 100k.', 'Bengaluru'),
  (5, 'Rohan Das', array['Photographer'], null, array['Lightroom', 'Product photography', 'Portrait'], '1_3',
     array['freelance'], array['Instagram'], array['https://www.instagram.com/rohanshoots'], false, null,
     'Product and portrait photographer. I shoot for small brands and creators who want a clean look.', 'Kolkata'),
  (6, 'Meera Nair', array['On-camera talent'], null, array['Presenting', 'Voiceover'], '0_1',
     array['part_time', 'freelance'], array['YouTube', 'Instagram'], array['https://www.youtube.com/@meeranair'], false, null,
     'Presenter and voiceover artist. Comfortable on camera in English, Hindi and Malayalam.', 'Kochi'),
  (7, 'Ishaan Gupta', array['Video editor', 'Thumbnail designer'], null, array['DaVinci Resolve', 'Photoshop', 'Motion graphics'], '3_plus',
     array['full_time', 'freelance'], array['YouTube'], array['https://www.youtube.com/@ishaanedits', 'https://www.behance.net/ishaang'], false, null,
     'Editor and designer for gaming channels. I handle the full package: edit, motion graphics and thumbnail.', 'Hyderabad'),
  (8, 'Sara Khan', array['Scriptwriter'], null, array['Hooks', 'Copywriting', 'Storytelling'], 'fresher',
     array['internship', 'part_time'], array['Instagram'], array['https://docs.google.com/document/d/sara-sample-scripts'], false, null,
     'Recent mass-media graduate. I write short, punchy scripts for Reels and Shorts.', 'Lucknow'),
  (9, 'Vivaan Reddy', array['Video editor'], null, array['CapCut', 'Reels editing', 'Premiere Pro'], 'fresher',
     array['internship', 'freelance'], array['Instagram'], array['https://www.instagram.com/vivaan.edits'], false, null,
     'College student editing Reels for local cafes and gyms. Looking for my first creator gig.', 'Hyderabad'),
  (10, 'Priya Menon', array['Researcher'], null, array['Research', 'Fact-checking', 'Trend spotting'], '1_3',
     array['part_time'], array['YouTube'], array['https://drive.google.com/drive/folders/priya-research'], false, null,
     'Researcher for history and science channels. I build source-checked briefs that writers can use straight away.', 'Chennai'),
  (11, 'Arjun Patel', array['Social media manager', 'Video editor'], null, array['Content calendar', 'CapCut', 'Analytics'], '1_3',
     array['full_time', 'part_time'], array['Instagram', 'YouTube'], array['https://www.linkedin.com/in/arjunpatel-social'], false, null,
     'I plan, shoot and edit short-form content for food and travel creators.', 'Ahmedabad'),
  (12, 'Nisha Verma', array['Thumbnail designer'], null, array['Photoshop', 'Illustrator', 'Canva'], '3_plus',
     array['freelance'], array['YouTube'], array['https://www.behance.net/nishaverma'], false, null,
     'Five years designing thumbnails and channel art for education and finance channels.', 'Jaipur'),
  (13, 'Aditya Rao', array['Photographer', 'Video editor'], null, array['Lightroom', 'Premiere Pro', 'Drone shots'], '1_3',
     array['freelance'], array['YouTube', 'Instagram'], array['https://www.youtube.com/@adityarao.travel'], false, null,
     'Travel shooter and editor. I can join shoots across South India.', 'Mysuru'),
  (14, 'Tanya Bose', array['Other'], 'Community manager', array['Discord', 'Copywriting', 'Moderation'], '0_1',
     array['part_time'], array['YouTube', 'X'], array['https://www.linkedin.com/in/tanyabose-community'], false, null,
     'I run Discord and comment communities for creators so fans feel heard.', 'Kolkata'),
  (15, 'Rahul Joshi', array['Video editor'], null, array['After Effects', 'Premiere Pro', 'Sound design'], '3_plus',
     array['full_time'], array['YouTube'], array['https://www.youtube.com/@rahuljoshi.post'], false, null,
     'Senior editor with documentary experience. Strong on sound design and story structure.', 'Mumbai'),
  (16, 'Kavya Pillai', array['Scriptwriter', 'On-camera talent'], null, array['Storytelling', 'Presenting', 'Research'], '1_3',
     array['freelance', 'part_time'], array['YouTube', 'Instagram'], array['https://www.instagram.com/kavyatalks'], false, null,
     'I write and present explainer videos on money and careers.', 'Thiruvananthapuram'),
  (17, 'Yash Malhotra', array['Thumbnail designer', 'Social media manager'], null, array['Canva', 'Figma', 'Instagram Insights'], '0_1',
     array['freelance', 'internship'], array['Instagram', 'YouTube'], array['https://www.behance.net/yashmalhotra'], false, null,
     'Designer who also manages posting schedules. Happy to own a channel''s whole visual feed.', 'Chandigarh'),
  (18, 'Fatima Sheikh', array['Researcher', 'Scriptwriter'], null, array['Fact-checking', 'Research', 'Hooks'], '3_plus',
     array['full_time', 'part_time'], array['YouTube', 'LinkedIn'], array['https://docs.google.com/document/d/fatima-portfolio'], false, null,
     'Former journalist. I research and script news explainers with a focus on accuracy.', 'Bhopal'),
  (19, 'Neel Kapoor', array['On-camera talent'], null, array['Voiceover', 'Presenting', 'Hindi dubbing'], '1_3',
     array['freelance'], array['YouTube'], array['https://www.youtube.com/@neelvoice'], false, null,
     'Voice artist for animations and explainers. Home studio, quick delivery.', 'Delhi'),
  (20, 'Riya Chatterjee', array['Photographer'], null, array['Portrait', 'Lightroom', 'Styling'], '0_1',
     array['part_time', 'freelance'], array['Instagram'], array['https://www.instagram.com/riya.frames'], false, null,
     'Portrait and lifestyle photographer. I help creators with profile shoots and brand content.', 'Kolkata'),
  -- "I'm just starting": no work links; the card shows the New creator tag and bio instead.
  (21, 'Sameer Ali', array['Video editor'], null, array['CapCut', 'Reels editing'], 'fresher',
     array['internship'], array[]::text[], array[]::text[], true, 'I want to try editing Shorts for a tech channel, because I watch them every day and keep noticing what makes them work.',
     'Engineering student who edits short videos for fun. I''m ready to learn how real channels work and put in the hours.', 'Indore'),
  (22, 'Pooja Desai', array['Thumbnail designer'], null, array['Canva'], 'fresher',
     array['internship', 'freelance'], array[]::text[], array[]::text[], true, 'Thumbnails for a cooking channel. I sketch a lot and want to learn what gets clicks.',
     'Fine arts student. I draw every day and want to turn that into thumbnails and channel art.', 'Surat'),
  (23, 'Harsh Vardhan', array['Scriptwriter'], null, array['Storytelling'], 'fresher',
     array['part_time', 'internship'], array[]::text[], array[]::text[], true, 'Writing scripts for a history channel. I read a lot of history and want to tell it well.',
     'I write short stories and blog posts. Looking for a chance to write for video for the first time.', 'Patna'),
  (24, 'Lakshmi Krishnan', array['Social media manager'], null, array['Copywriting', 'Content calendar'], null,
     array[]::text[], array[]::text[], array[]::text[], true, 'Running Instagram for a small creator. I manage my college club''s page and loved it.',
     'Commerce student who runs my college club''s Instagram. I left my experience and job type empty to test optional fields.', 'Coimbatore')
)
select s.*, md5('influhunt-sample-talent-' || s.n)::uuid as id,
       'talent' || s.n || '@sample.influhunt.test' as email
from sample s;

-- 2. Placeholder accounts (no password, can't sign in). The sign-up trigger also creates
-- an empty profiles row for each.
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data,
                          raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  select '00000000-0000-0000-0000-000000000000', p.id, 'authenticated', 'authenticated', p.email, now(),
         '{"provider": "email", "providers": ["email"]}'::jsonb,
         jsonb_build_object('full_name', p.full_name),
         now() - p.n * interval '1 day', now(),
         '', '', '', ''
  from sample_talent p
  on conflict (id) do nothing;

-- 3. Fill in each profile as a completed applicant.
insert into public.profiles (id, email, full_name, avatar_url, roles, role_other, skills, experience_level,
                             job_types, platforms, work_links, no_work_yet, starting_note, bio, city, phone,
                             role, profile_completed, created_at)
select p.id, p.email, p.full_name,
       -- Placeholder photos for most; a few have none, to show the initials fallback.
       case when p.n % 5 = 0 then null else 'https://i.pravatar.cc/150?img=' || p.n end,
       p.roles, p.role_other, p.skills, p.experience_level, p.job_types, p.platforms, p.work_links,
       p.no_work_yet, p.starting_note, p.bio, p.city,
       '+9198765' || lpad(p.n::text, 5, '0'),   -- fake, private: must never show on the recruiter side
       'applicant', true, now() - p.n * interval '1 day'
from sample_talent p
on conflict (id) do update set
  full_name = excluded.full_name, avatar_url = excluded.avatar_url, roles = excluded.roles,
  role_other = excluded.role_other, skills = excluded.skills, experience_level = excluded.experience_level,
  job_types = excluded.job_types, platforms = excluded.platforms, work_links = excluded.work_links,
  no_work_yet = excluded.no_work_yet, starting_note = excluded.starting_note, bio = excluded.bio,
  city = excluded.city, phone = excluded.phone, role = 'applicant', profile_completed = true,
  created_at = excluded.created_at;

-- To remove all sample applicants later (their profiles go with them):
-- delete from auth.users where email like '%@sample.influhunt.test';
