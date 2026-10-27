import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronDown, ExternalLink, Search, SlidersHorizontal, X } from 'lucide-react'
import Avatar from '../../components/Avatar.jsx'
import BottomSheet from '../../components/BottomSheet.jsx'
import Spinner from '../../components/Spinner.jsx'
import { ROLES, chipClass } from '../../components/ProfileForm.jsx'
import { btnPrimary, btnSecondary, btnText } from '../../components/ui.js'
import { EXPERIENCE_LEVELS, JOB_TYPES, experienceLabel, jobTypeLabel } from '../../lib/jobs.js'
import {
  fetchSkillOptions,
  formatCreatorType,
  linkLabel,
  searchCandidates,
  shortText,
} from '../../lib/candidates.js'
import { track } from '../../lib/analytics.js'

const linkOut = { target: '_blank', rel: 'noopener noreferrer nofollow' }
const NO_FILTERS = { skills: [], creatorType: '', jobType: '', experience: '' }
const CREATOR_TYPES = ROLES.map((role) => ({ value: role, label: role }))
const sameText = (a, b) => a.toLowerCase() === b.toLowerCase()
const filterCount = (f) => f.skills.length + [f.creatorType, f.jobType, f.experience].filter(Boolean).length

// Search and filters live in the URL (q, skill, type, job, exp), so Back brings them back.
function filtersFromParams(params) {
  const pick = (param, list) => (list.some((item) => item.value === params.get(param)) ? params.get(param) : '')
  return {
    skills: params.getAll('skill').filter(Boolean).slice(0, 20),
    creatorType: pick('type', CREATOR_TYPES),
    jobType: pick('job', JOB_TYPES),
    experience: pick('exp', EXPERIENCE_LEVELS),
  }
}

function toParams(query, filters) {
  const next = new URLSearchParams()
  if (query) next.set('q', query)
  filters.skills.forEach((skill) => next.append('skill', skill))
  if (filters.creatorType) next.set('type', filters.creatorType)
  if (filters.jobType) next.set('job', filters.jobType)
  if (filters.experience) next.set('exp', filters.experience)
  return next
}

// Last results, so coming back from a profile shows them (and any "Load more" pages) at once.
let cache = null // { key, rows, hasMore }

function Select({ label, value, options, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-input border border-line bg-white py-2.5 pl-3 pr-9 text-sm text-ink outline-none transition-colors duration-200 ease-in-out focus:border-accent"
        >
          <option value="">Any</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
      </span>
    </label>
  )
}

