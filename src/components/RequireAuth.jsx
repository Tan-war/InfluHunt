import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { loginPath } from '../lib/redirect.js'
import { homeFor } from '../lib/roles.js'
import Spinner from './Spinner.jsx'

// Wraps pages that need a signed-in user; others are sent to /login and brought back after.
//   role: only this role may open the page; the other role goes to its own home page.
//   needsRecruiterProfile: recruiters must finish their profile first (posting, applicants, talent).
//   allowNoRole: for /welcome itself. Everywhere else, an account with no role picks one first.
export default function RequireAuth({ children, role: requiredRole, needsRecruiterProfile = false, allowNoRole = false }) {
  const { user, role, recruiterProfile, loading } = useAuth()
  const { pathname, search } = useLocation()
  const here = pathname + search
  if (loading) return <Spinner />
  if (!user) return <Navigate to={loginPath(here)} replace />
  if (!role && !allowNoRole) return <Navigate to={`/welcome?next=${encodeURIComponent(here)}`} replace />
  if (requiredRole && role !== requiredRole) return <Navigate to={homeFor(role)} replace />
  if (needsRecruiterProfile && !recruiterProfile?.profile_completed) return <Navigate to="/recruiter/onboarding" replace />
  return children
}
