import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Modal from '../../components/Modal.jsx'
import Spinner from '../../components/Spinner.jsx'
import Toast, { useToast } from '../../components/Toast.jsx'
import { btnPrimary, btnSecondary, btnText } from '../../components/ui.js'
import { useAuth } from '../../lib/auth.jsx'
import { closeJob, fetchJobsByRecruiter, reopenJob } from '../../lib/jobs.js'
import { formatDeadline } from '../../lib/format.js'
import { track } from '../../lib/analytics.js'

const smallBtn = 'px-4 py-2 text-sm'

const brief = (text) => (text.length > 100 ? `${text.slice(0, 100).trimEnd()}…` : text)

// /recruiter/jobs: the recruiter's home page.
export default function MyJobs() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [jobs, setJobs] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [confirmClose, setConfirmClose] = useState(null) // job to close
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [toastVisible, showToast] = useToast()
  const [toastText, setToastText] = useState('')

  const load = useCallback(async () => {
    try {
      setJobs(await fetchJobsByRecruiter(user.id))
      setLoadError(false)
    } catch {
      setLoadError(true)
    }
  }, [user.id])

  useEffect(() => {
    load()
  }, [load])

  // A toast handed over from another page (e.g. "Changes saved" after editing).
  useEffect(() => {
    if (!location.state?.toast) return
    setToastText(location.state.toast)
    showToast()
    navigate('.', { replace: true, state: null })
  }, [location.state, navigate, showToast])

  async function runAction(job, action) {
    setBusyId(job.id)
    setActionError('')
    try {
      if (action === 'close') {
        await closeJob(job.id)
        track('job_closed', { job_id: job.id })
      } else {
        await reopenJob(job.id)
      }
      await load()
    } catch {
      setActionError("That didn't work. Please try again.")
    } finally {
      setBusyId(null)
      setConfirmClose(null)
    }
  }

  if (loadError && !jobs) {
    return <p className="py-10 text-center text-muted">Couldn't load your jobs. Please refresh to try again.</p>
  }
  if (!jobs) return <Spinner label="Loading your jobs" />

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">My job postings</h1>
        {jobs.length > 0 && (
          <Link to="/recruiter/jobs/new" className={`${btnPrimary} ${smallBtn}`}>
            Post an opportunity
          </Link>
        )}
      </div>

      {actionError && <p className="mt-4 text-sm text-red-600">{actionError}</p>}

      {jobs.length === 0 ? (
        <div className="mt-6 rounded-card bg-white px-6 py-12 text-center">
          <p className="text-muted">You haven't posted anything yet.</p>
          <Link to="/recruiter/jobs/new" className={`${btnPrimary} mt-6`}>
            Post your first opportunity
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {jobs.map((job) => {
            const pastDeadline = new Date(job.apply_by) <= new Date()
            return (
              <li key={job.id} className="rounded-card bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-semibold tracking-tight">{job.title}</h2>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      job.is_open ? 'bg-ink text-white' : 'bg-page text-muted'
                    }`}
                  >
                    {job.is_open ? 'Open' : 'Closed'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted">{brief(job.about_role)}</p>
                <dl className="mt-4 space-y-1 text-sm">
                  <div>
                    <dt className="inline text-muted">Apply by: </dt>
                    <dd className="inline">{formatDeadline(job.apply_by)}</dd>
                  </div>
                  <div>
                    <dt className="inline text-muted">Contact: </dt>
                    <dd className="inline break-all">{job.contact_email}</dd>
                  </div>
                </dl>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link to={`/recruiter/jobs/${job.id}/applicants`} className={`${btnPrimary} ${smallBtn}`}>
                    View applicants
                  </Link>
                  <Link to={`/recruiter/jobs/${job.id}/edit`} className={`${btnSecondary} ${smallBtn}`}>
                    Edit job
                  </Link>
                  {job.is_open ? (
                    <button
                      type="button"
                      onClick={() => setConfirmClose(job)}
                      disabled={busyId === job.id}
                      className={`${btnText} ${smallBtn}`}
                    >
                      Close job
                    </button>
                  ) : (
                    // Reopen only while apply-by is still ahead; otherwise edit to extend the date.
                    !pastDeadline && (
                      <button
                        type="button"
                        onClick={() => runAction(job, 'reopen')}
                        disabled={busyId === job.id}
                        className={`${btnText} ${smallBtn}`}
                      >
                        {busyId === job.id ? 'Reopening…' : 'Reopen'}
                      </button>
                    )
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {confirmClose && (
        <Modal title="Close this job?" onClose={() => setConfirmClose(null)}>
          <p className="text-muted">Applicants won't be able to apply anymore.</p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setConfirmClose(null)} className={btnText}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => runAction(confirmClose, 'close')}
              disabled={busyId !== null}
              className={btnPrimary}
            >
              {busyId ? 'Closing…' : 'Close job'}
            </button>
          </div>
        </Modal>
      )}

      <Toast show={toastVisible}>{toastText}</Toast>
    </div>
  )
}
