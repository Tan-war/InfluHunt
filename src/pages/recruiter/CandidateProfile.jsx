import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { ExternalLink, MessageCircle } from 'lucide-react'
import ApplicationTracker from '../../components/ApplicationTracker.jsx'
import Avatar from '../../components/Avatar.jsx'
import BackLink from '../../components/BackLink.jsx'
import Modal from '../../components/Modal.jsx'
import Spinner from '../../components/Spinner.jsx'
import { btnPrimary, btnSecondary, btnText } from '../../components/ui.js'
import { fetchApplication, fetchCandidate, setApplicationStatus } from '../../lib/applications.js'
import { firstName, formatCreatorType } from '../../lib/candidates.js'
import { fetchJob } from '../../lib/jobs.js'
import { formatDate } from '../../lib/format.js'
import { track } from '../../lib/analytics.js'

const linkOut = { target: '_blank', rel: 'noopener noreferrer nofollow' }

function Section({ title, children }) {
  return (
    <section className="border-t border-line pt-5">
      <h2 className="text-sm font-medium text-muted">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}

// /recruiter/candidates/:userId[?application=<id>]: an applicant's public profile (never email
// or phone). With ?application, also that application's tracker and the Shortlist / Not
// selected actions; opening it moves Applied to Viewed.
export default function CandidateProfile() {
  const { userId } = useParams()
  const [params] = useSearchParams()
  const location = useLocation()
  const applicationId = params.get('application')
  const [candidate, setCandidate] = useState(undefined) // undefined: loading; null: unavailable
  const [application, setApplication] = useState(null)
  const [job, setJob] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmNotSelected, setConfirmNotSelected] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const person = await fetchCandidate(userId)
        let app = null
        let appJob = null
        if (person && applicationId) {
          app = await fetchApplication(applicationId)
          if (app && app.applicant_id !== userId) app = null
          if (app) appJob = await fetchJob(app.job_id)
        }
        if (!active) return
        setCandidate(person)
        setApplication(app)
        setJob(appJob)
      } catch {
        if (active) setCandidate(null)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [userId, applicationId])

  // First time a recruiter opens a new application, it becomes Viewed.
  const markedRef = useRef(false)
  useEffect(() => {
    if (!application || application.status !== 'applied' || markedRef.current) return
    markedRef.current = true
    setApplicationStatus(application.id, 'viewed')
      .then(() => {
        setApplication((a) => ({ ...a, status: 'viewed' }))
        track('application_status_changed', { from: 'applied', to: 'viewed' })
      })
      .catch(() => {})
  }, [application])

  const trackedRef = useRef(false)
  useEffect(() => {
    if (!candidate || trackedRef.current) return
    trackedRef.current = true
    track('candidate_profile_viewed', { source: location.state?.source ?? (applicationId ? 'applicants' : 'talent') })
  }, [candidate, applicationId, location.state])

  async function changeStatus(to) {
    const from = application.status
    setSaving(true)
    setError('')
    try {
      await setApplicationStatus(application.id, to)
      setApplication((a) => ({ ...a, status: to }))
      track('application_status_changed', { from, to })
    } catch {
      setError("That didn't work. Please try again.")
    } finally {
      setSaving(false)
      setConfirmNotSelected(false)
    }
  }

  const back = applicationId && application ? (
    <BackLink to={`/recruiter/jobs/${application.job_id}/applicants`} label="Applicants" />
  ) : (
    <BackLink />
  )

  if (candidate === undefined) return <Spinner label="Loading profile" />
  if (!candidate) {
    return (
      <div>
        {back}
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">This profile isn't available</h1>
      </div>
    )
  }

  const name = firstName(candidate.full_name)
  const status = application?.status
  // Chat with applicants arrives in phase 5; until then this opens the chat page.
  const messageButton = (
    <Link to="/chat" className={`${btnSecondary} gap-1.5 px-4 py-2 text-sm`}>
      <MessageCircle size={16} />
      Message {name}
    </Link>
  )

  return (
    <div>
      {back}

      <div className="mt-6 rounded-card bg-white p-6">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar url={candidate.avatar_url} name={candidate.full_name ?? ''} className="h-20 w-20 border border-line" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{candidate.full_name}</h1>
              {candidate.no_work_yet && (
                <span className="rounded-full bg-page px-2.5 py-0.5 text-xs font-medium">New creator</span>
              )}
            </div>
            <p className="text-muted">{formatCreatorType(candidate.roles, candidate.role_other)}</p>
          </div>
          {/* Once shortlisted, the application card below shows the Message button instead. */}
          {status !== 'shortlisted' && messageButton}
        </div>

        <div className="mt-6 space-y-5">
          {candidate.bio && (
            <Section title="About">
              <p className="whitespace-pre-line leading-relaxed">{candidate.bio}</p>
            </Section>
          )}
          {candidate.no_work_yet ? (
            candidate.starting_note && (
              <Section title="What they'd like to try first">
                <p className="whitespace-pre-line leading-relaxed">{candidate.starting_note}</p>
              </Section>
            )
          ) : (
            candidate.work_links.length > 0 && (
              <Section title="Work">
                <ul className="space-y-1.5">
                  {candidate.work_links.map((url) => (
                    <li key={url}>
                      <a href={url} {...linkOut} className="inline-flex items-center gap-1.5 break-all text-accent hover:opacity-80">
                        {url}
                        <ExternalLink size={14} className="shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              </Section>
            )
          )}
          {candidate.skills.length > 0 && (
            <Section title="Skills">
              <ul className="flex flex-wrap gap-2">
                {candidate.skills.map((skill) => (
                  <li key={skill} className="rounded-full bg-page px-3 py-1 text-sm">
                    {skill}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>

      {application && (
        <div className="mt-6 rounded-card bg-white p-6">
          <h2 className="text-lg font-semibold tracking-tight">
            Application for{' '}
            {job ? (
              <Link to={`/jobs/${job.id}`} className="text-accent hover:opacity-80">
                {job.title}
              </Link>
            ) : (
              'your job'
            )}
          </h2>
          <p className="mt-1 text-sm text-muted">Applied {formatDate(application.created_at)}</p>
          {application.pitch && <p className="mt-3">“{application.pitch}”</p>}

          <div className="mt-6">
            <ApplicationTracker status={status} audience="recruiter" />
          </div>

          {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {status !== 'not_selected' && (
              <button type="button" onClick={() => setConfirmNotSelected(true)} disabled={saving} className={btnText}>
                Not selected
              </button>
            )}
            {status === 'shortlisted' ? (
              <Link to="/chat" className={btnPrimary}>
                Message {name}
              </Link>
            ) : (
              <button type="button" onClick={() => changeStatus('shortlisted')} disabled={saving} className={btnPrimary}>
                {saving ? 'Saving…' : 'Shortlist'}
              </button>
            )}
          </div>
        </div>
      )}

      {confirmNotSelected && (
        <Modal title={`Mark ${name} as not selected?`} onClose={() => setConfirmNotSelected(false)}>
          <p className="text-muted">They'll see a kind note in their tracker. You can shortlist them later if you change your mind.</p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setConfirmNotSelected(false)} className={btnText}>
              Cancel
            </button>
            <button type="button" onClick={() => changeStatus('not_selected')} disabled={saving} className={btnPrimary}>
              {saving ? 'Saving…' : 'Not selected'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
