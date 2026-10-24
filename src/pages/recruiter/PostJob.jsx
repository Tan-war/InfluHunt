import BackLink from '../../components/BackLink.jsx'

// /recruiter/jobs/new: placeholder until the job form arrives in phase 2.
export default function PostJob() {
  return (
    <div>
      <BackLink to="/recruiter/jobs" label="My job postings" />
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Post an opportunity</h1>
      <p className="mt-2 text-muted">The job form is coming next.</p>
    </div>
  )
}
