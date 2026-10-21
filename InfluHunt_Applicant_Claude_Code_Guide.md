# InfluHunt Applicant App: Build Guide for Claude Code

This guide is for building the **applicant side** of InfluHunt, the job search app for creator and artistic roles. It covers the screens from the PRD (Find Opportunities, Job Details, Apply, Profile, Notifications) and gives you copy-paste prompts to use with Claude Code in VS Code, one screen at a time.

You do not need to know how to code. You will copy a prompt, let Claude Code build, run the app, test it with the checklist, and send feedback.

---

## 1. Tech stack (recommended)

| Part | Tool | Why |
|---|---|---|
| Screens and layout | **React** | The most common way to build modern web apps. Claude Code is very good at it. |
| Build tool | **Vite** | Starts the app in seconds with one command. |
| Styling | **Tailwind CSS** | Quick, consistent spacing and colours, which suits a clean design. |
| Page navigation | **React Router** | Lets each screen have its own address (e.g. `/find`, `/jobs/2`). |
| Icons | **Lucide** | Simple, thin icons that match an Apple-style look. |
| Data for now | **Local mock data + browser storage** | No backend yet. Fast to test. |
| Later: login, database, photos, notifications | **Supabase** | Free tier, handles login, database and file storage in one place. |
| Later: hosting | **Vercel** or **Netlify** | Free, puts the app on a public link. |
| Later: analytics (PRD) | **Mixpanel** or **PostHog** | The PRD already names Mixpanel. |

Not needed in this phase: a server, a database, payments, or real email.

---

## 2. One-time setup on your computer

Do this once.

1. **Install Node.js (LTS)** from nodejs.org. Click the big green button and install with default options.
2. **Install Git** from git-scm.com. Default options are fine.
3. **Install VS Code** from code.visualstudio.com.
4. **Create a GitHub account** at github.com if you don't have one.
5. **Create an empty repository on GitHub**
   - Click the **+** at the top right, then **New repository**.
   - Name it `influhunt-applicant`. Leave everything else as default. Click **Create repository**.
   - Copy the page address (it looks like `https://github.com/yourname/influhunt-applicant`).
6. **Install the Claude Code extension in VS Code**
   - Open VS Code, click the Extensions icon on the left (four squares), search **Claude Code**, click **Install**.
   - Sign in with your Anthropic account when prompted.
7. **Create a project folder** on your computer called `influhunt-applicant`.
8. **Open it in VS Code**: File → Open Folder → choose `influhunt-applicant`.
9. **Check the tools.** Open the terminal in VS Code (Terminal → New Terminal) and type `node -v` then Enter. You should see a version number like `v20...`. Type `git --version` then Enter. You should see a version number too.

**How to run the app (you will do this after every round):**
1. In the VS Code terminal, type `npm install` and press Enter (only needed the first time, or when Claude Code asks).
2. Type `npm run dev` and press Enter.
3. Hold Ctrl (Cmd on Mac) and click the link that appears, usually `http://localhost:5173`. It opens in your browser.
4. To stop the app, click in the terminal and press **Ctrl + C**.

**How to test on a phone-sized screen:** in Chrome, press **F12**, then press **Ctrl + Shift + M** (Cmd + Shift + M on Mac). Pick "iPhone" from the dropdown at the top.

**How to reset saved data** (the app remembers sign-in and applications in your browser): press **F12** → **Application** tab → **Local Storage** → right-click your address → **Clear**. Then refresh.

---

## 3. Design direction (applies to every screen)

Think Apple, the way Jony Ive would design it: calm, honest, and nothing that does not earn its place.

- **Calm surfaces:** light grey page background, white cards, no heavy borders.
- **One accent colour:** blue, used only for the main button and links.
- **Clear type:** the system font (what your phone uses), big clear headings, short sentences.
- **Room to breathe:** generous spacing, content in a narrow centred column.
- **One main action per screen:** one obvious button you want the person to press.
- **Gentle motion:** things fade and slide softly, nothing bounces or flashes.
- **Plain words:** "Apply now", "Save", "Back". No jargon.
- **Works on a phone first.**

