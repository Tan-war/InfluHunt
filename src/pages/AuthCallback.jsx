import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Spinner from '../components/Spinner.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../lib/auth.jsx'
import { safeNext } from '../lib/redirect.js'
import { isRole, routeAfterSignIn } from '../lib/roles.js'
import { track } from '../lib/analytics.js'

// Where Google (via Supabase) sends people back: /auth/callback?next=<path>[&intent=<role>]&code=...
// The Supabase client swaps the code for a session as it starts up; this page waits
// for that, gives a brand-new account its role (from intent), then sends the person on.
export default function AuthCallback() {
  const navigate = useNavigate()
  const { refreshProfile, setRole } = useAuth()
  const handledRef = useRef(false)

  useEffect(() => {
    // StrictMode runs effects twice in development; finish sign-in only once.
    if (handledRef.current) return
    handledRef.current = true

    const query = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const next = safeNext(query.get('next'))

    const fail = (reason, detail) => {
      track('sign_in_failed', { reason, detail })
      // Keep the intent, so trying again still gives a new account the right role.
      const intent = isRole(query.get('intent')) ? `&intent=${query.get('intent')}` : ''
      navigate(`/login?error=${reason}&next=${encodeURIComponent(next)}${intent}`, { replace: true })
    }

    async function finishSignIn() {
      // Google errors (including "cancel" on its screen) come back as ?error= or #error=.
      const error = query.get('error') || hash.get('error')
      if (error) {
        fail(error === 'access_denied' ? 'cancelled' : 'failed', query.get('error_description') || hash.get('error_description'))
        return
      }
      if (!supabase) {
        fail('failed', 'not_configured')
        return
      }

      const { data } = await supabase.auth.getSession() // waits for the code exchange
      const user = data.session?.user
      if (!user) {
        fail('failed', 'no_session')
        return
      }

      // New user: the account was created moments ago, on this sign-in.
      const isNewUser = Math.abs(new Date(user.last_sign_in_at) - new Date(user.created_at)) < 60_000
      track('sign_in_completed', { is_new_user: isNewUser })

      // No role yet: "Post an Opportunity" (recruiter) and Apply (applicant) say which.
      // Without an intent, the chooser on /welcome asks.
      let profile = await refreshProfile()
      const intent = query.get('intent')
      if (!profile?.role && isRole(intent)) {
        try {
          profile = await setRole(intent)
        } catch (err) {
          console.error('[InfluHunt] Setting the role failed', err)
        }
      }
      const role = profile?.role ?? null
      // refreshProfile also loads the recruiter profile for recruiters; read it fresh.
      let recruiterProfile = null
      if (role === 'recruiter') {
        const { data: row } = await supabase.from('recruiter_profiles').select('profile_completed').eq('id', user.id).maybeSingle()
        recruiterProfile = row
      }
      // "/" means "home for my role", which routeAfterSignIn works out.
      navigate(routeAfterSignIn({ role, profile, recruiterProfile, next }), { replace: true })
    }

    finishSignIn()
  }, [navigate, refreshProfile, setRole])

  return <Spinner label="Signing you in" />
}
