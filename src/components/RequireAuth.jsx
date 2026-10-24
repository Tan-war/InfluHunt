import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { loginPath } from '../lib/redirect.js'
import Spinner from './Spinner.jsx'

// Wraps pages that need a signed-in user; others are sent to /login and brought back after.
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const { pathname, search } = useLocation()
  if (loading) return <Spinner />
  if (!user) return <Navigate to={loginPath(pathname + search)} replace />
  return children
}
