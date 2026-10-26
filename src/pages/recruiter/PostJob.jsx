import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BackLink from '../../components/BackLink.jsx'
import JobForm, { jobToForm } from '../../components/JobForm.jsx'
import Modal from '../../components/Modal.jsx'
import Spinner from '../../components/Spinner.jsx'
import { btnPrimary, btnSecondary } from '../../components/ui.js'
import { useAuth } from '../../lib/auth.jsx'
import { createJob, fetchJob, updateJob } from '../../lib/jobs.js'
import { track } from '../../lib/analytics.js'

// /recruiter/jobs/new and /recruiter/jobs/:id/edit.
export default function PostJob() {
  const { id } = useParams() // set when editing
  const navigate = useNavigate()
  const { user, recruiterProfile } = useAuth()
  const [initial, setInitial] = useState(() => (id ? undefined : jobToForm(null, recruiterProfile?.email)))
  const [published, setPublished] = useState(false)

  const startedRef = useRef(false)
  useEffect(() => {
    if (id || startedRef.current) return
    startedRef.current = true
    track('job_post_started')
  }, [id])

  // Editing: load the job; only its owner can edit it.
  useEffect(() => {
    if (!id) return
    let active = true
    fetchJob(id)
      .then((job) => active && setInitial(job && job.recruiter_id === user.id ? jobToForm(job) : null))
      .catch(() => active && setInitial(null))
    return () => {
      active = false
    }
  }, [id, user.id])

  async function handleSubmit(fields) {
    try {
      if (id) {
        await updateJob(id, fields)
        track('job_edited', { job_id: id })
        navigate('/recruiter/jobs', { state: { toast: 'Changes saved' } })
      } else {
        const jobId = await createJob({ ...fields, recruiter_id: user.id })
        track('job_published', { job_id: jobId })
        setPublished(true)
      }
      return true
    } catch (error) {
      console.error('[InfluHunt] Saving the job failed', error)
      return false
    }
  }

  if (initial === undefined) return <Spinner />
  if (initial === null) {
    return (
      <div>
        <BackLink to="/recruiter/jobs" label="My job postings" />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">This job isn't available</h1>
      </div>
    )
  }

  return (
    // Bottom padding on phones keeps the last fields clear of the pinned button bar.
    <div className="pb-24 sm:pb-0">
      <BackLink to="/recruiter/jobs" label="My job postings" />
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">{id ? 'Edit job' : 'Post an opportunity'}</h1>
      <p className="mt-2 text-muted">
        {id ? "Applicants who already applied won't be notified of changes." : 'Short and clear works best.'}
      </p>
      <div className="mt-6 rounded-card bg-white p-6">
        <JobForm initial={initial} submitLabel={id ? 'Save changes' : 'Publish'} onSubmit={handleSubmit} />
      </div>

      {published && (
        <Modal title="Your opportunity is live 🎉" onClose={() => navigate('/recruiter/jobs', { replace: true })}>
          <p className="text-muted">Applicants can find it on InfluHunt now.</p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => navigate('/recruiter/talent', { replace: true })} className={btnSecondary}>
              Find talent
            </button>
            <button type="button" onClick={() => navigate('/recruiter/jobs', { replace: true })} className={btnPrimary}>
              View my job postings
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
