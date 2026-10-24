import { useEffect } from 'react'
import jobs from '../data/jobs.js'
import { formatDate } from '../lib/format.js'
import { addLike, getApplications, getLikes, markLikesSeen, useStorageUpdates } from '../lib/storage.js'
import { useAuth } from '../lib/auth.jsx'

export default function Notifications() {
  useStorageUpdates()
  const { user } = useAuth() // this page sits behind RequireAuth

  // Opening this page marks every "Liked" item as seen.
  useEffect(() => {
    markLikesSeen(user.id)
  }, [user.id])

  const applications = getApplications(user.id)
  const items = [
    ...applications
      .map((a) => ({ type: 'applied', key: `applied-${a.jobId}`, date: a.appliedOn, job: jobs.find((j) => j.id === a.jobId) }))
      .filter((item) => item.job),
    ...getLikes(user.id).map((like) => ({ type: 'liked', key: `liked-${like.id}`, date: like.date, like })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  // TEST ONLY: uses the most recently applied job.
  const latestApplication = [...applications].sort((a, b) => b.appliedOn.localeCompare(a.appliedOn))[0]
  const latestJob = latestApplication && jobs.find((j) => j.id === latestApplication.jobId)

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>

      {items.length === 0 ? (
        <p className="mt-10 text-center text-muted">No notifications yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item) =>
            item.type === 'applied' ? (
              <li key={item.key} className="rounded-card bg-white px-5 py-4">
                <p>
                  You applied for <span className="font-medium">{item.job.role}</span> at{' '}
                  <span className="font-medium">{item.job.brandName}</span>
                </p>
                <p className="mt-1 text-sm text-muted">{formatDate(item.date)}</p>
              </li>
            ) : (
              <li key={item.key} className="rounded-card bg-accent/10 px-5 py-4">
                <p>
                  <span className="font-medium">{item.like.brandName}</span> liked your profile.
                </p>
                {item.like.role && <p className="mt-1 text-sm">{item.like.role}</p>}
                <a
                  href={`mailto:${item.like.hrEmail}`}
                  className="mt-1 inline-block break-all text-sm text-accent transition-opacity duration-200 ease-in-out hover:opacity-80"
                >
                  {item.like.hrEmail}
                </a>
                <p className="mt-1 text-sm text-muted">{formatDate(item.date)}</p>
              </li>
            ),
          )}
        </ul>
      )}

      {/* TEST ONLY: remove this block before release. */}
      <div className="mt-12 border-t border-dashed border-line pt-4">
        <p className="text-xs uppercase tracking-wide text-muted">Test only</p>
        <button
          type="button"
          disabled={!latestJob}
          onClick={() =>
            addLike(user.id, {
              jobId: latestJob.id,
              brandName: latestJob.brandName,
              role: latestJob.role,
              hrEmail: latestJob.hrEmail,
            })
          }
          className="mt-2 rounded-full border border-line px-4 py-1.5 text-sm text-muted transition-colors duration-200 ease-in-out hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Simulate recruiter like
        </button>
        {!latestJob && <p className="mt-2 text-xs text-muted">Apply to a job first.</p>}
      </div>
    </div>
  )
}
