import { Link } from 'react-router-dom'
import { btnPrimary } from '../../components/ui.js'

// /recruiter/jobs: the recruiter's home page. Phase 2 lists their jobs here.
export default function MyJobs() {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">My job postings</h1>
      <div className="mt-6 rounded-card bg-white px-6 py-12 text-center">
        <p className="text-muted">You haven't posted anything yet.</p>
        <Link to="/recruiter/jobs/new" className={`${btnPrimary} mt-6`}>
          Post your first opportunity
        </Link>
      </div>
    </div>
  )
}
