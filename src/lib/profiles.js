// Maps between the public.profiles row (snake_case) and the profile form's fields.
import { supabase } from './supabaseClient.js'

export async function fetchProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

// Row → form values. Google's name and photo fill in when the row has none yet.
export function rowToForm(row, user) {
  const meta = user?.user_metadata ?? {}
  return {
    name: row?.full_name || meta.full_name || meta.name || '',
    roles: row?.roles ?? [],
    roleOther: row?.role_other ?? '',
    workLinks: row?.work_links ?? [],
    noWorkYet: row?.no_work_yet ?? false,
    startingNote: row?.starting_note ?? '',
    skills: row?.skills ?? [],
    about: row?.bio ?? '',
    photo: row?.avatar_url || meta.avatar_url || meta.picture || '',
    location: row?.city ?? '',
    phone: row?.phone ?? '',
    channel: row?.channel ?? '',
  }
}

// Saves the form. The form only submits once every required field is valid, so a
// successful save marks the profile complete. Email is never written from here:
// it comes from sign-in, and the database doesn't let the app change it.
export async function saveProfileRow(userId, fields) {
  const row = {
    id: userId,
    full_name: fields.name,
    roles: fields.roles,
    role_other: fields.roleOther || null,
    work_links: fields.workLinks,
    no_work_yet: fields.noWorkYet,
    starting_note: fields.startingNote || null,
    skills: fields.skills,
    bio: fields.about,
    avatar_url: fields.photo || null,
    city: fields.location || null,
    phone: fields.phone || null,
    channel: fields.channel || null,
    profile_completed: true,
  }
  const { error } = await supabase.from('profiles').upsert(row)
  if (error) console.error('[InfluHunt] Saving the profile failed', error)
  return !error
}
