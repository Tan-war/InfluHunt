import { useEffect, useId, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { Briefcase, Camera, FolderOpen, Link2, Palette, Plus, SquarePlay, X } from 'lucide-react'
import Modal from './Modal.jsx'
import { EXPERIENCE_LEVELS, JOB_PLATFORMS, JOB_TYPES } from '../lib/jobs.js'
import { btnPrimary, btnSecondary, btnText, inputClass } from './ui.js'

// Types of creator. Also the Type of creator filter on Find Talent.
export const ROLES = [
  'Video editor',
  'Scriptwriter',
  'Thumbnail designer',
  'Social media manager',
  'Photographer',
  'Researcher',
  'On-camera talent',
  'Other',
]
const MAX_ROLES = 3

const ROLE_SKILLS = {
  'Video editor': ['Premiere Pro', 'CapCut', 'DaVinci Resolve', 'Reels editing'],
  'Thumbnail designer': ['Photoshop', 'Canva', 'Figma'],
  Scriptwriter: ['Research', 'Storytelling', 'Hooks'],
  'Social media manager': ['Content calendar', 'Copywriting', 'Instagram Insights'],
  Photographer: ['Lightroom', 'Portrait', 'Product photography'],
  Researcher: ['Research', 'Fact-checking', 'Trend spotting'],
  'On-camera talent': ['Presenting', 'Voiceover'],
}
const MAX_SKILLS = 5
const MAX_LINKS = 5
const MAX_TEXT = 300

// lucide-react has no brand icons, so recognised platforms get the closest generic icon.
const PLATFORMS = [
  { name: 'YouTube', hosts: ['youtube.com', 'youtu.be'], Icon: SquarePlay },
  { name: 'Instagram', hosts: ['instagram.com'], Icon: Camera },
  { name: 'Behance', hosts: ['behance.net'], Icon: Palette },
  { name: 'Google Drive', hosts: ['drive.google.com', 'docs.google.com'], Icon: FolderOpen },
  { name: 'LinkedIn', hosts: ['linkedin.com'], Icon: Briefcase },
]

// Returns { platform } for a usable full link, or null. Links must start with http(s)://.
// Platform links also need a path or handle (https://youtube.com alone isn't your work);
// other sites may be a bare domain, since many portfolios live at the root.
function parseLink(raw) {
  const text = raw.trim()
  if (!/^https?:\/\//i.test(text)) return null
  let url
  try {
    url = new URL(text)
  } catch {
    return null
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, '')
  if (!host.includes('.')) return null
  const platform = PLATFORMS.find((p) => p.hosts.some((h) => host === h || host.endsWith(`.${h}`))) ?? null
  const hasPath = url.pathname.replace(/\/+$/, '') !== '' || url.search !== ''
  if (platform && !hasPath) return null
  return { platform }
}

const toggleIn = (list, item) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])

const newLinkRow = (url = '') => ({ id: `${Date.now()}-${Math.random()}`, url })

// Capitalise the first letter of each word, leaving the rest as typed.
const capitalise = (text) => text.trim().replace(/(^|\s)(\S)/g, (_, space, ch) => space + ch.toUpperCase())