Claude Code will store these rules in a file called `CLAUDE.md` in Prompt 0, so you do not need to repeat them.

---

## 4. Screens in this release

| # | Screen | Address | What is on it | PRD reference |
|---|---|---|---|---|
| 1 | Landing | `/` | Headline and 3 buttons: Find opportunities, Post an opportunity (coming soon), Sign in | User flow |
| 2 | Find Opportunities | `/find` | Search box, filters (job type, experience, work mode, pay), list of job cards | Features: Find Opportunities page, Job card |
| 3 | Job Details | `/jobs/:id` | Full job info, channel link, skills, platforms, HR email, Apply now | Feature: Job description page |
| 4 | Sign In | `/sign-in` | Simple email and password form, "Continue as guest" | Goal: login |
| 5 | Profile | `/profile` | Full profile form with required fields marked | Feature: Profile form |
| 6 | Apply | Popup on Job Details | Confirm popup, then "Application sent" message | Feature: Apply now CTA |
| 7 | Notifications | `/notifications` | Applied jobs and "recruiter liked your profile" messages | User flow, Goal 11 |
| 8 | Top bar (every screen) | n/a | InfluHunt name, notification bell, profile icon with small menu | User flow notes |

---

## 5. How each round works

1. **Paste a prompt** into Claude Code (the chat box in the Claude Code panel in VS Code).
2. **Wait** until Claude Code says it is done.
3. **Run the app** (`npm run dev`) and open the address.
4. **Test** using the checklist under that prompt. Tick what works.
5. **Send feedback in plain words**, for example:
   > "On the Find page the filter buttons feel heavy. Make them lighter and add more space above the job cards."
6. **Once you're happy, save to GitHub** by pasting:
   > "Save all changes to git with the message 'Add Find Opportunities page' and push to GitHub."
7. **Move to the next prompt.**

Rule of thumb: if something is wrong, fix it before moving on. Each round builds on the last.

---

## 6. The prompts

Use them in order. Each one is self-contained, so you can paste it as is.

---

### Prompt 0: Project setup

**Paste this:**

```
Create a new project in this folder for the InfluHunt applicant app.

1. Set up a React + Vite + Tailwind CSS project. Use JavaScript, not TypeScript.
2. Install react-router-dom and lucide-react.
3. Create a file called CLAUDE.md in the project root with:
   - A 3-line summary: InfluHunt is a job search app for creator and artistic roles (YouTube, Instagram, editing, design). This is the APPLICANT side only.
   - Tech stack: React, Vite, Tailwind CSS, React Router, Lucide icons. No backend yet; data comes from local mock files and browser localStorage.
   - Design rules:
     - Font: system font stack (-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif).
     - Page background #F5F5F7. Cards white. Main text #1D1D1F. Secondary text #6E6E73. Borders #D2D2D7.
     - Accent colour #0071E3, used only for primary buttons and links.
     - Cards have 16px rounded corners, inputs 12px, buttons fully rounded (pill shape).
     - Content in a centred column, max width 960px, with at least 24px side padding.
     - One primary action per screen.
     - Transitions 200ms ease. No bounce, no flashing.
     - Works at 375px width with no horizontal scrolling.
     - Friendly empty-state sentence whenever a list is empty.
   - Rule: build only the screen I ask for in each step. Do not add features I did not ask for.
4. Create src/data/jobs.js with 8 fictional job listings. Use fictional brand names only (no real company or creator names). Each job has:
   id, brandName, platform ("YouTube" or "Instagram"), channelUrl (placeholder https link), role, niche, workMode ("WFH", "WFO" or "Hybrid"), location (only for WFO and Hybrid, otherwise empty), jobType ("Full time", "Part time", "Freelance" or "Internship"), pay (a number in rupees per month, or 0 for unpaid), experienceLevel ("Entry", "Mid" or "Senior"), hrEmail, description (2-3 sentences), skills (array of 3-5), platformsInvolved (array, e.g. ["Instagram", "YouTube"]).
   Mix the values so that filters have something to show.
5. Set up these routes, each showing only its page title for now:
   /  (Landing), /find (Find Opportunities), /jobs/:id (Job Details), /sign-in, /profile, /notifications.
   Unknown addresses should show "Page not found" with a link back to /.
6. Create a top bar on every page: "InfluHunt" wordmark on the left. On the right, a bell icon (links to /notifications) and a round profile icon. Both icons can do nothing else for now.

When done, tell me the exact commands to run the app and the address it opens at.
```

