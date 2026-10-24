import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Briefcase, Sparkles } from 'lucide-react'
import { useAuth } from '../lib/auth.jsx'
import { safeNext } from '../lib/redirect.js'
import { routeAfterSignIn } from '../lib/roles.js'

const choiceClass =
  'flex w-full items-center gap-4 rounded-card border border-line bg-white p-5 text-left transition-colors duration-200 ease-in-out hover:border-ink disabled:cursor-wait disabled:opacity-60'

// /welcome: a signed-in account with no role picks one. It can't be changed later.
export default function Welcome() {
  const { role, profile, recruiterProfile, setRole } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const next = safeNext(params.get('next'))
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')

  if (role) return <Navigate to={routeAfterSignIn({ role, profile, recruiterProfile, next })} replace />

  async function choose(newRole) {
    setSaving(newRole)
    setError('')
    try {
      const updated = await setRole(newRole)
      navigate(routeAfterSignIn({ role: newRole, profile: updated, recruiterProfile: null, next }), { replace: true })
    } catch {
      setSaving(null)
      setError('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-3xl font-semibold tracking-tight">What brings you to InfluHunt?</h1>
      <p className="mt-2 text-muted">Pick one. You can't switch later on this account.</p>
      <div className="mt-6 space-y-3">
        <button type="button" onClick={() => choose('applicant')} disabled={saving !== null} className={choiceClass}>
          <Sparkles size={28} strokeWidth={1.75} className="shrink-0" />
          <span>
            <span className="block text-lg font-semibold">I want to find gigs</span>
            <span className="block text-sm text-muted">Edit, design, write or film for creators.</span>
          </span>
        </button>
        <button type="button" onClick={() => choose('recruiter')} disabled={saving !== null} className={choiceClass}>
          <Briefcase size={28} strokeWidth={1.75} className="shrink-0" />
          <span>
            <span className="block text-lg font-semibold">I want to hire creators</span>
            <span className="block text-sm text-muted">Post gigs for your channel, page or brand.</span>
          </span>
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
