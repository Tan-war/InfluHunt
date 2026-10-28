-- Sample jobs for testing, made from the old mock listings (src/data/jobs.js).
-- They're all owned by ONE recruiter account, so they all show that recruiter's brand and logo.
--
-- Before running:
--   1. Sign in once with your test recruiter account and finish the recruiter profile
--      (so it exists in auth.users and recruiter_profiles).
--   2. Put that account's Gmail address below, in place of YOUR_RECRUITER_EMAIL@gmail.com.
-- Then paste into Supabase → SQL Editor → New query → Run. Running it again adds the jobs again.
-- Apply-by dates are 10 to 31 days from today at 11:59 PM India time, so they're all open.

with recruiter as (
  select u.id, u.email
  from auth.users u
  join public.recruiter_profiles rp on rp.id = u.id
  where u.email = 'YOUR_RECRUITER_EMAIL@gmail.com'
),
sample (title, job_type, experience_required, apply_by, pay_type, pay_amount, location_type, city,
        about_role, what_you_learn, skills, tools, platforms) as (
  values
  ('Video Editor', 'full_time', '1_3', ((current_date + 10) + time '23:59') at time zone 'Asia/Kolkata', 'per_month', 45000, 'remote', null, 'Edit two long-form recipe videos a week for a growing cooking channel. You will cut raw footage, add captions and B-roll, and keep a consistent warm style across uploads.', 'How a long-form cooking video goes from raw footage to upload
Pacing edits to keep viewers watching
Building a consistent visual style', array['Colour grading', 'Storytelling', 'Captioning']::text[], array['Premiere Pro']::text[], array['YouTube']::text[]),
  ('Reels Creator', 'part_time', '0_1', ((current_date + 13) + time '23:59') at time zone 'Asia/Kolkata', 'per_month', 20000, 'hybrid', 'Goa', 'Shoot and edit short travel reels around Goa for a slow-travel page. Two studio days a month, the rest is out on location.', 'Spotting trends early and making them your own
Shooting reels that work without sound', array['Mobile filming', 'Trend research']::text[], array['CapCut']::text[], array['Instagram']::text[]),
  ('Thumbnail Designer', 'freelance', '1_3', ((current_date + 16) + time '23:59') at time zone 'Asia/Kolkata', 'per_month', 15000, 'remote', null, 'Design eye-catching thumbnails for weekly gadget reviews. We test two versions per video, so speed and fresh ideas matter more than polish.', 'What makes people click a thumbnail
Running A/B tests on real videos', array['Typography', 'A/B testing', 'Composition']::text[], array['Photoshop']::text[], array['YouTube', 'Instagram']::text[]),
  ('Social Media Manager', 'full_time', '3_plus', ((current_date + 19) + time '23:59') at time zone 'Asia/Kolkata', 'per_month', 60000, 'city', 'Mumbai', 'Own the content calendar and community for a skincare brand page. You will plan posts, brief creators, and report on what is working each month.', 'How a beauty brand plans a month of content
Briefing and working with creators
Reading Instagram insights and turning them into decisions', array['Content planning', 'Analytics', 'Copywriting', 'Community management']::text[], array['Canva', 'Instagram Insights']::text[], array['Instagram', 'YouTube']::text[]),
  ('Scriptwriter', 'internship', '0_1', ((current_date + 22) + time '23:59') at time zone 'Asia/Kolkata', 'unpaid', null, 'remote', null, 'Research and draft scripts for short explainer videos on science topics. A good fit if you love making hard ideas simple and want a portfolio to show.', 'Turning research into a script that flows
Writing for the ear, not the page', array['Research', 'Scriptwriting', 'Simplifying concepts']::text[], '{}'::text[], array['YouTube']::text[]),
  ('Motion Graphics Designer', 'full_time', '1_3', ((current_date + 25) + time '23:59') at time zone 'Asia/Kolkata', 'per_month', 55000, 'hybrid', 'Bengaluru', 'Create animated workout cards, intros and reel overlays for a fitness community. Three days in the Bengaluru studio, two from home.', '', array['Animation', 'Brand systems']::text[], array['After Effects', 'Illustrator']::text[], array['Instagram', 'YouTube']::text[]),
  ('Cinematographer', 'freelance', '3_plus', ((current_date + 28) + time '23:59') at time zone 'Asia/Kolkata', 'per_month', 80000, 'city', 'Hyderabad', 'Lead camera and lighting on a monthly short-film series. You will plan shots with the director and manage a small crew on set.', '', array['Lighting', 'Shot planning', 'Crew management']::text[], array['Cinema cameras']::text[], array['YouTube']::text[]),
  ('Illustrator', 'part_time', '0_1', ((current_date + 31) + time '23:59') at time zone 'Asia/Kolkata', 'per_month', 18000, 'remote', null, 'Draw a weekly four-panel comic and matching carousel posts for a light-hearted art page. Your own style is welcome as long as it stays playful.', 'Developing a recurring character
Turning one idea into a comic and a carousel', array['Character design', 'Visual humour']::text[], array['Procreate']::text[], array['Instagram']::text[])
)
insert into public.jobs (recruiter_id, title, job_type, experience_required, apply_by, pay_type, pay_amount,
                         location_type, city, about_role, what_you_learn, skills, tools, platforms, contact_email)
select r.id, s.title, s.job_type, s.experience_required, s.apply_by, s.pay_type, s.pay_amount,
       s.location_type, s.city, s.about_role, s.what_you_learn, s.skills, s.tools, s.platforms, r.email
from sample s cross join recruiter r;
