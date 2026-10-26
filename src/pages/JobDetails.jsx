import { useEffect, useLayoutEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Flag } from 'lucide-react'
import ApplicationTracker from '../components/ApplicationTracker.jsx'
import Avatar from '../components/Avatar.jsx'
import Modal from '../components/Modal.jsx'
import Spinner from '../components/Spinner.jsx'
import ReportListingModal from '../components/ReportListingModal.jsx'
import { btnPrimary, btnSecondary, btnText, inputClass } from '../components/ui.js'
import { Counter } from '../components/ProfileForm.jsx'
import { formatDaysAgo, formatDeadline } from '../lib/format.js'
import { fetchJob, formatJobLocation, formatJobPay, isJobOpen, jobTypeLabel } from '../lib/jobs.js'
import { MAX_PITCH, applyToJob, fetchMyApplication } from '../lib/applications.js'
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
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const { user, role, profile, loading } = useAuth()
  const [modal, setModal] = useState(null) // null | 'apply' | 'success' | 'tracker' | 'report'
  const [pitch, setPitch] = useState('')
  const [sending, setSending] = useState(false)
  const [applyError, setApplyError] = useState('')
  // The signed-in applicant's application to this job: undefined while loading, null if none.
  const [myApplication, setMyApplication] = useState(undefined)
  const [job, setJob] = useState(undefined) // undefined: loading; null: not found

  useEffect(() => {
    let active = true
    setJob(undefined)
    fetchJob(id)
      .then((row) => active && setJob(row))
      .catch(() => active && setJob(null))
    return () => {
      active = false
    }
  }, [id])

  // Open each listing at the top, not at the listings page's scroll position.
  // Braces matter: newer browsers return a Promise from scrollTo, and an effect
  // may only return a cleanup function.
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  useEffect(() => {
    if (loading) return
    if (role !== 'applicant' || !job) {
      setMyApplication(null)
      return
    }
    let active = true
    fetchMyApplication(job.id)
      .then((row) => active && setMyApplication(row))
      .catch(() => active && setMyApplication(null))
    return () => {
      active = false
    }
  }, [loading, role, job])

  // ?apply=1: back from sign-in (and the profile, if it was new), so carry on applying.
  // Waits until sign-in state is known; the flag is dropped so a refresh won't re-apply.
  useEffect(() => {
    if (loading || !job || myApplication === undefined || params.get('apply') !== '1') return
    // Recruiters can't apply: the apply flow sends them to their own home page.
    if (role === 'recruiter') {
      navigate('/recruiter/jobs', { replace: true })
      return
    }
    const rest = new URLSearchParams(params)
    rest.delete('apply')
    setParams(rest, { replace: true, state: location.state })
    if (isJobOpen(job) && !myApplication) handleApply()
    // Only when the flag is seen once sign-in state, the job and any application have loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, id, job, myApplication])

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

  if (job === undefined) return <Spinner label="Loading opportunity" />

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

  const applied = !!myApplication
  const open = isJobOpen(job)
  const learnings = (job.what_you_learn ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

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
      // Signed in with a complete profile: one optional line, then it goes to the recruiter.
      setApplyError('')
      setModal('apply')
    }
  }

  async function sendApplication(e) {
    e.preventDefault()
    if (sending || pitch.length > MAX_PITCH) return
    setSending(true)
    setApplyError('')
    try {
      const result = await applyToJob(user.id, job.id, pitch)
      if (result === 'closed') {
        setApplyError('Applications just closed for this job.')
      } else {
        setMyApplication(await fetchMyApplication(job.id))
        setPitch('')
        setModal('success')
      }
    } catch {
      setApplyError("We couldn't send your application. Please try again.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="pb-24">
      <Link to="/find" onClick={backToOpportunities} className={`inline-flex items-center gap-1 text-sm ${linkClass}`}>
        <ArrowLeft size={16} />
        Back to opportunities
      </Link>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        {/* Who's hiring: taps through to their public recruiter profile. */}
        <Link to={`/recruiters/${job.recruiter_id}`} className="flex min-w-0 items-center gap-3">
          <Avatar url={job.logo_url} name={job.brand_name} className="h-11 w-11 border border-line" />
          <span className="min-w-0">
            <span className="block truncate font-medium">{job.brand_name}</span>
            <span className="block truncate text-sm text-muted">by {job.recruiter_name}</span>
          </span>
        </Link>
        <a
          href={job.primary_link}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btnSecondary} gap-1.5 px-4 py-2 text-sm`}
        >
          Visit channel
          <ExternalLink size={14} />
        </a>
      </div>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{job.title}</h1>
      <ul className="mt-4 flex flex-wrap gap-2">
        <li className="rounded-full bg-ink px-3 py-1 text-sm font-medium text-white">
          <span className="sr-only">Job type: </span>
          {jobTypeLabel(job.job_type)}
        </li>
        <li className="rounded-full bg-white px-3 py-1 text-sm">
          <span className="sr-only">Pay: </span>
          {formatJobPay(job)}
        </li>
        <li className="rounded-full bg-white px-3 py-1 text-sm">
          <span className="sr-only">Location: </span>
          {formatJobLocation(job)}
        </li>
        {job.niche && (
          <li className="rounded-full bg-white px-3 py-1 text-sm">
            <span className="sr-only">Niche: </span>
            {job.niche}
          </li>
        )}
      </ul>
      <p className="mt-3 pb-8 text-sm text-muted">
        Posted {formatDaysAgo(job.created_at)} ·{' '}
        {open ? `Apply by ${formatDeadline(job.apply_by)}` : 'Applications closed'}
      </p>

      <Section title="About the role">
        <p className="whitespace-pre-line leading-relaxed">{job.about_role}</p>
      </Section>

      {learnings.length > 0 && (
        <Section title="What you'll learn">
          {/* One point per line, as the recruiter typed them. */}
          {learnings.length === 1 ? (
            <p className="leading-relaxed">{learnings[0]}</p>
          ) : (
            <ul className="list-disc space-y-1 pl-5 leading-relaxed">
              {learnings.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
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
      {job.platforms.length > 0 && (
        <Section title="Platforms">
          <p>{job.platforms.join(', ')}</p>
        </Section>
      )}

      <Section title="Contact">
        <p className="break-all">{job.contact_email}</p>
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
              {job.title} · {job.brand_name}
            </p>
            <p className="truncate text-sm text-muted">
              {jobTypeLabel(job.job_type)} · {formatJobPay(job)}
            </p>
          </div>
          {role === 'recruiter' ? (
            <p className="shrink-0 text-sm text-muted">Recruiter accounts can't apply.</p>
          ) : !open && !applied ? (
            <p className="shrink-0 text-sm font-medium text-muted">Applications closed</p>
          ) : (
            <button
              type="button"
              onClick={applied ? () => setModal('tracker') : handleApply}
              disabled={loading || (user && myApplication === undefined)}
              className={`${applied ? btnSecondary : btnPrimary} shrink-0`}
            >
              {applied ? 'View application' : 'Apply now'}
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

      {modal === 'apply' && (
        <Modal title={`Apply for ${job.title}`} onClose={() => setModal(null)}>
          <form onSubmit={sendApplication} noValidate>
            <label htmlFor="apply-pitch" className="mb-1.5 block text-sm font-medium">
              Why you? <span className="font-normal text-muted">(one line, optional)</span>
            </label>
            <textarea
              id="apply-pitch"
              rows={2}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="e.g. I edit 20+ reels a month for a food page."
              className={inputClass(pitch.length > MAX_PITCH)}
            />
            <Counter length={pitch.length} max={MAX_PITCH} />
            <p className="mt-2 text-[13px] text-muted">The creator sees your profile with this line.</p>
            {applyError && <p className="mt-3 text-sm text-red-600">{applyError}</p>}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setModal(null)} className={btnText}>
                Cancel
              </button>
              <button type="submit" disabled={sending || pitch.length > MAX_PITCH} className={btnPrimary}>
                {sending ? 'Sending…' : 'Send application'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'tracker' && myApplication && (
        <Modal title="Your application" onClose={() => setModal(null)} closeOnBackdrop>
          <p className="font-medium">{job.title}</p>
          <p className="text-sm text-muted">{job.brand_name}</p>
          <div className="mt-6">
            <ApplicationTracker status={myApplication.status} />
          </div>
          {myApplication.pitch && <p className="mt-4 text-center text-sm text-muted">Your line: “{myApplication.pitch}”</p>}
        </Modal>
      )}

      {modal === 'report' && <ReportListingModal jobId={job.id} onClose={() => setModal(null)} />}
    </div>
  )
}
