import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigationType, useSearchParams } from 'react-router-dom'
import { ChevronDown, Search } from 'lucide-react'
import Modal from '../components/Modal.jsx'
import ApplicationTracker from '../components/ApplicationTracker.jsx'
import Spinner from '../components/Spinner.jsx'
import {
  EXPERIENCE_LEVELS,
  JOB_TYPES,
  experienceLabel,
  fetchOpenJobs,
  formatJobLocation,
  formatJobPay,
  jobTypeLabel,
} from '../lib/jobs.js'
import { getListScroll, saveListScroll } from '../lib/storage.js'
import { fetchMyApplications } from '../lib/applications.js'
import { useAuth } from '../lib/auth.jsx'

// param is the URL query key, so searches and filters survive navigation and can be shared.
const LOCATION_FILTER = { Remote: 'remote', 'On-site': 'city', Hybrid: 'hybrid' }
const FILTERS = [
  { key: 'jobType', param: 'type', label: 'Job type', options: ['All', ...JOB_TYPES.map((t) => t.label)] },
  { key: 'experience', param: 'experience', label: 'Experience', options: ['All', ...EXPERIENCE_LEVELS.map((e) => e.label)] },
  { key: 'location', param: 'mode', label: 'Location', options: ['All', ...Object.keys(LOCATION_FILTER)] },
  { key: 'pay', param: 'pay', label: 'Pay', options: ['All', 'Paid', 'Unpaid'] },
]

// Last list fetched, so coming back to this page shows it straight away (and can restore
// the scroll position) while a fresh copy loads.
let cachedJobs = null

function filtersFromParams(params) {
  return Object.fromEntries(
    FILTERS.map(({ key, param, options }) => {
      const value = params.get(param)
      return [key, options.includes(value) ? value : 'All']
    }),
  )
}

function matchesFilters(job, filters) {
  if (filters.jobType !== 'All' && jobTypeLabel(job.job_type) !== filters.jobType) return false
  if (filters.experience !== 'All' && experienceLabel(job.experience_required) !== filters.experience) return false
  if (filters.location !== 'All' && job.location_type !== LOCATION_FILTER[filters.location]) return false
  if (filters.pay === 'Paid' && job.pay_type === 'unpaid') return false
  if (filters.pay === 'Unpaid' && job.pay_type !== 'unpaid') return false
  return true
}

