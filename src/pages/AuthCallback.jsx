import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Spinner from '../components/Spinner.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { fetchProfile } from '../lib/profiles.js'
import { safeNext } from '../lib/redirect.js'
import { track } from '../lib/analytics.js'

// Where Google (via Supabase) sends people back: /auth/callback?next=<path>&code=...
// The Supabase client swaps the code for a session as it starts up; this page waits
// for that, then sends the person on.
export default function AuthCallback() {
  const navigate = useNavigate()
  const handledRef = useRef(false)

  useEffect(() => {
    // StrictMode runs effects twice in development; finish sign-in only once.
    if (handledRef.current) return
    handledRef.current = true

    const query = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const next = safeNext(query.get('next'))
    const destination = next === '/' ? '/find' : next

    const fail = (reason, detail) => {
      track('sign_in_failed', { reason, detail })
      navigate(`/login?error=${reason}&next=${encodeURIComponent(next)}`, { replace: true })
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

      let profile = null
      try {
        profile = await fetchProfile(user.id)
      } catch (err) {
        console.error('[InfluHunt] Loading the profile failed', err)
      }
      // New user: the account was created moments ago, on this sign-in.
      const isNewUser = Math.abs(new Date(user.last_sign_in_at) - new Date(user.created_at)) < 60_000
      track('sign_in_completed', { is_new_user: isNewUser })

      if (!profile?.profile_completed) {
        navigate(`/profile?next=${encodeURIComponent(destination)}`, { replace: true })
      } else {
        navigate(destination, { replace: true })
      }
    }

    finishSignIn()
  }, [navigate])

  return <Spinner label="Signing you in" />
}
