import { useId, useRef, useState } from 'react'
import Avatar from './Avatar.jsx'
import { Counter, Field, Section, chipClass } from './ProfileForm.jsx'
import { btnPrimary, btnSecondary, inputClass } from './ui.js'
import { AVATAR_MAX_BYTES, AVATAR_TYPES, uploadAvatar } from '../lib/recruiterProfiles.js'

const PLATFORMS = ['YouTube', 'Instagram', 'X', 'LinkedIn', 'Other']
const MAX_BIO = 500

function isFullHttpsLink(text) {
  if (!/^https:\/\//i.test(text.trim())) return false
  try {
    return new URL(text.trim()).hostname.includes('.')
  } catch {
    return false
  }
}

// Step 1 is required; step 2 is optional.
function validate(v) {
  const errors = {}
  if (!v.displayName.trim()) errors.displayName = 'Add your name'
  if (!v.brandName.trim()) errors.brandName = 'Add your channel or brand name'
  if (!v.primaryLink.trim()) errors.primaryLink = 'Add a link to your channel, page or brand'
  else if (!isFullHttpsLink(v.primaryLink)) errors.primaryLink = 'Paste the full link, starting with https://'
  if (!v.logoUrl) errors.logoUrl = 'Add a photo or logo'
  if (!v.niche.trim()) errors.niche = 'Add your niche, e.g. Beauty, Tech or Food'
  if (v.bio.length > MAX_BIO) errors.bio = 'Keep it under 500 characters'
  return errors
}

/**
 * Recruiter profile, used for onboarding and editing.
 * onSubmit(fields) resolves to true when saved, or false to show a save error.
 */
export default function RecruiterProfileForm({ userId, initial, email, emailHint, submitLabel, onSubmit }) {
  const [values, setValues] = useState(initial)
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [saveError, setSaveError] = useState('')
  const formRef = useRef(null)
  const id = useId()

  const errors = validate(values)
  const errorFor = (key) => (submitted || touched[key] ? errors[key] : undefined)
  const touch = (key) => setTouched((t) => (t[key] ? t : { ...t, [key]: true }))
  const set = (key) => (value) => setValues((v) => ({ ...v, [key]: value }))
  const textProps = (key) => ({
    id: `${id}-${key}`,
    value: values[key],
    onChange: (e) => set(key)(e.target.value),
    onBlur: () => touch(key),
    'aria-invalid': !!errorFor(key),
    className: inputClass(errorFor(key)),
  })

  async function onPhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!AVATAR_TYPES[file.type]) return setPhotoError('Use a JPG, PNG or WebP image.')
    if (file.size > AVATAR_MAX_BYTES) return setPhotoError('That image is over 2 MB. Try a smaller one.')
    setPhotoError('')
    setUploading(true)
    try {
      set('logoUrl')(await uploadAvatar(userId, file, 'recruiter-logo'))
      touch('logoUrl')
    } catch {
      setPhotoError("That image couldn't be uploaded. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (saving || uploading) return
    setSubmitted(true)
    setSaveError('')
    if (Object.keys(validate(values)).length > 0) {
      requestAnimationFrame(() =>
        formRef.current?.querySelector('[data-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      )
      return
    }
    setSaving(true)
    const ok = await onSubmit({
      ...values,
      displayName: values.displayName.trim(),
      brandName: values.brandName.trim(),
      primaryLink: values.primaryLink.trim(),
      niche: values.niche.trim(),
      bio: values.bio.trim(),
    })
    setSaving(false)
    if (!ok) setSaveError("We couldn't save your profile. Check your connection and try again.")
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-8">
      <Section title="Step 1: About you">
        <Field label="Your name" error={errorFor('displayName')} htmlFor={`${id}-displayName`}>
          <input {...textProps('displayName')} autoComplete="name" />
        </Field>
        <Field label="Channel or brand name" error={errorFor('brandName')} htmlFor={`${id}-brandName`}>
          <input {...textProps('brandName')} placeholder="e.g. Pixel Pantry" />
        </Field>
        <Field label="Email" htmlFor={`${id}-email`}>
          <input
            id={`${id}-email`}
            type="email"
            value={email}
            readOnly
            className={`${inputClass(false)} read-only:bg-page read-only:text-muted`}
          />
          {emailHint && <p className="mt-1.5 text-[13px] text-muted">{emailHint}</p>}
        </Field>
        <Field
          label="Link to your YouTube channel, Instagram page or brand"
          error={errorFor('primaryLink')}
          htmlFor={`${id}-primaryLink`}
        >
          <input {...textProps('primaryLink')} type="url" inputMode="url" placeholder="https://" />
        </Field>
        <Field label="Photo or logo" error={errorFor('logoUrl') || photoError} htmlFor={`${id}-photo`}>
          <div className="flex items-center gap-4">
            <Avatar url={values.logoUrl} name={values.brandName || values.displayName} className="h-20 w-20 border border-line" />
            <label htmlFor={`${id}-photo`} className={`${btnSecondary} cursor-pointer px-5 py-2 text-sm`}>
              {uploading ? 'Uploading…' : values.logoUrl ? 'Change photo' : 'Choose photo'}
            </label>
            <input
              id={`${id}-photo`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onPhoto}
              disabled={uploading}
              className="sr-only"
            />
          </div>
          <p className="mt-1.5 text-[13px] text-muted">JPG, PNG or WebP, up to 2 MB.</p>
        </Field>
        <Field label="Niche" error={errorFor('niche')} htmlFor={`${id}-niche`}>
          <input {...textProps('niche')} placeholder="e.g. Beauty & Skincare" />
        </Field>
      </Section>

      <Section title="Step 2: Extras">
        <p className="-mt-2 text-[13px] text-muted">You can fill this later.</p>
        <Field label="Platforms" optional group>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((platform) => {
              const selected = values.platforms.includes(platform)
              return (
                <button
                  key={platform}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    set('platforms')(
                      selected ? values.platforms.filter((p) => p !== platform) : [...values.platforms, platform],
                    )
                  }
                  className={chipClass(selected)}
                >
                  {platform}
                </button>
              )
            })}
          </div>
        </Field>
        <Field label="Bio" optional error={errorFor('bio')} htmlFor={`${id}-bio`}>
          <textarea
            {...textProps('bio')}
            rows={4}
            placeholder="What you make and who you'd like to work with."
          />
          <Counter length={values.bio.length} max={MAX_BIO} />
        </Field>
      </Section>

      {saveError && <p className="text-sm text-red-600">{saveError}</p>}

      {/* Pinned to the bottom of the screen on phones, like the applicant profile's save bar. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/90 px-6 py-3 backdrop-blur sm:static sm:flex sm:justify-end sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-6 sm:backdrop-blur-none">
        <button type="submit" disabled={saving || uploading} className={`${btnPrimary} w-full sm:w-auto`}>
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
