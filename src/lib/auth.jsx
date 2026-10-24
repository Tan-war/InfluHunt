import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './supabaseClient.js'
import { fetchProfile } from './profiles.js'
import { safeNext } from './redirect.js'
import { track } from './analytics.js'

const AuthContext = createContext(null)

// Signed-in user, their profiles row, and sign-in/out for the whole app.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [profile, setProfile] = useState(null)
  const [profileFor, setProfileFor] = useState(null) // user id the profile was loaded for

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

  const refreshProfile = useCallback(async () => {
    if (!userId) return null
    try {
      const row = await fetchProfile(userId)
      setProfile(row)
      return row
    } catch (error) {
      console.error('[InfluHunt] Loading the profile failed', error)
      setProfile(null)
      return null
    } finally {
      setProfileFor(userId)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setProfileFor(null)
      return
    }
    refreshProfile()
  }, [userId, refreshProfile])

  const signInWithGoogle = useCallback(async (returnTo) => {
    if (!supabase) return { error: new Error('Sign-in is not configured') }
    // window.location.origin (not a fixed localhost) keeps this working once hosted.
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext(returnTo))}`
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (error) track('sign_in_failed', { reason: 'start_failed', message: error.message })
    return { error }
  }, [])

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
        loading,
        configured: isSupabaseConfigured,
        signInWithGoogle,
        signOut,
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