// Skills multi-select for wider screens: a button that opens a checklist.
function SkillsMenu({ options, selected, onToggle }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <span className="mb-1 block text-xs text-muted">Skills</span>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-input border border-line bg-white py-2.5 pl-3 pr-3 text-left text-sm text-ink outline-none transition-colors duration-200 ease-in-out focus:border-accent"
      >
        <span className="truncate">{selected.length ? `${selected.length} selected` : 'Any'}</span>
        <ChevronDown size={16} className="shrink-0 text-muted" />
      </button>
      {open && (
        <div className="absolute left-0 z-20 mt-1 max-h-72 w-64 overflow-y-auto rounded-input border border-line bg-white p-2 shadow-lg">
          {options.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted">No skills listed yet.</p>
          ) : (
            options.map((skill) => (
              <label
                key={skill}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors duration-200 ease-in-out hover:bg-page"
              >
                <input
                  type="checkbox"
                  checked={selected.some((s) => sameText(s, skill))}
                  onChange={() => onToggle(skill)}
                  className="h-4 w-4 shrink-0 accent-accent"
                />
                {skill}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function ChipGroup({ label, options, isSelected, onToggle }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      {options.length === 0 ? (
        <p className="text-sm text-muted">No skills listed yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected(option.value)}
              onClick={() => onToggle(option.value)}
              className={chipClass(isSelected(option.value))}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </fieldset>
  )
}

// The filters as chip groups, for the phone bottom sheet. Works on a draft until Apply.
function FilterSheet({ initial, skillOptions, onApply, onClose }) {
  const [draft, setDraft] = useState(initial)
  const single = (key) => (value) => setDraft((d) => ({ ...d, [key]: d[key] === value ? '' : value }))

  return (
    <BottomSheet
      title="Filters"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button type="button" onClick={() => setDraft(NO_FILTERS)} className={`${btnText} flex-1`}>
            Clear
          </button>
          <button type="button" onClick={() => onApply(draft)} className={`${btnPrimary} flex-1`}>
            Apply
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <ChipGroup
          label="Skills"
          options={skillOptions.map((skill) => ({ value: skill, label: skill }))}
          isSelected={(skill) => draft.skills.some((s) => sameText(s, skill))}
          onToggle={(skill) => setDraft((d) => ({ ...d, skills: toggleSkill(d.skills, skill) }))}
        />
        <ChipGroup
          label="Type of creator"
          options={CREATOR_TYPES}
          isSelected={(v) => draft.creatorType === v}
          onToggle={single('creatorType')}
        />
        <ChipGroup
          label="Job type"
          options={JOB_TYPES}
          isSelected={(v) => draft.jobType === v}
          onToggle={single('jobType')}
        />
        <ChipGroup
          label="Experience"
          options={EXPERIENCE_LEVELS}
          isSelected={(v) => draft.experience === v}
          onToggle={single('experience')}
        />
      </div>
    </BottomSheet>
  )
}

const toggleSkill = (skills, skill) =>
  skills.some((s) => sameText(s, skill)) ? skills.filter((s) => !sameText(s, skill)) : [...skills, skill]

function CandidateCard({ candidate: c }) {
  const workLink = c.work_links?.[0]
  return (
    <li className="flex flex-col rounded-card bg-white p-5">
      <div className="flex items-start gap-3">
        <Avatar url={c.avatar_url} name={c.full_name ?? ''} className="h-14 w-14" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="min-w-0 break-words text-lg font-semibold tracking-tight">{c.full_name}</h2>
            {c.is_just_starting && (
              <span className="shrink-0 rounded-full bg-page px-2.5 py-0.5 text-xs font-medium">New creator</span>
            )}
          </div>
          <p className="text-sm text-muted">{formatCreatorType(c.roles, c.role_other)}</p>
          {c.experience_level && <p className="text-sm">Experience: {experienceLabel(c.experience_level)}</p>}
        </div>
      </div>

      {c.skills.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Top skills">
          {c.skills.slice(0, 3).map((skill) => (
            <li key={skill} className="rounded-full bg-page px-3 py-1 text-sm">
              {skill}
            </li>
          ))}
        </ul>
      )}

      {c.is_just_starting ? (
        c.bio && <p className="mt-4 text-sm text-muted">{shortText(c.bio)}</p>
      ) : (
        workLink && (
          <a
            href={workLink}
            {...linkOut}
            className="mt-4 inline-flex min-w-0 max-w-full items-center gap-1.5 self-start text-sm text-accent transition-opacity duration-200 ease-in-out hover:opacity-80"
          >
            <span className="truncate">{linkLabel(workLink)}</span>
            <ExternalLink size={14} className="shrink-0" />
          </a>
        )
      )}

      <div className="mt-auto pt-5">
        <Link
          to={`/recruiter/candidates/${c.id}`}
          state={{ source: 'talent' }}
          className="inline-flex rounded-full border border-accent px-5 py-2 text-sm font-medium text-accent transition-colors duration-200 ease-in-out hover:bg-accent hover:text-white"
        >
          View profile
        </Link>
      </div>
    </li>
  )
}

// /recruiter/talent: search applicants who finished their profile. Public fields only.
export default function FindTalent() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const filters = filtersFromParams(params)
  const activeCount = filterCount(filters)

  // Typing updates the URL straight away; the search waits for a short pause.
  const [debouncedQuery, setDebouncedQuery] = useState(query)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const key = JSON.stringify([debouncedQuery.trim().toLowerCase(), filters])
  const [result, setResult] = useState(() => (cache?.key === key ? cache : null))
  const [loadError, setLoadError] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [skillOptions, setSkillOptions] = useState([])

  useEffect(() => {
    let active = true
    fetchSkillOptions()
      .then((skills) => active && setSkillOptions(skills))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (cache?.key === key) {
      setResult(cache)
      return
    }
    let active = true
    const [q, f] = JSON.parse(key)
    setLoadError(false)
    setMoreError(false)
    searchCandidates({ q, ...f })
      .then((page) => {
        if (!active) return
        cache = { key, ...page }
        setResult(cache)
      })
      .catch(() => active && setLoadError(true))
    // Which filters were used, never the search text.
    if (q || filterCount(f) > 0) {
      track('talent_search', {
        has_search: Boolean(q),
        skills: f.skills.length,
        creator_type: f.creatorType || null,
        job_type: f.jobType || null,
        experience: f.experience || null,
      })
    }
    return () => {
      active = false
    }
  }, [key])

  async function loadMore() {
    const [q, f] = JSON.parse(key)
    setLoadingMore(true)
    setMoreError(false)
    try {
      const page = await searchCandidates({ q, ...f }, result.rows.length)
      if (cache?.key !== key) return
      const seen = new Set(result.rows.map((row) => row.id))
      cache = { key, rows: [...result.rows, ...page.rows.filter((row) => !seen.has(row.id))], hasMore: page.hasMore }
      setResult(cache)
    } catch {
      setMoreError(true)
    } finally {
      setLoadingMore(false)
    }
  }

  // replace, not push, so typing and filtering don't fill the back button history.
  const update = (nextQuery, nextFilters) => setParams(toParams(nextQuery, nextFilters), { replace: true })
  const setFilter = (changes) => update(query, { ...filters, ...changes })

  // Selected skills stay listed even if no one has them any more.
  const allSkills = [...skillOptions, ...filters.skills.filter((s) => !skillOptions.some((o) => sameText(o, s)))]

  const chips = [
    ...filters.skills.map((skill) => ({ id: `skill-${skill}`, label: skill, remove: { skills: filters.skills.filter((s) => s !== skill) } })),
    filters.creatorType && { id: 'type', label: filters.creatorType, remove: { creatorType: '' } },
    filters.jobType && { id: 'job', label: jobTypeLabel(filters.jobType), remove: { jobType: '' } },
    filters.experience && { id: 'exp', label: experienceLabel(filters.experience), remove: { experience: '' } },
  ].filter(Boolean)

  const rows = result?.rows ?? []
  const nothingChosen = !debouncedQuery.trim() && activeCount === 0

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Find talent</h1>
      <p className="mt-2 text-muted">Search creators by skill, type and experience.</p>

      <div className="mt-6 flex gap-2">
        <label className="relative block flex-1">
          <span className="sr-only">Search name, creator type or skill</span>
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => update(e.target.value, filters)}
            placeholder="Search name, creator type or skill"
            className="w-full rounded-input border border-line bg-white py-3 pl-11 pr-4 text-base text-ink placeholder:text-muted outline-none transition-colors duration-200 ease-in-out focus:border-accent"
          />
        </label>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={`${btnSecondary} shrink-0 gap-1.5 px-4 py-2 text-sm sm:hidden`}
        >
          <SlidersHorizontal size={16} />
          Filters{activeCount > 0 && ` (${activeCount})`}
        </button>
      </div>

      <div className="mt-4 hidden grid-cols-4 gap-3 sm:grid">
        <SkillsMenu
          options={allSkills}
          selected={filters.skills}
          onToggle={(skill) => setFilter({ skills: toggleSkill(filters.skills, skill) })}
        />
        <Select label="Type of creator" value={filters.creatorType} options={CREATOR_TYPES} onChange={(v) => setFilter({ creatorType: v })} />
        <Select label="Job type" value={filters.jobType} options={JOB_TYPES} onChange={(v) => setFilter({ jobType: v })} />
        <Select label="Experience" value={filters.experience} options={EXPERIENCE_LEVELS} onChange={(v) => setFilter({ experience: v })} />
      </div>

      {chips.length > 0 && (
        <ul className="mt-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((chip) => (
            <li key={chip.id} className="flex items-center gap-1 rounded-full bg-white py-1 pl-3 pr-1 text-sm">
              {chip.label}
              <button
                type="button"
                onClick={() => setFilter(chip.remove)}
                aria-label={`Remove ${chip.label}`}
                className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors duration-200 ease-in-out hover:bg-page hover:text-ink"
              >
                <X size={14} />
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => update(query, NO_FILTERS)}
              className="px-2 text-sm text-accent transition-opacity duration-200 ease-in-out hover:opacity-80"
            >
              Clear all
            </button>
          </li>
        </ul>
      )}

      {loadError ? (
        <p className="mt-10 text-center text-muted">Couldn't load creators. Please refresh to try again.</p>
      ) : !result ? (
        <Spinner label="Loading creators" />
      ) : rows.length === 0 ? (
        <p className="mt-10 text-center text-muted">
          {nothingChosen
            ? 'No creators have joined yet. Check back soon.'
            : 'No creators match these filters yet. Try removing one.'}
        </p>
      ) : (
        <>
          <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2" aria-busy={result.key !== key}>
            {rows.map((candidate) => (
              <CandidateCard key={candidate.id} candidate={candidate} />
            ))}
          </ul>
          {moreError && <p className="mt-6 text-center text-sm text-red-600">Couldn't load more. Please try again.</p>}
          {result.hasMore && (
            <div className="mt-6 flex justify-center">
              <button type="button" onClick={loadMore} disabled={loadingMore || result.key !== key} className={btnSecondary}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}

      {sheetOpen && (
        <FilterSheet
          initial={filters}
          skillOptions={allSkills}
          onClose={() => setSheetOpen(false)}
          onApply={(next) => {
            update(query, next)
            setSheetOpen(false)
          }}
        />
      )}
    </div>
  )
}
