// Recruiter profiles (public.recruiter_profiles) and photo/logo uploads (Storage "avatars").
import { supabase } from './supabaseClient.js'

export async function fetchRecruiterProfile(userId) {
  const { data, error } = await supabase.from('recruiter_profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

// email and profile_completed are filled in by the database, so they aren't sent.
export async function saveRecruiterProfile(userId, fields) {
  const { error } = await supabase.from('recruiter_profiles').upsert({
    id: userId,
    display_name: fields.displayName,
    brand_name: fields.brandName,
    primary_link: fields.primaryLink,
    logo_url: fields.logoUrl || null,
    niche: fields.niche,
    platforms: fields.platforms,
    bio: fields.bio || null,
  })
  if (error) console.error('[InfluHunt] Saving the recruiter profile failed', error)
  return !error
}

export const AVATAR_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024

// Uploads to avatars/<user id>/<name>.<ext> (replacing any earlier one) and returns its
// public URL. The ?v= part makes browsers fetch the new image instead of a cached one.
export async function uploadAvatar(userId, file, name = 'avatar') {
  const ext = AVATAR_TYPES[file.type]
  if (!ext) throw new Error('type')
  if (file.size > AVATAR_MAX_BYTES) throw new Error('size')
  const path = `${userId}/${name}.${ext}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' })
  if (error) throw error
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return `${data.publicUrl}?v=${Date.now()}`
}