**Test it:**
- [ ] Ran `npm install` then `npm run dev` with no red errors.
- [ ] The browser opens the address and shows the top bar on the page.
- [ ] Typing `/find`, `/jobs/1`, `/profile`, `/sign-in`, `/notifications` in the address bar each shows a page title.
- [ ] Typing `/abc` shows "Page not found".
- [ ] Bell and profile icons are visible at the top right.

**Save:** "Save all changes to git with the message 'Project setup' and push to GitHub." (If Claude Code asks for the GitHub address, give it the one you copied in setup. Ask it to run `git init` and connect to that address first if needed.)

---

### Prompt 1: Landing page

**Paste this:**

```
Build the Landing page at / following CLAUDE.md.

Layout: centred vertically on the page, lots of empty space around it.
- Headline: "Find your next creator job."
- Subline (secondary colour): "Jobs for YouTubers, Instagram creators, editors and artists, in one place."
- Three buttons, stacked on a phone and in a row on a larger screen:
  1. "Find opportunities" (primary, blue). Goes to /find.
  2. "Post an opportunity" (secondary, outlined). When clicked, shows a small line of text: "Coming soon." It does not navigate.
  3. "Sign in" (secondary, outlined). Goes to /sign-in.

Do not add any other content to this page.
```

**Test it:**
- [ ] Headline and subline are readable and centred.
- [ ] Exactly three buttons are visible.
- [ ] "Find opportunities" opens the Find page address.
- [ ] "Post an opportunity" shows "Coming soon" and stays on the same page.
- [ ] "Sign in" opens the Sign In address.
- [ ] Shrink the window (phone mode): buttons stack neatly, nothing runs off the side.

**Save:** "Save all changes to git with the message 'Add landing page' and push to GitHub."

---

### Prompt 2: Find Opportunities page

**Paste this:**

```
Build the Find Opportunities page at /find following CLAUDE.md. Anyone can view this page, signed in or not.

From top to bottom:

1. Search box, placeholder "Search role or channel". It filters the list live as the person types. It matches the job role or the brand name, ignoring capital letters.

2. Filter row. Four simple dropdowns or pill buttons, in this order:
   - Job type: All, Full time, Part time, Freelance, Internship
   - Experience: All, Entry, Mid, Senior
   - Work mode: All, WFH, WFO, Hybrid
   - Pay: All, Paid, Unpaid
   Filters combine with each other (all active filters must match). When any filter is not "All", show a small "Clear filters" text link.

3. A line of small grey text: "Showing 5 opportunities" (the number updates with the filters).

4. Job cards in one column on a phone and two columns on a larger screen. Each card shows, in this order:
   - Brand name, with a small grey platform label (YouTube or Instagram) next to it
   - Job role, bold and larger
   - Niche in grey
   - Work mode. If WFO or Hybrid, also show the location after it.
   - Job type
   - Pay: "₹15,000 / month" for paid, or "Unpaid" for unpaid
   - A "View details" button that goes to /jobs/[id]

   Cards are white, 16px rounded, with a soft hover effect (slight lift, 200ms).

5. If no job matches, show: "No opportunities match. Try clearing a filter."

Read the job list from src/data/jobs.js. Do not build any other screens in this step.
```