export default function FindOpportunities() {
  const { role } = useAuth()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const filters = filtersFromParams(params)
  const [trackedJob, setTrackedJob] = useState(null) // job whose application pop-up is open
  // The applicant's applications by job id, for "View application" and the tracker.
  const [applications, setApplications] = useState({})
  useEffect(() => {
    if (role !== 'applicant') {
      setApplications({})
      return
    }
    let active = true
    fetchMyApplications()
      .then((rows) => active && setApplications(Object.fromEntries(rows.map((a) => [a.job_id, a]))))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [role])
  const [jobs, setJobs] = useState(cachedJobs)
  const [loadError, setLoadError] = useState(false)

  // Open jobs only: closed ones (by the recruiter, or past apply-by) never show here.
  useEffect(() => {
    let active = true
    fetchOpenJobs()
      .then((list) => {
        cachedJobs = list
        if (active) setJobs(list)
      })
      .catch(() => {
        if (active && !cachedJobs) setLoadError(true)
      })
    return () => {
      active = false
    }
  }, [])

  const q = query.trim().toLowerCase()
  const results = (jobs ?? []).filter(
    (job) =>
      (job.title.toLowerCase().includes(q) || job.brand_name.toLowerCase().includes(q)) && matchesFilters(job, filters),
  )
  const hasActiveFilter = Object.values(filters).some((value) => value !== 'All')

  // replace, not push, so typing doesn't fill the back button history.
  function updateParams(changes) {
    const next = new URLSearchParams(params)
    for (const [param, value] of Object.entries(changes)) {
      if (value && value !== 'All') next.set(param, value)
      else next.delete(param)
    }
    setParams(next, { replace: true })
  }

  // Keep the scroll position, and restore it when coming back (Back link or browser back).
  const { search } = useLocation()
  const navigationType = useNavigationType()
  const loaded = jobs !== null
  const restoredRef = useRef(false)
  useLayoutEffect(() => {
    // Once, as soon as the list is on screen; later search/filter changes keep the position.
    if (!loaded || restoredRef.current) return
    restoredRef.current = true
    const saved = getListScroll()
    if (navigationType === 'POP' && saved && saved.search === search) window.scrollTo(0, saved.y)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])
  // Layout effect so the listener is gone before the next page resets its scroll. Starts
  // once the list has loaded, so the short loading page doesn't overwrite a saved position.
  useLayoutEffect(() => {
    if (!loaded) return
    const onScroll = () => saveListScroll(search, window.scrollY)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [search, loaded])

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Find Opportunities</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Work behind the scenes with creators you already watch. Pick up real gigs, learn by doing, and build your
        portfolio without going all in.
      </p>

      <label className="relative mt-6 block">
        <span className="sr-only">Search role or channel</span>
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => updateParams({ q: e.target.value })}
          placeholder="Search role or channel"
          className="w-full rounded-input border border-line bg-white py-3 pl-11 pr-4 text-base text-ink placeholder:text-muted outline-none transition-colors duration-200 ease-in-out focus:border-accent"
        />
      </label>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FILTERS.map(({ key, param, label, options }) => (
          <label key={key} className="block">
            <span className="mb-1 block text-xs text-muted">{label}</span>
            <span className="relative block">
              <select
                value={filters[key]}
                onChange={(e) => updateParams({ [param]: e.target.value })}
                className="w-full appearance-none rounded-input border border-line bg-white py-2.5 pl-3 pr-9 text-sm text-ink outline-none transition-colors duration-200 ease-in-out focus:border-accent"
              >
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
              />
            </span>
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-sm text-muted">
          {loaded ? `Showing ${results.length} ${results.length === 1 ? 'opportunity' : 'opportunities'}` : ' '}
        </p>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => updateParams(Object.fromEntries(FILTERS.map(({ param }) => [param, null])))}
            className="text-sm text-accent transition-opacity duration-200 ease-in-out hover:opacity-80"
          >
            Clear filters
          </button>
        )}
      </div>

      {loadError ? (
        <p className="mt-10 text-center text-muted">Couldn't load opportunities. Please refresh to try again.</p>
      ) : !loaded ? (
        <Spinner label="Loading opportunities" />
      ) : jobs.length === 0 ? (
        <p className="mt-10 text-center text-muted">No opportunities yet. New gigs are added every week.</p>
      ) : results.length === 0 ? (
        <p className="mt-10 text-center text-muted">No opportunities match. Try clearing a filter.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {results.map((job) => (
            <li
              key={job.id}
              className="flex flex-col rounded-card bg-white p-5 transition duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-baseline gap-2">
                <span className="truncate text-sm font-medium">{job.brand_name}</span>
                {job.platforms[0] && <span className="shrink-0 text-xs text-muted">{job.platforms[0]}</span>}
              </div>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">{job.title}</h2>
              {job.niche && <p className="text-sm text-muted">{job.niche}</p>}

              <dl className="mt-4 space-y-1 text-sm">
                <div>
                  <dt className="sr-only">Location</dt>
                  <dd>{formatJobLocation(job)}</dd>
                </div>
                <div>
                  <dt className="sr-only">Job type</dt>
                  <dd>{jobTypeLabel(job.job_type)}</dd>
                </div>
                <div>
                  <dt className="sr-only">Pay</dt>
                  <dd className="font-medium">{formatJobPay(job)}</dd>
                </div>
                <div>
                  <dt className="sr-only">Contact email</dt>
                  <dd className="break-all text-muted">{job.contact_email}</dd>
                </div>
              </dl>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  to={`/jobs/${job.id}`}
                  state={{ fromList: true }}
                  className="rounded-full border border-accent px-5 py-2 text-sm font-medium text-accent transition-colors duration-200 ease-in-out hover:bg-accent hover:text-white"
                >
                  View details
                </Link>
                {applications[job.id] && (
                  <button
                    type="button"
                    onClick={() => setTrackedJob(job)}
                    className="rounded-full border border-line px-5 py-2 text-sm font-medium text-ink transition-colors duration-200 ease-in-out hover:border-ink"
                  >
                    View application
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {trackedJob && (
        <Modal
          title="Your application"
          onClose={() => setTrackedJob(null)}
          closeOnBackdrop
        >
          <p className="font-medium">{trackedJob.title}</p>
          <p className="text-sm text-muted">{trackedJob.brand_name}</p>
          <div className="mt-6">
            <ApplicationTracker status={applications[trackedJob.id]?.status ?? 'applied'} />
          </div>
          {applications[trackedJob.id]?.status === 'shortlisted' && (
            <p className="mt-4 text-center text-sm text-muted">The creator will message you here if they'd like to talk.</p>
          )}
        </Modal>
      )}
    </div>
  )
}
