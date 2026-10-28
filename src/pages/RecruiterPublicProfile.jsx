import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import Avatar from '../components/Avatar.jsx'
import BackLink from '../components/BackLink.jsx'
import Spinner from '../components/Spinner.jsx'
import { btnSecondary } from '../components/ui.js'
import { fetchRecruiterProfile } from '../lib/recruiterProfiles.js'
import { fetchJobsByRecruiter, formatJobPay, jobTypeLabel } from '../lib/jobs.js'

// /recruiters/:id: who's hiring, and their open gigs. Public, like the jobs themselves.
export default function RecruiterPublicProfile() {
  const { id } = useParams()
  const [data, setData] = useState(undefined) // undefined: loading; null: not found

  useEffect(() => {
    let active = true
    Promise.all([fetchRecruiterProfile(id), fetchJobsByRecruiter(id, { openOnly: true })])
      .then(([recruiter, jobs]) => active && setData(recruiter?.profile_completed ? { recruiter, jobs } : null))
      .catch(() => active && setData(null))
    return () => {
      active = false
    }
  }, [id])

  if (data === undefined) return <Spinner />
  if (!data) {
    return (
      <div>
        <BackLink />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">This profile isn't available</h1>
      </div>
    )
  }

  const { recruiter, jobs } = data
  return (
    <div>
      <BackLink />
      <div className="mt-6 rounded-card bg-white p-6">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar url={recruiter.logo_url} name={recruiter.brand_name} className="h-20 w-20 border border-line" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{recruiter.brand_name}</h1>
            <p className="text-muted">by {recruiter.display_name}</p>
            {recruiter.niche && <p className="mt-1 text-sm">{recruiter.niche}</p>}
          </div>
          <a
            href={recruiter.primary_link}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnSecondary} gap-1.5 px-4 py-2 text-sm`}
          >
            Visit channel
            <ExternalLink size={14} />
          </a>
        </div>
        {recruiter.platforms.length > 0 && <p className="mt-4 text-sm text-muted">On {recruiter.platforms.join(', ')}</p>}
        {recruiter.bio && <p className="mt-4 whitespace-pre-line leading-relaxed">{recruiter.bio}</p>}
      </div>

      <h2 className="mt-8 text-lg font-semibold tracking-tight">Open gigs</h2>
      {jobs.length === 0 ? (
        <p className="mt-3 text-muted">No open gigs right now. Check back soon.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                to={`/jobs/${job.id}`}
                className="block rounded-card bg-white px-5 py-4 transition-shadow duration-200 ease-in-out hover:shadow-lg"
              >
                <span className="block font-medium">{job.title}</span>
                <span className="block text-sm text-muted">
                  {jobTypeLabel(job.job_type)} · {formatJobPay(job)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