**Test it:**
- [ ] All 8 job cards appear, with brand, role, niche, work mode, job type, and pay on each.
- [ ] Type "editor" in search. Only matching roles show. Clear the box. All cards return.
- [ ] Type a brand name in search. Matching cards show.
- [ ] Choose Job type: Freelance. The count changes and only freelance jobs show.
- [ ] Add a second filter, e.g. Pay: Unpaid. Only jobs matching both show.
- [ ] Click "Clear filters". Everything comes back.
- [ ] Choose a combination with no results. The friendly message appears.
- [ ] Click "View details" on any card. The Job Details address opens (empty page for now is fine).
- [ ] On a phone-sized screen, the cards stack in one column and nothing runs off the side.

**Save:** "Save all changes to git with the message 'Add Find Opportunities page' and push to GitHub."

---

### Prompt 3: Job Details page

**Paste this:**

```
Build the Job Details page at /jobs/:id following CLAUDE.md. Read the job with the matching id from src/data/jobs.js.

If no job matches, show "This opportunity is no longer available" with a "Back to opportunities" link.

If a job matches, show these sections in this order:

1. A link at the top: "← Back to opportunities" (goes to /find).
2. Brand name, with the platform label (YouTube or Instagram) beside it.
3. A button "Visit channel" that opens channelUrl in a new tab.
4. Job role as a large heading.
5. One grey line of details: niche · work mode (with location if WFO or Hybrid) · job type · pay (or "Unpaid").
6. Section heading "About the role", then the description.
7. Section heading "Skills required", shown as small rounded chips.
8. Section heading "Where you'll work", listing platformsInvolved.
9. Section heading "Contact", showing the hrEmail as a clickable mailto link.
10. A bottom bar, fixed to the bottom of the screen, with one primary button "Apply now". For now it does nothing when clicked. The next step adds the apply flow.

Keep each section separated by generous space and a thin divider line. Use a single column that is easy to read.
```

**Test it:**
- [ ] Click "View details" on a job from the Find page. The correct job opens.
- [ ] Check that the brand, role, details line, description, skills, platforms, and email all appear.
- [ ] Click "Visit channel". It opens in a new tab.
- [ ] Click the HR email. Your mail app opens with that address.
- [ ] Click "← Back to opportunities". You return to the Find page with your filters reset (fine for now).
- [ ] Type a wrong address such as `/jobs/999`. The "no longer available" message appears.
- [ ] The "Apply now" bar stays visible at the bottom when you scroll.

**Save:** "Save all changes to git with the message 'Add job details page' and push to GitHub."

---

### Prompt 4: Sign In and Profile pages

**Paste this:**

```
Build two pages following CLAUDE.md. Store data in the browser (localStorage), wrapping every read and write in try/catch so the page never crashes.

A) Sign In page at /sign-in
- Heading: "Welcome back".
- Email field and password field (min 6 characters). Button "Sign in".
- There is no real account check yet. Any valid email and a password of 6+ characters signs the person in. Save { signedIn: true, email } in localStorage.
- After signing in, go to /find.
- Below the form, a text link: "Continue as guest" (goes to /find).
- Show small red text under a field only after the button is pressed and the field is wrong.
- When signed in, the top bar profile icon menu should show "Sign out" (built in a later step; for now just save the state).

B) Profile page at /profile. Heading: "Your profile". Fields are grouped into three calm sections.

Section "Basics":
- Name *
- Photo * (file upload. Show a round preview after choosing. Keep the image only in the page for now.)
- Email *
- Phone number *
- Headline (short line, e.g. "Video editor for travel channels")
- What best describes you (dropdown: Youtuber, Instagram creator, Video editor, Designer, Photographer, Artist, Other)
- Location
- Age *
- Gender * (dropdown: Female, Male, Non-binary, Prefer not to say)

Section "About you":
- About you * (textarea)
- Skills * (type a skill and press Enter to add it as a chip. Chips can be removed.)
- Links to your work (textarea, one link per line)
- Channel, if any (text)

Section "Work":
- Experience (optional). A small "Add experience" button that adds a row with Role, Brand and Years. Rows can be removed.
- Job type preference * (checkboxes: Full time, Part time, Freelance, Internship. At least one must be ticked.)

Behaviour:
- Fields marked * are required. Show red text under empty required fields only after "Save profile" is pressed.
- "Save profile" saves to localStorage and shows "Profile saved" in a soft message at the top.
- When the page opens, if a profile is already saved, fill the form with it.
- If the URL has ?apply=JOBID, then after a successful save, go to /jobs/JOBID. (The next step uses this.)
- Keep the form friendly: short labels, a little helper text where it helps, and no clutter.
```