// Stored profile → form values. Older profiles are mapped where a new field replaces an old one.
function toFormValues(stored, sessionEmail) {
  const s = stored ?? {}
  const oldLinks = String(s.links ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const links = (s.workLinks ?? oldLinks).slice(0, MAX_LINKS)
  const digits = String(s.phone ?? '').replace(/\D/g, '')
  return {
    name: s.name ?? '',
    roles: s.roles ?? (ROLES.includes(s.describes) ? [s.describes] : []),
    roleOther: s.roleOther ?? '',
    linkRows: (links.length ? links : ['']).map(newLinkRow),
    noWorkYet: s.noWorkYet ?? false,
    startingNote: s.startingNote ?? '',
    skills: s.skills ?? [],
    about: s.about ?? '',
    email: sessionEmail || s.email || '',
    photo: s.photo ?? '',
    location: s.location ?? '',
    phone: digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits,
    channel: s.channel ?? '',
    experience: s.experience ?? '',
    jobTypes: s.jobTypes ?? [],
    platforms: s.platforms ?? [],
  }
}

// Form values → the fields this form owns. The caller merges them over the stored
// profile, so older fields (age, gender, headline, ...) are kept but never written.
function toProfile(v) {
  return {
    name: capitalise(v.name),
    roles: v.roles,
    roleOther: v.roles.includes('Other') ? v.roleOther.trim() : '',
    workLinks: v.noWorkYet ? [] : v.linkRows.map((row) => row.url.trim()).filter(Boolean),
    noWorkYet: v.noWorkYet,
    startingNote: v.noWorkYet ? v.startingNote.trim() : '',
    skills: v.skills,
    about: v.about.trim(),
    email: v.email.trim(),
    photo: v.photo,
    location: capitalise(v.location),
    phone: v.phone ? `+91${v.phone}` : '',
    channel: v.channel.trim(),
    experience: v.experience,
    jobTypes: v.jobTypes,
    platforms: v.platforms,
  }
}

function validate(v, { emailEditable }) {
  const errors = {}
  if (!v.name.trim()) errors.name = 'Add your name'
  if (v.roles.length === 0) errors.roles = 'Pick at least one role'
  else if (v.roles.includes('Other') && !v.roleOther.trim()) errors.roleOther = "Tell us what you'd like to try"

  if (v.noWorkYet) {
    if (!v.startingNote.trim()) errors.startingNote = "Tell creators what you'd like to try first"
    else if (v.startingNote.length > MAX_TEXT) errors.startingNote = 'Keep it under 300 characters'
  } else {
    const filled = v.linkRows.filter((row) => row.url.trim())
    for (const row of filled) {
      if (!parseLink(row.url)) errors[`link-${row.id}`] = "That doesn't look like a full link. Paste the whole URL."
    }
    if (!filled.some((row) => parseLink(row.url))) errors.work = "Add at least one link, or tick 'I'm just starting'"
  }

  if (v.skills.length === 0) errors.skills = 'Add at least one skill'
  else if (v.skills.length > MAX_SKILLS) errors.skills = 'Keep it to 5 skills'
  if (!v.about.trim()) errors.about = 'Add a short bio'
  else if (v.about.length > MAX_TEXT) errors.about = 'Keep it under 300 characters'

  if (emailEditable) {
    if (!v.email.trim()) errors.email = 'Add your email'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) errors.email = "That email doesn't look right"
  }
  if (v.phone && !/^\d{10}$/.test(v.phone)) errors.phone = 'Enter a 10-digit mobile number'
  return errors
}

