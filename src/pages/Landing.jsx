import { Link, Navigate } from 'react-router-dom'
import { btnPrimary, btnSecondary } from '../components/ui.js'
import Spinner from '../components/Spinner.jsx'
import { useAuth } from '../lib/auth.jsx'
import { loginPath } from '../lib/redirect.js'
import { homeFor } from '../lib/roles.js'

export default function Landing() {
  const { user, role, loading } = useAuth()

  // Signed-in people go straight to their home page (or pick a role first).
  if (loading) return <Spinner />
  if (user) return <Navigate to={homeFor(role)} replace />

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Find your next creator job.</h1>
      <p className="mt-4 max-w-md text-lg text-muted">
        Jobs for YouTubers, Instagram creators, editors and artists, in one place.
      </p>

      <div className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Link to="/find" className={btnPrimary}>
          Find opportunities
        </Link>
        {/* New accounts from here become recruiters and go straight to their profile form. */}
        <Link to={loginPath('/recruiter/onboarding', 'recruiter')} className={btnSecondary}>
          Post an opportunity
        </Link>
        <Link to="/login" className={btnSecondary}>
          Sign in
        </Link>
      </div>
    </div>
  )
}
