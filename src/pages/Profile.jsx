import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import BackLink from '../components/BackLink.jsx'
import Modal from '../components/Modal.jsx'
import ProfileForm from '../components/ProfileForm.jsx'
import { btnPrimary, btnText } from '../components/ui.js'
import { useAuth } from '../lib/auth.jsx'
import { rowToForm, saveProfileRow } from '../lib/profiles.js'
import { safeNext } from '../lib/redirect.js'
import { track } from '../lib/analytics.js'

export default function Profile() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // Behind RequireAuth, so the user and their profiles row have loaded.
  const { user, profile, refreshProfile } = useAuth()
  const [initial] = useState(() => rowToForm(profile, user))
  const [toast, setToast] = useState(false)
  const [deleteStep, setDeleteStep] = useState(null) // null | 'confirm' | 'unavailable'

  const emailHint = user.app_metadata?.provider === 'google' ? 'Signed in with Google' : 'Signed in with email'

  // Where to go after saving: set by Apply now (/jobs/<id>?apply=1) or by first sign-in.
  // Kept in the URL, so it survives a reload.
  const next = params.get('next') ? safeNext(params.get('next')) : null
  const submitLabel = !next ? 'Save changes' : next.includes('apply=1') ? 'Save and apply' : 'Save and continue'

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(false), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  async function handleSubmit(fields) {
    if (!(await saveProfileRow(user.id, fields))) return false
    track('profile_completed', { first_time: !profile?.profile_completed })
    await refreshProfile()
    // Back to the job (which carries on applying because of ?apply=1) or onward.
    if (next) navigate(next, { replace: true })
    else setToast(true)
    return true
  }

  function handleDelete() {
    // TODO(backend): call the account deletion API here, then clear local data
    // (profile, applications) and sign out. There is no backend yet, so nothing
    // is deleted; the modal says so instead of pretending.
    console.warn('[InfluHunt] Account deletion is not implemented yet.')
    setDeleteStep('unavailable')
  }

  return (
    // Bottom padding on phones keeps the last fields clear of the pinned save bar.
    <div className="pb-24 sm:pb-0">
      <BackLink />
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Your profile</h1>
      <p className="mt-2 text-muted">
        This is what creators see when you apply. Only creators you apply to can see it.
      </p>

      <div className="mt-6 rounded-card bg-white p-6">
        <ProfileForm
          initial={initial}
          sessionEmail={user.email}
          emailHint={emailHint}
          submitLabel={submitLabel}
          onSubmit={handleSubmit}
          onFirstEdit={() => track('profile_started')}
        />
      </div>

      {profile?.profile_completed && (
        <div className="mt-8 text-center sm:text-left">
          <button
            type="button"
            onClick={() => setDeleteStep('confirm')}
            className="text-sm text-muted transition-colors duration-200 ease-in-out hover:text-ink"
          >
            Delete my account
          </button>
        </div>
      )}

      {deleteStep === 'confirm' && (
        <Modal title="Delete your account?" onClose={() => setDeleteStep(null)}>
          <p className="text-muted">This deletes your profile and applications. This can't be undone.</p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setDeleteStep(null)} className={btnText}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-3 text-base font-medium text-white transition-opacity duration-200 ease-in-out hover:opacity-90"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}

      {deleteStep === 'unavailable' && (
        <Modal title="Not available yet" onClose={() => setDeleteStep(null)}>
          <p className="text-muted">Deleting accounts isn't ready yet. Nothing has been deleted.</p>
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={() => setDeleteStep(null)} className={`${btnPrimary} w-full sm:w-auto`}>
              OK
            </button>
          </div>
        </Modal>
      )}

      {/* "Saved" toast. Sits above the sticky save bar on phones. */}
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-6 transition-opacity duration-200 ease-in-out sm:bottom-8 ${
          toast ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {toast && (
          <span className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white shadow-lg">
            <CheckCircle2 size={18} className="shrink-0" />
            Saved
          </span>
        )}
      </div>
    </div>
  )
}
