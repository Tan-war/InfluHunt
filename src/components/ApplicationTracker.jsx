import { Check, X } from 'lucide-react'

// Status notes for each side. audience: 'applicant' (default) or 'recruiter'.
const NOTES = {
  applicant: {
    applied: 'Your application has been sent.',
    viewed: 'The recruiter has checked out your application.',
    shortlisted: "You've been shortlisted! The creator may message you.",
    not_selected: "This one didn't work out. Keep going, new gigs are added every week.",
  },
  recruiter: {
    applied: 'New application.',
    viewed: "You've seen this application.",
    shortlisted: 'Shortlisted ✅',
    not_selected: 'Marked as not selected.',
  },
}

const CIRCLE = 32 // px

// Three-step progress: Applied → Viewed → Shortlisted (or Not selected).
export default function ApplicationTracker({ status, audience = 'applicant' }) {
  const notSelected = status === 'not_selected'
  const STEPS = [
    { key: 'applied', label: 'Applied' },
    { key: 'viewed', label: 'Viewed' },
    notSelected ? { key: 'not_selected', label: 'Not selected' } : { key: 'shortlisted', label: 'Shortlisted' },
  ]
  const index = Math.max(0, STEPS.findIndex((step) => step.key === status))
  // The last step (Shortlisted or Not selected) ends it, so every step counts as done.
  const current = index === STEPS.length - 1 ? STEPS.length : index

  return (
    <div>
      <ol className="flex">
        {STEPS.map((step, i) => {
          const done = i < current
          const isCurrent = i === current
          // Not selected: the last step shows a grey cross instead of a tick.
          const crossed = notSelected && i === STEPS.length - 1
          return (
            <li
              key={step.key}
              aria-current={isCurrent ? 'step' : undefined}
              className="relative flex flex-1 flex-col items-center text-center"
            >
              {i > 0 && (
                // Runs from the right edge of the previous circle to the left edge of this one.
                <span
                  aria-hidden="true"
                  className={`absolute z-0 h-0.5 -translate-y-1/2 ${i <= current ? 'bg-ink' : 'bg-line'}`}
                  style={{
                    top: CIRCLE / 2,
                    left: `calc(-50% + ${CIRCLE / 2}px)`,
                    right: `calc(50% + ${CIRCLE / 2}px)`,
                  }}
                />
              )}
              <span
                className={`relative z-10 flex items-center justify-center rounded-full border-2 text-sm font-semibold ${
                  crossed
                    ? 'border-muted bg-muted text-white'
                    : done
                    ? 'border-ink bg-ink text-white'
                    : isCurrent
                      ? 'border-ink bg-white text-ink shadow-[0_0_0_4px_theme(colors.page)]'
                      : 'border-line bg-white text-muted'
                }`}
                style={{ width: CIRCLE, height: CIRCLE }}
              >
                {crossed ? (
                  <X size={16} strokeWidth={3} aria-hidden="true" />
                ) : done ? (
                  <Check size={16} strokeWidth={3} aria-hidden="true" />
                ) : (
                  i + 1
                )}
              </span>
              <span className={`mt-2 text-sm ${isCurrent ? 'font-semibold text-ink' : done ? 'text-ink' : 'text-muted'}`}>
                {step.label}
              </span>
              <span className="sr-only">{done ? '(done)' : isCurrent ? '(current step)' : '(not yet)'}</span>
            </li>
          )
        })}
      </ol>
      <p className="mt-6 text-center text-muted">{NOTES[audience][status] ?? NOTES[audience].applied}</p>
    </div>
  )
}