// Shrinks the photo so it fits comfortably in localStorage.
function resizeImage(file, maxSize = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

// group: the field holds several controls (chips, link list), so it gets a group
// role labelled by the label text instead of a <label for>.
// Field, Counter, Section and chipClass are shared with the recruiter profile form.
export function Field({ label, optional, hint, error, htmlFor, group, children }) {
  const labelId = useId()
  const labelClass = 'mb-1.5 block text-sm font-medium'
  const labelText = (
    <>
      {label}
      {optional && <span className="font-normal text-muted"> (optional)</span>}
    </>
  )
  return (
    <div data-error={error ? 'true' : undefined}>
      {group ? (
        <p id={labelId} className={labelClass}>
          {labelText}
        </p>
      ) : (
        <label htmlFor={htmlFor} className={labelClass}>
          {labelText}
        </label>
      )}
      {hint && <p className="-mt-1 mb-2 text-[13px] text-muted">{hint}</p>}
      {group ? (
        <div role="group" aria-labelledby={labelId}>
          {children}
        </div>
      ) : (
        children
      )}
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  )
}

export function Counter({ length, max = MAX_TEXT }) {
  return (
    <p className={`mt-1 text-right text-[13px] ${length > max ? 'text-red-600' : 'text-muted'}`}>
      {length}/{max}
    </p>
  )
}

export function Section({ title, children }) {
  return (
    <section className="border-t border-line pt-6 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 space-y-6">{children}</div>
    </section>
  )
}

export const chipClass = (selected) =>
  `rounded-full border px-4 py-2 text-sm transition-colors duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-40 ${
    selected ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-ink'
  }`

/**
 * The profile form used on /profile.
 * onSubmit(fields) returns (or resolves to) true when saved, or false to show a save error.
 * sessionEmail: when set, the email is read-only (it comes from sign-in); emailHint sits under it.
 * onFirstEdit: called once, the first time the form is changed.
 */
export default function ProfileForm({ initial, sessionEmail, emailHint, submitLabel, onSubmit, onFirstEdit }) {
  const emailEditable = !sessionEmail
  const [values, setValues] = useState(() => toFormValues(initial, sessionEmail))
  const [baseline, setBaseline] = useState(values)
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [skillDraft, setSkillDraft] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [saveError, setSaveError] = useState('')
  const formRef = useRef(null)
  const id = useId()

  const allErrors = validate(values, { emailEditable })
  const errorFor = (key) => (submitted || touched[key] ? allErrors[key] : undefined)
  const touch = (key) => setTouched((t) => (t[key] ? t : { ...t, [key]: true }))
  // For chip groups: mark touched once focus leaves the whole group.
  const touchOnGroupBlur = (key) => (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) touch(key)
  }

  const set = (key) => (value) => setValues((v) => ({ ...v, [key]: value }))
  const onText = (key) => (e) => set(key)(e.target.value)

  // Unsaved changes: ask before leaving, in the app (useBlocker) and on reload/close.
  const dirty = skillDraft.trim() !== '' || JSON.stringify(values) !== JSON.stringify(baseline)
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  // While saving, leaving is expected (onSubmit may navigate once the save lands).
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const blocker = useBlocker(() => dirtyRef.current && !savingRef.current)

  const startedRef = useRef(false)
  useEffect(() => {
    if (!dirty || startedRef.current) return
    startedRef.current = true
    onFirstEdit?.()
  }, [dirty, onFirstEdit])

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  function toggleRole(role) {
    touch('roles')
    setValues((v) => ({
      ...v,
      roles: v.roles.includes(role) ? v.roles.filter((r) => r !== role) : [...v.roles, role],
    }))
  }

  function addSkill(raw) {
    const skill = raw.trim()
    setSkillDraft('')
    if (!skill || values.skills.length >= MAX_SKILLS) return values.skills
    const skills = values.skills.some((s) => s.toLowerCase() === skill.toLowerCase())
      ? values.skills
      : [...values.skills, skill]
    set('skills')(skills)
    return skills
  }

  const suggestions = [...new Set(values.roles.flatMap((role) => ROLE_SKILLS[role] ?? []))].filter(
    (skill) => !values.skills.some((s) => s.toLowerCase() === skill.toLowerCase()),
  )
  const skillsFull = values.skills.length >= MAX_SKILLS

  function updateLink(rowId, url) {
    set('linkRows')(values.linkRows.map((row) => (row.id === rowId ? { ...row, url } : row)))
  }

  function removeLink(rowId) {
    const rest = values.linkRows.filter((row) => row.id !== rowId)
    set('linkRows')(rest.length ? rest : [newLinkRow()])
  }

  async function onPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      set('photo')(await resizeImage(file))
      setPhotoError('')
    } catch {
      setPhotoError("That file couldn't be read. Please choose an image.")
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (savingRef.current) return
    // A skill typed but not yet added with Enter still counts.
    const final = { ...values, skills: addSkill(skillDraft) }
    setSubmitted(true)
    setSaveError('')
    if (Object.keys(validate(final, { emailEditable })).length > 0) {
      requestAnimationFrame(() =>
        formRef.current?.querySelector('[data-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      )
      return
    }
    savingRef.current = true
    setSaving(true)
    let ok = false
    try {
      ok = await onSubmit(toProfile(final))
    } catch (error) {
      console.error('[InfluHunt] Saving the profile failed', error)
    }
    savingRef.current = false
    setSaving(false)
    if (ok) {
      const saved = { ...final, name: capitalise(final.name), location: capitalise(final.location) }
      setValues(saved)
      setBaseline(saved)
    } else {
      setSaveError("We couldn't save your profile. Check your connection and try again.")
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-8">
      <Section title="About you">
        <Field label="Name" error={errorFor('name')} htmlFor={`${id}-name`}>
          <input
            id={`${id}-name`}
            value={values.name}
            onChange={onText('name')}
            onBlur={() => {
              touch('name')
              set('name')(capitalise(values.name))
            }}
            autoComplete="name"
            aria-invalid={!!errorFor('name')}
            className={inputClass(errorFor('name'))}
          />
        </Field>

        <Field
          label="What do you do, or want to try?"
          hint="Pick up to 3."
          error={errorFor('roles') || errorFor('roleOther')}
          group
        >
          <div className="flex flex-wrap gap-2" onBlur={touchOnGroupBlur('roles')}>
            {ROLES.map((role) => {
              const selected = values.roles.includes(role)
              return (
                <button
                  key={role}
                  type="button"
                  aria-pressed={selected}
                  disabled={!selected && values.roles.length >= MAX_ROLES}
                  onClick={() => toggleRole(role)}
                  className={chipClass(selected)}
                >
                  {role}
                </button>
              )
            })}
          </div>
          {values.roles.includes('Other') && (
            <input
              aria-label="Other role"
              value={values.roleOther}
              onChange={onText('roleOther')}
              onBlur={() => touch('roleOther')}
              placeholder="What would you like to try?"
              aria-invalid={!!errorFor('roleOther')}
              className={`${inputClass(errorFor('roleOther'))} mt-3`}
            />
          )}
        </Field>

        <Field
          label="Show us your work"
          hint="Portfolio, YouTube, Instagram, Behance or a Google Drive folder."
          error={values.noWorkYet ? errorFor('startingNote') : errorFor('work')}
          group
        >
          {!values.noWorkYet && (
            <>
              <ul className="space-y-2">
                {values.linkRows.map((row, index) => {
                  const linkError = errorFor(`link-${row.id}`)
                  const Icon = parseLink(row.url)?.platform?.Icon ?? Link2
                  const platformName = parseLink(row.url)?.platform?.name
                  return (
                    <li key={row.id} data-error={linkError ? 'true' : undefined}>
                      <div className="flex items-center gap-2">
                        <span className="relative block flex-1">
                          <Icon
                            size={18}
                            aria-hidden="true"
                            className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${
                              platformName ? 'text-ink' : 'text-muted'
                            }`}
                          />
                          <input
                            type="url"
                            inputMode="url"
                            autoComplete="url"
                            aria-label={`Link ${index + 1}${platformName ? ` (${platformName})` : ''}`}
                            value={row.url}
                            onChange={(e) => updateLink(row.id, e.target.value)}
                            onBlur={() => {
                              touch(`link-${row.id}`)
                              touch('work')
                            }}
                            placeholder="https://"
                            aria-invalid={!!linkError}
                            className={`${inputClass(linkError)} pl-11`}
                          />
                        </span>
                        {(values.linkRows.length > 1 || row.url) && (
                          <button
                            type="button"
                            onClick={() => removeLink(row.id)}
                            aria-label={`Remove link ${index + 1}`}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-200 ease-in-out hover:bg-page hover:text-ink"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                      {linkError && <p className="mt-1.5 text-sm text-red-600">{linkError}</p>}
                    </li>
                  )
                })}
              </ul>
              {values.linkRows.length < MAX_LINKS && (
                <button
                  type="button"
                  onClick={() => set('linkRows')([...values.linkRows, newLinkRow()])}
                  className={`${btnSecondary} mt-3 gap-1.5 px-4 py-2 text-sm`}
                >
                  <Plus size={16} />
                  Add another link
                </button>
              )}
            </>
          )}

          <label className={`flex cursor-pointer items-start gap-2 text-base ${values.noWorkYet ? '' : 'mt-4'}`}>
            <input
              type="checkbox"
              checked={values.noWorkYet}
              onChange={(e) => {
                touch('work')
                set('noWorkYet')(e.target.checked)
              }}
              className="mt-1 h-4 w-4 shrink-0 accent-accent"
            />
            I'm just starting and don't have work to show yet
          </label>

          {values.noWorkYet && (
            <div className="mt-3">
              <label htmlFor={`${id}-starting`} className="mb-1.5 block text-sm font-medium">
                Tell creators what you'd like to try first and why.
              </label>
              <textarea
                id={`${id}-starting`}
                rows={3}
                value={values.startingNote}
                onChange={onText('startingNote')}
                onBlur={() => touch('startingNote')}
                aria-invalid={!!errorFor('startingNote')}
                className={inputClass(errorFor('startingNote'))}
              />
              <Counter length={values.startingNote.length} />
            </div>
          )}
        </Field>

        <Field label="Skills" hint="Type or pick a skill. Up to 5." error={errorFor('skills')} htmlFor={`${id}-skills`}>
          <div className="relative">
            <input
              id={`${id}-skills`}
              value={skillDraft}
              disabled={skillsFull}
              onChange={(e) => setSkillDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addSkill(skillDraft)
                }
              }}
              onBlur={() => touch('skills')}
              placeholder={skillsFull ? 'That’s 5. Remove one to add another.' : 'e.g. Premiere Pro'}
              aria-invalid={!!errorFor('skills')}
              className={`${inputClass(errorFor('skills'))} pr-16 disabled:bg-page disabled:text-muted`}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-muted">
              {values.skills.length} of {MAX_SKILLS}
            </span>
          </div>
          {values.skills.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {values.skills.map((skill) => (
                <li key={skill} className="flex items-center gap-1 rounded-full bg-page py-1 pl-3 pr-1 text-sm">
                  {skill}
                  <button
                    type="button"
                    onClick={() => set('skills')(values.skills.filter((s) => s !== skill))}
                    aria-label={`Remove ${skill}`}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors duration-200 ease-in-out hover:bg-line hover:text-ink"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {suggestions.length > 0 && !skillsFull && (
            <div className="mt-3">
              <p className="mb-2 text-[13px] text-muted">Suggestions</p>
              <ul className="flex flex-wrap gap-2">
                {suggestions.map((skill) => (
                  <li key={skill}>
                    <button
                      type="button"
                      onClick={() => {
                        touch('skills')
                        addSkill(skill)
                      }}
                      className={`${chipClass(false)} inline-flex items-center gap-1 py-1.5 pl-3`}
                    >
                      <Plus size={14} aria-hidden="true" />
                      {skill}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Field>

        <Field label="Short bio" error={errorFor('about')} htmlFor={`${id}-about`}>
          <textarea
            id={`${id}-about`}
            rows={4}
            value={values.about}
            onChange={onText('about')}
            onBlur={() => touch('about')}
            placeholder="e.g. Final-year student in Hyderabad. I shoot street and portrait photos and want to learn how creators plan a shoot for a brand."
            aria-invalid={!!errorFor('about')}
            className={inputClass(errorFor('about'))}
          />
          <Counter length={values.about.length} />
        </Field>
      </Section>

      <Section title="What you're looking for">
        <Field label="Experience" optional group>
          <div className="flex flex-wrap gap-2">
            {EXPERIENCE_LEVELS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={values.experience === value}
                onClick={() => set('experience')(values.experience === value ? '' : value)}
                className={chipClass(values.experience === value)}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Job types you're open to" optional group>
          <div className="flex flex-wrap gap-2">
            {JOB_TYPES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={values.jobTypes.includes(value)}
                onClick={() => set('jobTypes')(toggleIn(values.jobTypes, value))}
                className={chipClass(values.jobTypes.includes(value))}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Platforms you've worked on" optional group>
          <div className="flex flex-wrap gap-2">
            {JOB_PLATFORMS.map((platform) => (
              <button
                key={platform}
                type="button"
                aria-pressed={values.platforms.includes(platform)}
                onClick={() => set('platforms')(toggleIn(values.platforms, platform))}
                className={chipClass(values.platforms.includes(platform))}
              >
                {platform}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      <Section title="Contact and extras">
        <Field label="Email" error={errorFor('email')} htmlFor={`${id}-email`}>
          <input
            id={`${id}-email`}
            type="email"
            autoComplete="email"
            value={values.email}
            readOnly={!emailEditable}
            onChange={onText('email')}
            onBlur={() => touch('email')}
            aria-invalid={!!errorFor('email')}
            className={`${inputClass(errorFor('email'))} read-only:bg-page read-only:text-muted`}
          />
          {!emailEditable && emailHint && <p className="mt-1.5 text-[13px] text-muted">{emailHint}</p>}
        </Field>

        <Field label="Photo" optional error={photoError} htmlFor={`${id}-photo`}>
          <div className="flex items-center gap-4">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-page text-muted">
              {values.photo ? (
                <img src={values.photo} alt="Your photo" className="h-full w-full object-cover" />
              ) : (
                <Camera size={24} strokeWidth={1.75} />
              )}
            </span>
            <label htmlFor={`${id}-photo`} className={`${btnSecondary} cursor-pointer px-5 py-2 text-sm`}>
              {values.photo ? 'Change photo' : 'Choose photo'}
            </label>
            <input id={`${id}-photo`} type="file" accept="image/*" onChange={onPhoto} className="sr-only" />
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field label="City" optional htmlFor={`${id}-city`}>
            <input
              id={`${id}-city`}
              value={values.location}
              onChange={onText('location')}
              onBlur={() => set('location')(capitalise(values.location))}
              autoComplete="address-level2"
              placeholder="e.g. Pune"
              className={inputClass(false)}
            />
          </Field>
          <Field
            label="Phone number"
            optional
            hint="Only used by InfluHunt to reach you. Never shown on the site."
            error={errorFor('phone')}
            htmlFor={`${id}-phone`}
          >
            <span className="relative block">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-muted">
                +91
              </span>
              <input
                id={`${id}-phone`}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                value={values.phone}
                onChange={(e) => {
                  let digits = e.target.value.replace(/\D/g, '')
                  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
                  set('phone')(digits.slice(0, 10))
                }}
                onBlur={() => touch('phone')}
                aria-invalid={!!errorFor('phone')}
                className={`${inputClass(errorFor('phone'))} pl-14`}
              />
            </span>
          </Field>
        </div>

        <Field label="Your own channel or page" optional htmlFor={`${id}-channel`}>
          <input
            id={`${id}-channel`}
            value={values.channel}
            onChange={onText('channel')}
            placeholder="Channel name or link"
            className={inputClass(false)}
          />
        </Field>
      </Section>

      {saveError && <p className="text-sm text-red-600">{saveError}</p>}

      {/* Pinned to the bottom of the screen on phones (fixed, like the job page's Apply bar,
          because the global overflow-x on html/body stops position: sticky from working);
          a normal footer from 640px up. The page adds bottom padding on phones to match. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/90 px-6 py-3 backdrop-blur sm:static sm:flex sm:justify-end sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-6 sm:backdrop-blur-none">
        <button type="submit" disabled={saving} className={`${btnPrimary} w-full sm:w-auto`}>
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>

      {blocker.state === 'blocked' && (
        <Modal title="Discard your changes?" onClose={() => blocker.reset()}>
          <p className="text-muted">You have unsaved changes on your profile.</p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => blocker.proceed()} className={btnText}>
              Discard
            </button>
            <button type="button" onClick={() => blocker.reset()} className={btnPrimary}>
              Keep editing
            </button>
          </div>
        </Modal>
      )}
    </form>
  )
}
