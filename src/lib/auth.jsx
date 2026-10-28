import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { isSupabaseConfigured, supabase } from './supabaseClient.js'
import { fetchProfile } from './profiles.js'
import { fetchRecruiterProfile } from './recruiterProfiles.js'
import { isRole } from './roles.js'
import { safeNext } from './redirect.js'
import { track } from './analytics.js'

const AuthContext = createContext(null)

// Signed-in user, their profiles row (with their role), their recruiter profile if
// they're a recruiter, and sign-in/out for the whole app.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [profile, setProfile] = useState(null)
  const [recruiterProfile, setRecruiterProfile] = useState(null)
  const [profileFor, setProfileFor] = useState(null) // user id the profile was loaded for
  const requestRef = useRef(0)

  const user = session?.user ?? null
  const userId = user?.id ?? null

  // INITIAL_SESSION fires straight away (restored from storage, or from the callback
  // URL), then SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED as things change. No awaiting
  // other Supabase calls in here: the docs warn that can deadlock.
  useEffect(() => {
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // Loads the profiles row, plus the recruiter profile for recruiters. Only the newest
  // request updates state, so an older, slower load can't overwrite fresh data
  // (e.g. the role set moments ago on the callback page).
  const refreshProfile = useCallback(async () => {
    const id = userId ?? (await supabase?.auth.getSession())?.data.session?.user?.id
    if (!id) return null
    const request = ++requestRef.current
    let row = null
    let recruiterRow = null
    try {
      row = await fetchProfile(id)
      if (row?.role === 'recruiter') recruiterRow = await fetchRecruiterProfile(id)
    } catch (error) {
      console.error('[InfluHunt] Loading the profile failed', error)
    }
    if (request === requestRef.current) {
      setProfile(row)
      setRecruiterProfile(recruiterRow)
      setProfileFor(id)
    }
    return row
  }, [userId])

  useEffect(() => {
    if (!userId) {
      requestRef.current++
      setProfile(null)
      setRecruiterProfile(null)
      setProfileFor(null)
      return
    }
    refreshProfile()
  }, [userId, refreshProfile])

  // intent ('applicant' | 'recruiter') rides along in the callback URL, so a brand-new
  // account gets the right role when it comes back.
  const signInWithGoogle = useCallback(async (returnTo, intent) => {
    if (!supabase) return { error: new Error('Sign-in is not configured') }
    // window.location.origin (not a fixed localhost) keeps this working once hosted.
    const intentParam = isRole(intent) ? `&intent=${intent}` : ''
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext(returnTo))}${intentParam}`
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (error) track('sign_in_failed', { reason: 'start_failed', message: error.message })
    return { error }
  }, [])

  // Sets the role once (the database refuses to change it later), then reloads the profile.
  const setRole = useCallback(
    async (newRole) => {
      const { error } = await supabase.rpc('set_my_role', { new_role: newRole })
      if (error) throw error
      if (newRole === 'recruiter') track('recruiter_signup_started')
      return refreshProfile()
    },
    [refreshProfile],
  )

  const signOut = useCallback(async () => {
    if (!supabase) return
    track('sign_out')
    await supabase.auth.signOut()
  }, [])

  // Loading until the session is known and, when signed in, the profile row has loaded,
  // so pages never flash the logged-out UI or an empty profile.
  const loading = !authReady || (userId !== null && profileFor !== userId)

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role ?? null,
        recruiterProfile,
        loading,
        configured: isSupabaseConfigured,
        signInWithGoogle,
        signOut,
        setRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
