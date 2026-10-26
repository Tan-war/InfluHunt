import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Avatar from '../../components/Avatar.jsx'
import BackLink from '../../components/BackLink.jsx'
import Spinner from '../../components/Spinner.jsx'
import { btnPrimary } from '../../components/ui.js'
import { useAuth } from '../../lib/auth.jsx'
import { fetchJob } from '../../lib/jobs.js'
import { STATUS_LABELS, fetchJobApplicants } from '../../lib/applications.js'
import { STATUS_CHIP, formatCreatorType } from '../../lib/candidates.js'
import { formatDate } from '../../lib/format.js'
import { track } from '../../lib/analytics.js'

const FILTERS = ['all', 'applied', 'viewed', 'shortlisted', 'not_selected']

// /recruiter/jobs/:id/applicants: everyone who applied, newest first. No ranking, no bulk actions.
export default function JobApplicants() {
  const { id } = useParams()
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const filter = FILTERS.includes(params.get('status')) ? params.get('status') : 'all'
  const [data, setData] = useState(undefined) // undefined: loading; null: not found

  useEffect(() => {
    let active = true
    Promise.all([fetchJob(id), fetchJobApplicants(id)])
      .then(([job, applicants]) => active && setData(job && job.recruiter_id === user.id ? { job, applicants } : null))
      .catch(() => active && setData(null))
    return () => {
      active = false
    }
  }, [id, user.id])

  const viewedRef = useRef(false)
  useEffect(() => {
    if (!data || viewedRef.current) return
    viewedRef.current = true
    track('applicants_viewed', { job_id: id })
  }, [data, id])

  if (data === undefined) return <Spinner label="Loading applicants" />
  if (!data) {
    return (
      <div>
        <BackLink to="/recruiter/jobs" label="My job postings" />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">This job isn't available</h1>
      </div>
    )
  }

  const { job, applicants } = data
  const countOf = (status) => (status === 'all' ? applicants.length : applicants.filter((a) => a.status === status).length)
  const shown = filter === 'all' ? applicants : applicants.filter((a) => a.status === filter)

  return (
    <div>
      <BackLink to="/recruiter/jobs" label="My job postings" />
      <div className="mt-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">{job.title}</h1>
          <p className="mt-1 text-muted">
            {applicants.length} {applicants.length === 1 ? 'applicant' : 'applicants'}
          </p>
        </div>
        <span
          className={`mt-2 shrink-0 rounded-full px-3 py-1 text-xs font-medium ${job.is_open ? 'bg-ink text-white' : 'bg-page text-muted'}`}
        >
          {job.is_open ? 'Open' : 'Closed'}
        </span>
      </div>

      {applicants.length === 0 ? (
        <div className="mt-6 rounded-card bg-white px-6 py-12 text-center">
          <p className="text-muted">No applicants yet. Share your job or find talent yourself.</p>
          <Link to="/recruiter/talent" className={`${btnPrimary} mt-6`}>
            Find talent
          </Link>
        </div>
      ) : (
        <>
          {/* Status filter. Scrolls sideways on small phones instead of wrapping. */}
          <div className="-mx-6 mt-6 overflow-x-auto px-6">
            <div role="tablist" aria-label="Filter by status" className="flex w-max gap-2">
              {FILTERS.map((status) => (
                <button
                  key={status}
                  type="button"
                  role="tab"
                  aria-selected={filter === status}
                  onClick={() => setParams(status === 'all' ? {} : { status }, { replace: true })}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors duration-200 ease-in-out ${
                    filter === status ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-ink'
                  }`}
                >
                  {status === 'all' ? 'All' : STATUS_LABELS[status]} ({countOf(status)})
                </button>
              ))}
            </div>
          </div>

          {shown.length === 0 ? (
            <p className="mt-10 text-center text-muted">No applicants with this status.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-card bg-white">
              {shown.map((a) => (
                <li key={a.application_id}>
                  <Link
                    to={`/recruiter/candidates/${a.applicant_id}?application=${a.application_id}`}
                    state={{ source: 'applicants' }}
                    className="flex items-start gap-3 px-4 py-4 transition-colors duration-200 ease-in-out hover:bg-page"
                  >
                    <Avatar url={a.avatar_url} name={a.full_name ?? ''} className="h-12 w-12" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="truncate font-medium">{a.full_name}</span>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CHIP[a.status]}`}>
                          {STATUS_LABELS[a.status]}
                        </span>
                      </span>
                      <span className="block truncate text-sm text-muted">{formatCreatorType(a.roles, a.role_other)}</span>
                      {a.pitch && <span className="mt-1 block text-sm">“{a.pitch}”</span>}
                      <span className="mt-1 block text-xs text-muted">Applied {formatDate(a.applied_at)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
