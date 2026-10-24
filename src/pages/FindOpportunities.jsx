import { useLayoutEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useNavigationType, useSearchParams } from 'react-router-dom'
import { ChevronDown, Search } from 'lucide-react'
import jobs from '../data/jobs.js'
import Modal from '../components/Modal.jsx'
import ApplicationTracker from '../components/ApplicationTracker.jsx'
import { btnPrimary } from '../components/ui.js'
import { formatPay, formatWorkMode } from '../lib/format.js'
import { getApplication, getListScroll, hasApplied, saveListScroll } from '../lib/storage.js'
import { getOrCreateConversation } from '../lib/chat/chatService.js'
import { track } from '../lib/analytics.js'
import { useAuth } from '../lib/auth.jsx'

// param is the URL query key, so searches and filters survive navigation and can be shared.
const FILTERS = [
  { key: 'jobType', param: 'type', label: 'Job type', options: ['All', 'Full time', 'Part time', 'Freelance', 'Internship'] },
  { key: 'experienceLevel', param: 'experience', label: 'Experience', options: ['All', 'Entry', 'Mid', 'Senior'] },
  { key: 'workMode', param: 'mode', label: 'Work mode', options: ['All', 'WFH', 'WFO', 'Hybrid'] },
  { key: 'pay', param: 'pay', label: 'Pay', options: ['All', 'Paid', 'Unpaid'] },
]

function filtersFromParams(params) {
  return Object.fromEntries(
    FILTERS.map(({ key, param, options }) => {
      const value = params.get(param)
      return [key, options.includes(value) ? value : 'All']
    }),
  )
}

function matchesFilters(job, filters) {
  if (filters.jobType !== 'All' && job.jobType !== filters.jobType) return false
  if (filters.experienceLevel !== 'All' && job.experienceLevel !== filters.experienceLevel) return false
  if (filters.workMode !== 'All' && job.workMode !== filters.workMode) return false
  if (filters.pay === 'Paid' && job.pay === 0) return false
  if (filters.pay === 'Unpaid' && job.pay !== 0) return false
  return true
}

export default function FindOpportunities() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const filters = filtersFromParams(params)
  const [trackedJob, setTrackedJob] = useState(null) // job whose application pop-up is open
  const [chatError, setChatError] = useState('')
  const navigate = useNavigate()

  // Opens this application's chat, creating it the first time.
  async function openChat(job) {
    setChatError('')
    try {
      const conversation = await getOrCreateConversation(getApplication(user.id, job.id)?.id)
      track('chat_started_from_tracker', { conversation_id: conversation.id })
      navigate(`/chat/${conversation.id}`)
    } catch {
      setChatError("Couldn't open the chat. Please try again.")
    }
  }

  const q = query.trim().toLowerCase()
  const results = jobs.filter(
    (job) =>
      (job.role.toLowerCase().includes(q) || job.brandName.toLowerCase().includes(q)) &&
      matchesFilters(job, filters),
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
  useLayoutEffect(() => {
    const saved = getListScroll()
    if (navigationType === 'POP' && saved && saved.search === search) window.scrollTo(0, saved.y)
    // Only on arrival; later search/filter changes keep the current position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Layout effect so the listener is gone before the next page resets its scroll.
  useLayoutEffect(() => {
    const onScroll = () => saveListScroll(search, window.scrollY)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [search])

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
          Showing {results.length} {results.length === 1 ? 'opportunity' : 'opportunities'}
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

      {results.length === 0 ? (
        <p className="mt-10 text-center text-muted">No opportunities match. Try clearing a filter.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {results.map((job) => (
            <li
              key={job.id}
              className="flex flex-col rounded-card bg-white p-5 transition duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-baseline gap-2">
                <span className="truncate text-sm font-medium">{job.brandName}</span>
                <span className="shrink-0 text-xs text-muted">{job.platform}</span>
              </div>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">{job.role}</h2>
              <p className="text-sm text-muted">{job.niche}</p>

              <dl className="mt-4 space-y-1 text-sm">
                <div>
                  <dt className="sr-only">Work mode</dt>
                  <dd>{formatWorkMode(job)}</dd>
                </div>
                <div>
                  <dt className="sr-only">Job type</dt>
                  <dd>{job.jobType}</dd>
                </div>
                <div>
                  <dt className="sr-only">Pay</dt>
                  <dd className="font-medium">{formatPay(job.pay)}</dd>
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
                {user && hasApplied(user.id, job.id) && (
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
          onClose={() => {
            setTrackedJob(null)
            setChatError('')
          }}
          closeOnBackdrop
        >
          <p className="font-medium">{trackedJob.role}</p>
          <p className="text-sm text-muted">
            {trackedJob.brandName} · {trackedJob.platform}
          </p>
          <div className="mt-6">
            <ApplicationTracker status={trackedJob.applicationStatus ?? 'applied'} />
          </div>
          {trackedJob.applicationStatus === 'shortlisted' && (
            <div className="mt-6 flex justify-center">
              <button type="button" onClick={() => openChat(trackedJob)} className={`${btnPrimary} w-full sm:w-auto`}>
                Chat with recruiter
              </button>
            </div>
          )}
          {chatError && <p className="mt-3 text-center text-sm text-red-600">{chatError}</p>}
        </Modal>
      )}
    </div>
  )
}
