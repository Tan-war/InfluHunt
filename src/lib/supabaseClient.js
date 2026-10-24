// The one shared Supabase client. Config comes from .env.local (see .env.example).
// Only the publishable (anon) key belongs here; never the secret/service_role key.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const looksSecret = typeof key === 'string' && key.startsWith('sb_secret_')

export const isSupabaseConfigured = Boolean(url && key) && !looksSecret

if (looksSecret) {
  console.error(
    '[InfluHunt] VITE_SUPABASE_PUBLISHABLE_KEY is a secret key. Use the publishable key instead; secret keys must never reach the browser.',
  )
} else if (!isSupabaseConfigured) {
  console.error(
    "[InfluHunt] Sign-in isn't configured yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local (see .env.example), then restart the dev server.",
  )
}

// PKCE: Google sends back a one-time ?code= that the client swaps for a session on
// the callback page (detectSessionInUrl, on by default). The session is kept in
// localStorage, so it survives a refresh.
export const supabase = isSupabaseConfigured ? createClient(url, key, { auth: { flowType: 'pkce' } }) : null
