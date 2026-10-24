import { useEffect, useLayoutEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Flag } from 'lucide-react'
import jobs from '../data/jobs.js'
import Modal from '../components/Modal.jsx'
import ReportListingModal from '../components/ReportListingModal.jsx'
import { btnPrimary, btnSecondary } from '../components/ui.js'
import { formatDaysAgo, formatLocation, formatPay, formatShortDate } from '../lib/format.js'
import { hasApplied, recordApplication, useStorageUpdates } from '../lib/storage.js'
import { useAuth } from '../lib/auth.jsx'
import { loginPath } from '../lib/redirect.js'

const linkClass = 'text-accent transition-opacity duration-200 ease-in-out hover:opacity-80'

function Section({ title, children }) {
  return (
    <section className="border-t border-line py-8">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Chips({ items }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item} className="rounded-full bg-white px-3 py-1 text-sm">
          {item}
        </li>
      ))}
    </ul>
  )
}

export default function JobDetails() {
  useStorageUpdates()
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const { user, role, profile, loading } = useAuth()
  const [modal, setModal] = useState(null) // null | 'success' | 'report'
  const job = jobs.find((j) => j.id === id)

  // Open each listing at the top, not at the listings page's scroll position.
  // Braces matter: newer browsers return a Promise from scrollTo, and an effect
  // may only return a cleanup function.
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  // ?apply=1: back from sign-in (and the profile, if it was new), so carry on applying.
  // Waits until sign-in state is known; the flag is dropped so a refresh won't re-apply.
  useEffect(() => {
    if (loading || !job || params.get('apply') !== '1') return
    // Recruiters can't apply: the apply flow sends them to their own home page.
    if (role === 'recruiter') {
      navigate('/recruiter/jobs', { replace: true })
      return
    }
    const rest = new URLSearchParams(params)
    rest.delete('apply')
    setParams(rest, { replace: true, state: location.state })
    if (!user || !hasApplied(user.id, job.id)) handleApply()
    // Only when the flag is seen once sign-in state has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, id])

  // Came from the listings page: step back in history so its search, filters and
  // scroll position come back exactly as left (same as the browser back button).
  function backToOpportunities(e) {
    if (location.state?.fromList) {
      e?.preventDefault()
      navigate(-1)
    } else if (!e) {
      navigate('/find')
    }
  }

  if (!job) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">This opportunity is no longer available</h1>
        <Link to="/find" className={`mt-4 inline-block ${linkClass}`}>
          Back to opportunities
        </Link>
      </div>
    )
  }

  const applied = user ? hasApplied(user.id, job.id) : false

  function handleApply() {
    // Where to come back to so applying carries on automatically.
    const returnTo = `/jobs/${job.id}?apply=1`
    if (!user) {
      // A brand-new account signing in from here becomes an applicant.
      navigate(loginPath(returnTo, 'applicant'))
    } else if (!role) {
      navigate(`/welcome?next=${encodeURIComponent(returnTo)}`)
    } else if (!profile?.profile_completed) {
      navigate(`/profile?next=${encodeURIComponent(returnTo)}`)
    } else {
      // Signed in with a complete profile: send it straight to the recruiter.
      recordApplication(user.id, job.id)
      setModal('success')
    }
  }

  return (
    <div className="pb-24">
      <Link to="/find" onClick={backToOpportunities} className={`inline-flex items-center gap-1 text-sm ${linkClass}`}>
        <ArrowLeft size={16} />
        Back to opportunities
      </Link>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-baseline gap-2">
          <span className="font-medium">{job.brandName}</span>
          <span className="text-sm text-muted">{job.platform}</span>
        </p>
        <a
          href={job.channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btnSecondary} gap-1.5 px-4 py-2 text-sm`}
        >
          Visit channel
          <ExternalLink size={14} />
        </a>
      </div>

      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{job.role}</h1>
      <ul className="mt-4 flex flex-wrap gap-2">
        <li className="rounded-full bg-ink px-3 py-1 text-sm font-medium text-white">
          <span className="sr-only">Commitment: </span>
          {job.commitment}
        </li>
        <li className="rounded-full bg-white px-3 py-1 text-sm">
          <span className="sr-only">Pay: </span>
          {formatPay(job.pay)}
        </li>
        <li className="rounded-full bg-white px-3 py-1 text-sm">
          <span className="sr-only">Location: </span>
          {formatLocation(job)}
        </li>
        <li className="rounded-full bg-white px-3 py-1 text-sm">
          <span className="sr-only">Niche: </span>
          {job.niche}
        </li>
      </ul>
      <p className="mt-3 pb-8 text-sm text-muted">
        Posted {formatDaysAgo(job.postedAt)} · Apply by {formatShortDate(job.applyBy)}
      </p>

      <Section title="About the role">
        <p className="leading-relaxed">{job.description}</p>
      </Section>

      {job.learnings?.length > 0 && (
        <Section title="What you'll learn">
          <ul className="list-disc space-y-1 pl-5 leading-relaxed">
            {job.learnings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Skills & tools">
        <h3 className="mb-2 text-sm text-muted">Skills you'll use</h3>
        <Chips items={job.skills} />
        {job.tools?.length > 0 && (
          <>
            <h3 className="mb-2 mt-5 text-sm text-muted">Tools</h3>
            <Chips items={job.tools} />
          </>
        )}
      </Section>

      {/* lucide-react has no Instagram/YouTube icons, so platforms are plain text. */}
      <Section title="Platforms">
        <p>{job.platformsInvolved.join(', ')}</p>
      </Section>

      <div className="border-t border-line pt-6">
        <button
          type="button"
          onClick={() => setModal('report')}
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors duration-200 ease-in-out hover:text-ink"
        >
          <Flag size={14} />
          Report this listing
        </button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-content items-center gap-4 px-6 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {job.role} · {job.brandName}
            </p>
            <p className="truncate text-sm text-muted">
              {job.commitment} · {formatPay(job.pay)}
            </p>
          </div>
          {role === 'recruiter' ? (
            <p className="shrink-0 text-sm text-muted">Recruiter accounts can't apply.</p>
          ) : (
            <button
              type="button"
              onClick={handleApply}
              disabled={applied || loading}
              className={`${btnPrimary} shrink-0`}
            >
              {applied ? 'Applied' : 'Apply now'}
            </button>
          )}
        </div>
      </div>

      {modal === 'success' && (
        <Modal title="Application sent" onClose={() => setModal(null)}>
          <p className="text-muted">The recruiter will reach out if they are interested.</p>
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={() => backToOpportunities()} className={`${btnPrimary} w-full sm:w-auto`}>
              Back to opportunities
            </button>
          </div>
        </Modal>
      )}

      {modal === 'report' && <ReportListingModal jobId={job.id} onClose={() => setModal(null)} />}
    </div>
  )
}
