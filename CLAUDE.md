# InfluHunt — Applicant App

InfluHunt is a job search app for creator and artistic roles (YouTube, Instagram, editing, design).
Applicants browse opportunities posted by creators and brands, view details, and apply.
This is the APPLICANT side only.

## Tech stack

- React, Vite, Tailwind CSS, React Router, Lucide icons (JavaScript, not TypeScript).
- No backend yet; data comes from local mock files (`src/data/`) and browser localStorage.
- All localStorage access goes through `src/lib/storage.js` (try/catch wrapped). Signed in = session flag set; creating a profile also signs in. Sign out clears only the session.

## Design rules

- Font: system font stack (-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif).
- Page background #F5F5F7. Cards white. Main text #1D1D1F. Secondary text #6E6E73. Borders #D2D2D7.
- Accent colour #0071E3, used only for primary buttons and links.
- Cards have 16px rounded corners, inputs 12px, buttons fully rounded (pill shape).
- Content in a centred column, max width 960px, with at least 24px side padding. Exception: the top bar spans the full page width (24px side padding).
- One primary action per screen.
- Transitions 200ms ease. No bounce, no flashing.
- Works at 375px width with no horizontal scrolling.
- Friendly empty-state sentence whenever a list is empty.

Tailwind tokens for these live in `tailwind.config.js`: `bg-page`, `text-ink`, `text-muted`, `border-line`, `bg-accent`/`text-accent`, `rounded-card`, `rounded-input`, `max-w-content`.

## Working rule

Build only the screen asked for in each step. Do not add features that were not asked for.
