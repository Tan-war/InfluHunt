import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import Spinner from '../components/Spinner.jsx'
import { useAuth } from '../lib/auth.jsx'
import { safeNext } from '../lib/redirect.js'
import { track } from '../lib/analytics.js'

const ERRORS = {
  cancelled: "Sign-in was cancelled. Try again whenever you're ready.",
  failed: 'Something went wrong signing you in. Please try again.',
}

const linkClass = 'text-accent transition-opacity duration-200 ease-in-out hover:opacity-80'

// Google's multicolour "G", as in Google's sign-in button guidelines.
function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

export default function Login() {
  const { user, loading, configured, signInWithGoogle } = useAuth()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const errorMessage = ERRORS[params.get('error')]
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')

  const viewedRef = useRef(false)
  useEffect(() => {
    if (viewedRef.current) return
    viewedRef.current = true
    track('sign_in_viewed', { next })
  }, [next])

  if (loading) return <Spinner />
  // Already signed in: carry on to where they were headed (Find Opportunities by default).
  if (user) return <Navigate to={next === '/' ? '/find' : next} replace />

  async function handleGoogle() {
    track('sign_in_clicked', { method: 'google' })
    setStarting(true)
    setStartError('')
    // On success the browser leaves for Google, so the button stays in its loading state.
    const { error } = await signInWithGoogle(next)
    if (error) {
      setStarting(false)
      setStartError(ERRORS.failed)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="rounded-card bg-white p-6 text-center sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight">Join InfluHunt</h1>
        <p className="mt-2 text-muted">Apply to gigs with creators you already watch. One tap with Google, no passwords.</p>

        {(errorMessage || startError) && (
          <p role="alert" className="mt-5 rounded-input bg-page px-4 py-3 text-sm">
            {startError || errorMessage}
          </p>
        )}

        {configured ? (
          <button
            type="button"
            onClick={handleGoogle}
            disabled={starting}
            aria-busy={starting}
            style={{ fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
            className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[#747775] bg-white px-4 text-base font-medium text-[#1F1F1F] transition-colors duration-200 ease-in-out hover:bg-[#F8F9FA] disabled:cursor-wait disabled:opacity-70"
          >
            {starting ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-ink" aria-hidden="true" />
            ) : (
              <GoogleLogo />
            )}
            {starting ? 'Opening Google…' : 'Continue with Google'}
          </button>
        ) : (
          <p role="alert" className="mt-6 rounded-input bg-page px-4 py-3 text-sm">
            Sign-in isn't configured yet, see .env.example
          </p>
        )}

        {/* Later: "Continue with email" (email OTP) goes here, under the Google button. */}

        <p className="mt-5 text-[13px] text-muted">
          By continuing, you agree to our{' '}
          <Link to="/terms" className={linkClass}>
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className={linkClass}>
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
