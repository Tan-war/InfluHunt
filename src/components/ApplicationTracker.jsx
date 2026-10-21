import { Check } from 'lucide-react'

const STEPS = [
  { key: 'applied', label: 'Applied', note: 'Your application has been sent.' },
  { key: 'viewed', label: 'Viewed', note: 'The recruiter has checked out your application.' },
  { key: 'shortlisted', label: 'Shortlisted', note: "You've been shortlisted! Say hi to the recruiter." },
]

const CIRCLE = 32 // px

// Three-step progress: Applied → Viewed → Shortlisted.
export default function ApplicationTracker({ status }) {
  const index = Math.max(0, STEPS.findIndex((step) => step.key === status))
  // Shortlisted is the final step, so every step counts as done.
  const current = status === 'shortlisted' ? STEPS.length : index

  return (
    <div>
      <ol className="flex">
        {STEPS.map((step, i) => {
          const done = i < current
          const isCurrent = i === current
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
                  done
                    ? 'border-ink bg-ink text-white'
                    : isCurrent
                      ? 'border-ink bg-white text-ink shadow-[0_0_0_4px_theme(colors.page)]'
                      : 'border-line bg-white text-muted'
                }`}
                style={{ width: CIRCLE, height: CIRCLE }}
              >
                {done ? <Check size={16} strokeWidth={3} aria-hidden="true" /> : i + 1}
              </span>
              <span className={`mt-2 text-sm ${isCurrent ? 'font-semibold text-ink' : done ? 'text-ink' : 'text-muted'}`}>
                {step.label}
              </span>
              <span className="sr-only">{done ? '(done)' : isCurrent ? '(current step)' : '(not yet)'}</span>
            </li>
          )
        })}
      </ol>
      <p className="mt-6 text-center text-muted">{STEPS[index].note}</p>
    </div>
  )
}
