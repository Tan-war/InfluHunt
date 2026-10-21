import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import jobs from '../data/jobs.js'
import BackLink from '../components/BackLink.jsx'
import Modal from '../components/Modal.jsx'
import ProfileForm from '../components/ProfileForm.jsx'
import { btnPrimary, btnText } from '../components/ui.js'
import { getProfile, getSessionEmail, isSignedIn, saveProfile, setPendingApply, signIn } from '../lib/storage.js'

export default function Profile() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  // Guests always start with an empty form; signed-in people see their saved profile.
  const [initial] = useState(() => (isSignedIn() ? getProfile() : null))
  const [sessionEmail] = useState(() => (isSignedIn() ? getSessionEmail() : ''))
  const [toast, setToast] = useState(false)
  const [deleteStep, setDeleteStep] = useState(null) // null | 'confirm' | 'unavailable'

  // Set when Apply now sent the person here (/profile?apply=<jobId>). It lives in the
  // URL, so it survives a reload or signing in on the way.
  const applyJob = jobs.find((j) => j.id === params.get('apply'))

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(false), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  function handleSubmit(fields) {
    // Merge over the stored profile so fields this form no longer shows are kept.
    if (!saveProfile({ ...getProfile(), ...fields })) return false
    // Creating a profile for the first time also signs the person in.
    if (!isSignedIn()) signIn(fields.email)

    if (applyJob) {
      // Back to the job, which finishes applying (see JobDetails).
      setPendingApply(applyJob.id)
      if (location.state?.fromJob) navigate(-1)
      else navigate(`/jobs/${applyJob.id}`, { replace: true })
    } else {
      setToast(true)
    }
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
          sessionEmail={sessionEmail}
          submitLabel={applyJob ? 'Save and apply' : 'Save changes'}
          onSubmit={handleSubmit}
        />
      </div>

      {initial && (
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