**Test it:**
- [ ] Sign in with `test@test.com` and `123456`. You land on the Find page.
- [ ] Sign in with an empty password. You see red text under the password, and you stay on the page.
- [ ] Click "Continue as guest". You reach the Find page.
- [ ] Open /profile. Press "Save profile" with nothing filled. Every required field shows red text.
- [ ] Fill everything in, add two skills, add one experience row, tick one job type, and upload a photo. Press Save. You see "Profile saved".
- [ ] Refresh the page. Your details are still there.
- [ ] Remove a skill chip and an experience row. Both disappear.
- [ ] Phone-sized screen: the form stays easy to use and nothing runs off the side.

**Save:** "Save all changes to git with the message 'Add sign in and profile pages' and push to GitHub."

---

### Prompt 5: Apply flow

**Paste this:**

```
Build the Apply flow on the Job Details page, following CLAUDE.md. Create one reusable Modal component (soft fade in, white card, dark background dimmed at 40%, closes with a close button or Escape).

The "Apply now" button works like this:

1. If the job is already applied for (stored in localStorage under "applications"), the button reads "Applied" and is disabled.

2. If there is NO saved profile:
   - Go to /profile?apply=JOBID.
   - After the profile is saved on that page, automatically record the application (below) and show the success modal.

3. If a profile EXISTS:
   - Show a modal titled "Apply for [Role] at [Brand]?"
   - Body text: "Your profile will be sent directly to the recruiter. They will contact you if they are interested."
   - Buttons: "Apply" (primary) and "Cancel" (text button).
   - When "Apply" is pressed, record the application and show the success modal.

4. Recording an application: save { jobId, appliedOn: today's date } into the "applications" list in localStorage. Never save the same job twice.

5. Success modal:
   - Title: "Application sent"
   - Text: "The recruiter will reach out if they are interested."
   - One button: "Back to opportunities" (goes to /find).
```

