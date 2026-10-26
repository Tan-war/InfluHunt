import BackLink from '../../components/BackLink.jsx'

// /recruiter/jobs/:id/applicants: placeholder until applications move to Supabase (phase 3).
export default function JobApplicants() {
  return (
    <div>
      <BackLink to="/recruiter/jobs" label="My job postings" />
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Applicants</h1>
      <p className="mt-2 text-muted">Coming next: everyone who applied, with their status.</p>
    </div>
  )
}
