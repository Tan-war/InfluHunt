import { useId, useRef, useState } from 'react'
import { Field, Section, chipClass } from './ProfileForm.jsx'
import TagInput from './TagInput.jsx'
import { btnPrimary, inputClass } from './ui.js'
import { EXPERIENCE_LEVELS, JOB_PLATFORMS, JOB_TYPES, LOCATION_TYPES, formatJobPay } from '../lib/jobs.js'

const PAY_OPTIONS = [
  { value: 'per_month', label: 'Per month' },
  { value: 'per_annum', label: 'Per annum' },
  { value: 'unpaid', label: 'Unpaid' },
]

// Deadlines are in India time. No time picked = 11:59 PM that day.
const IST = '+05:30'
const DEFAULT_TIME = '23:59'
const applyByIso = (date, time) => `${date}T${time || DEFAULT_TIME}:00${IST}`

// A moment as India date 'YYYY-MM-DD' and time 'HH:mm'. Built from parts, so it doesn't
// depend on how a locale happens to format dates.
function inIndia(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  )
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` }
}
const todayInIndia = () => inIndia(new Date()).date

// Stored apply_by → the date and time fields (time left blank when it's the 11:59 PM default).
function splitApplyBy(iso) {
  if (!iso) return { date: '', time: '' }
  const { date, time } = inIndia(new Date(iso))
  return { date, time: time === DEFAULT_TIME ? '' : time }
}

// A jobs row (or nothing, for a new job) → form values.
export function jobToForm(job, defaultEmail) {
  const { date, time } = splitApplyBy(job?.apply_by)
  return {
    title: job?.title ?? '',
    jobType: job?.job_type ?? '',
    experience: job?.experience_required ?? '',
    applyDate: date,
    applyTime: time,
    payType: job?.pay_type ?? 'per_month',
    payAmount: job?.pay_amount ? String(job.pay_amount) : '',
    locationType: job?.location_type ?? '',
    city: job?.city ?? '',
    about: job?.about_role ?? '',
    learn: job?.what_you_learn ?? '',
    skills: job?.skills ?? [],
    tools: job?.tools ?? [],
    platforms: job?.platforms ?? [],
    contactEmail: job?.contact_email ?? defaultEmail ?? '',
  }
}

// Form values → jobs columns.
function formToJob(v) {
  const unpaid = v.payType === 'unpaid'
  return {
    title: v.title.trim(),
    job_type: v.jobType,
    experience_required: v.experience,
    apply_by: new Date(applyByIso(v.applyDate, v.applyTime)).toISOString(),
    pay_type: v.payType,
    pay_amount: unpaid ? null : Number(v.payAmount),
    location_type: v.locationType,
    city: v.locationType === 'remote' ? null : v.city.trim(),
    about_role: v.about.trim(),
    what_you_learn: v.learn.trim() || null,
    skills: v.skills,
    tools: v.tools,
    platforms: v.platforms,
    contact_email: v.contactEmail.trim(),
  }
}

function validate(v) {
  const errors = {}
  if (!v.title.trim()) errors.title = 'Add the job role, e.g. Video editor'
  if (!v.jobType) errors.jobType = 'Pick a job type'
  if (!v.experience) errors.experience = 'Pick the experience you need'
  if (!v.applyDate) errors.applyBy = 'Pick the last day to apply'
  else if (new Date(applyByIso(v.applyDate, v.applyTime)) <= new Date()) errors.applyBy = 'Pick a date and time in the future'
  if (v.payType !== 'unpaid' && !(Number(v.payAmount) > 0)) errors.payAmount = 'Add the amount in rupees, or choose Unpaid'
  if (!v.locationType) errors.locationType = 'Pick where the work happens'
  else if (v.locationType !== 'remote' && !v.city.trim()) errors.city = 'Add the city'
  if (!v.about.trim()) errors.about = 'Tell applicants what the role is about'
  if (v.skills.length === 0) errors.skills = 'Add at least one skill'
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.contactEmail.trim())) errors.contactEmail = 'Add a valid email'
  return errors
}

function ChoiceChips({ options, value, onChange, onBlur }) {
  return (
    <div className="flex flex-wrap gap-2" onBlur={onBlur}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={chipClass(value === option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Post or edit a job. onSubmit(jobFields) resolves to true when saved, or false to show an error.
 */
export default function JobForm({ initial, submitLabel, onSubmit }) {
  const [values, setValues] = useState(initial)
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [amountHint, setAmountHint] = useState(false)
  const formRef = useRef(null)
  const id = useId()

  const errors = validate(values)
  const errorFor = (key) => (submitted || touched[key] ? errors[key] : undefined)
  const touch = (key) => setTouched((t) => (t[key] ? t : { ...t, [key]: true }))
  const touchOnGroupBlur = (key) => (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) touch(key)
  }
  const set = (key) => (value) => setValues((v) => ({ ...v, [key]: value }))
  const text = (key, extra = {}) => ({
    id: `${id}-${key}`,
    value: values[key],
    onChange: (e) => set(key)(e.target.value),
    onBlur: () => touch(key),
    'aria-invalid': !!errorFor(key),
    className: inputClass(errorFor(key)),
    ...extra,
  })

  async function handleSubmit(e) {
    e.preventDefault()
    if (saving) return
    setSubmitted(true)
    setSaveError('')
    if (Object.keys(validate(values)).length > 0) {
      requestAnimationFrame(() =>
        formRef.current?.querySelector('[data-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      )
      return
    }
    setSaving(true)
    const ok = await onSubmit(formToJob(values))
    setSaving(false)
    if (!ok) setSaveError("We couldn't save this job. Check your connection and try again.")
  }

  const unpaid = values.payType === 'unpaid'

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-8">
      <Section title="The role">
        <Field label="Job role" error={errorFor('title')} htmlFor={`${id}-title`}>
          <input {...text('title')} placeholder="e.g. Video editor" maxLength={80} />
        </Field>
        <Field label="Job type" error={errorFor('jobType')} group>
          <ChoiceChips options={JOB_TYPES} value={values.jobType} onChange={set('jobType')} onBlur={touchOnGroupBlur('jobType')} />
        </Field>
        <Field label="Experience required" error={errorFor('experience')} group>
          <ChoiceChips
            options={EXPERIENCE_LEVELS}
            value={values.experience}
            onChange={set('experience')}
            onBlur={touchOnGroupBlur('experience')}
          />
        </Field>
        <Field
          label="Applications open till"
          hint="No time picked? It closes at 11:59 PM India time that day."
          error={errorFor('applyBy')}
          group
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="date"
              aria-label="Last day to apply"
              min={todayInIndia()}
              value={values.applyDate}
              onChange={(e) => set('applyDate')(e.target.value)}
              onBlur={() => touch('applyBy')}
              aria-invalid={!!errorFor('applyBy')}
              className={inputClass(errorFor('applyBy'))}
            />
            <input
              type="time"
              aria-label="Closing time (optional)"
              value={values.applyTime}
              onChange={(e) => set('applyTime')(e.target.value)}
              onBlur={() => touch('applyBy')}
              className={inputClass(false)}
            />
          </div>
        </Field>
        <Field label="Stipend or salary" error={errorFor('payAmount')} group>
          <ChoiceChips options={PAY_OPTIONS} value={values.payType} onChange={set('payType')} />
          {!unpaid && (
            <div className="mt-3">
              <span className="relative block">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label="Amount in rupees"
                  value={values.payAmount}
                  onChange={(e) => {
                    // Digits only: letters, commas and symbols are dropped as you type.
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 9)
                    setAmountHint(digits !== e.target.value)
                    set('payAmount')(digits)
                  }}
                  onBlur={() => touch('payAmount')}
                  placeholder="15000"
                  aria-invalid={!!errorFor('payAmount')}
                  className={`${inputClass(errorFor('payAmount'))} pl-9`}
                />
              </span>
              <p className="mt-1.5 text-[13px] text-muted">
                {amountHint
                  ? 'Numbers only, please.'
                  : Number(values.payAmount) > 0
                    ? `Shows as ${formatJobPay({ pay_type: values.payType, pay_amount: Number(values.payAmount) })}`
                    : 'Whole rupees, numbers only.'}
              </p>
            </div>
          )}
        </Field>
        <Field label="Location" error={errorFor('locationType') || errorFor('city')} group>
          <ChoiceChips
            options={LOCATION_TYPES}
            value={values.locationType}
            onChange={set('locationType')}
            onBlur={touchOnGroupBlur('locationType')}
          />
          {values.locationType && values.locationType !== 'remote' && (
            <input {...text('city', { className: `${inputClass(errorFor('city'))} mt-3` })} aria-label="City" placeholder="e.g. Mumbai" />
          )}
        </Field>
      </Section>

      <Section title="Details">
        <Field label="About the role" error={errorFor('about')} htmlFor={`${id}-about`}>
          <textarea {...text('about')} rows={5} maxLength={2000} placeholder="What they'll do, how often, and what good work looks like." />
        </Field>
        <Field label="What you'll learn" optional hint="One point per line." htmlFor={`${id}-learn`}>
          <textarea {...text('learn')} rows={3} maxLength={1000} />
        </Field>
        <Field label="Skills required" hint="Type a skill and press Enter." error={errorFor('skills')} htmlFor={`${id}-skills`}>
          <TagInput
            id={`${id}-skills`}
            values={values.skills}
            onChange={set('skills')}
            onBlur={() => touch('skills')}
            hasError={errorFor('skills')}
            placeholder="e.g. Storytelling"
          />
        </Field>
        <Field label="Tools required" optional hint="Type a tool and press Enter." htmlFor={`${id}-tools`}>
          <TagInput id={`${id}-tools`} values={values.tools} onChange={set('tools')} placeholder="e.g. Premiere Pro" />
        </Field>
        <Field label="Platforms" optional group>
          <div className="flex flex-wrap gap-2">
            {JOB_PLATFORMS.map((platform) => {
              const selected = values.platforms.includes(platform)
              return (
                <button
                  key={platform}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    set('platforms')(selected ? values.platforms.filter((p) => p !== platform) : [...values.platforms, platform])
                  }
                  className={chipClass(selected)}
                >
                  {platform}
                </button>
              )
            })}
          </div>
        </Field>
        <Field
          label="Contact email"
          hint="Shown to applicants on your job."
          error={errorFor('contactEmail')}
          htmlFor={`${id}-contactEmail`}
        >
          <input {...text('contactEmail')} type="email" autoComplete="email" />
        </Field>
      </Section>

      {saveError && <p className="text-sm text-red-600">{saveError}</p>}

      {/* Pinned to the bottom of the screen on phones, like the profile forms. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/90 px-6 py-3 backdrop-blur sm:static sm:flex sm:justify-end sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-6 sm:backdrop-blur-none">
        <button type="submit" disabled={saving} className={`${btnPrimary} w-full sm:w-auto`}>
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