**Test it:**
- [ ] In DevTools, clear Local Storage. Open a job and press "Apply now". You are taken to the Profile page.
- [ ] Fill and save the profile. You return to the job, and a "Application sent" message appears (or it's sent automatically, per the prompt).
- [ ] The button now reads "Applied" and is greyed out.
- [ ] Open a different job with the profile already saved. Press "Apply now". The confirm popup shows the correct role and brand.
- [ ] Press "Cancel". Nothing is recorded.
- [ ] Press "Apply" and check the success message. Press "Back to opportunities".
- [ ] Press Escape or the close button on a popup. It closes.

**Save:** "Save all changes to git with the message 'Add apply flow' and push to GitHub."

---

### Prompt 6: Notifications and profile menu

**Paste this:**

```
Build the Notifications page at /notifications and the profile menu, following CLAUDE.md.

1. Create src/data/notifications.js with 2 sample items:
   - Type "liked": a recruiter liked the profile. Include brandName, role, hrEmail, and a date.
   - Type "applied": the person applied. Include brandName, role, and a date.
   These are sample data only.

2. The Notifications page shows a heading "Notifications" and a list, newest first. It merges:
   - the sample items above, and
   - applications saved in localStorage under "applications" (use the job details from src/data/jobs.js to show brand and role).

   Display:
   - "Applied" rows: "You applied for [Role] at [Brand]" with the date in grey.
   - "Liked" rows: highlighted with a soft blue background. Text: "[Brand] liked your profile." Below it, show the role and the hrEmail as a clickable mailto link.
   - If the list is empty: "No notifications yet."

3. Bell icon in the top bar: show a small blue dot when there is at least one "liked" item the person has not yet seen. Opening the Notifications page marks them as seen (store the seen state in localStorage). The dot then disappears.

4. Profile icon in the top bar opens a small dropdown menu under it:
   - If signed in: "Edit profile" (goes to /profile) and "Sign out" (clears the signed-in state and goes to /).
   - If guest: "Sign in" (goes to /sign-in).
   - Close the menu when clicking anywhere else or pressing Escape.

Do not add new features beyond this.
```

**Test it:**
- [ ] Open /notifications. Both sample items show, with the liked one highlighted and an email link.
- [ ] Apply to a job (from the previous step). Refresh /notifications. An "Applied" row appears at the top.
- [ ] The bell shows a blue dot before you open Notifications, and no dot after you have opened it.
- [ ] Click the profile icon as a guest. The menu shows "Sign in". Click it. You reach the Sign In page.
- [ ] Sign in, then click the profile icon. The menu shows "Edit profile" and "Sign out". Sign out. You return to the landing page.
- [ ] Click outside the menu. It closes.

**Save:** "Save all changes to git with the message 'Add notifications and profile menu' and push to GitHub."

---

### Prompt 7: Final polish and check

**Paste this:**

```
Review every screen against CLAUDE.md and fix only what is needed. Do not add features.

Check:
- Spacing and text sizes are consistent across pages.
- Buttons look the same everywhere (primary blue, secondary outlined).
- Everything works at 375px wide with no horizontal scrolling.
- Every button and link has a visible focus outline when using the Tab key.
- Empty states have a friendly sentence.
- No errors in the browser console when clicking through every screen.
- Clicking through the whole journey works: Landing → Find → Job Details → Apply → Notifications.

Then give me a short plain-language list of anything you changed, and a 10-step test script I can follow myself.
```

**Test it:** Follow the 10-step script Claude Code gives you. Then save with: "Save all changes to git with the message 'Polish applicant app' and push to GitHub."

---

## 7. Notes on the PRD

These are things I noticed while reading the PRD, and how this guide handles them. Tell me if you want any changed.

1. **"Job description page" appears twice** in the PRD. This guide treats them as one page, and includes the HR email from the second version.
2. **Dates are old.** The sprint deadline reads 10/11/23 and the release date says "next sprint". Set your own dates.
3. **Login is fake in this phase.** Any valid email and a 6+ character password works. Real accounts come with Supabase in the next phase.
4. **"Post an opportunity" is a placeholder** ("Coming soon"), because the PRD scopes this release to applicants.
5. **Notifications are simulated.** Real notifications (email or push) come later.
6. **Data stays in your browser.** Profiles, photos and applications are saved only on the device you test on. A real database comes next.
7. **Currency:** the PRD does not say which currency. This guide uses rupees (₹) because the app's timezone is India. Change it if needed.
8. **Semantic (smart) search** is listed in the PRD as "next", so this release uses simple text matching.
9. **The profile "completion %" calculator** is marked "not doing", so it is not in this guide.

---

## 8. Next phase (after this MVP is approved)

- Real login, database and photo storage with **Supabase**.
- A recruiter view (the "Post an opportunity" side).
- Real "recruiter liked your profile" notifications.
- Analytics events from the PRD table (e.g. clicks on Find Opportunities, filters, Apply now) using **Mixpanel**.
- Hosting on **Vercel** so the app has a public link.
