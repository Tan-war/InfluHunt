// In-app notifications (public.notifications). Created only by the database; the browser
// can read its own. Phase 6 adds unread counts, mark-as-read and live updates.
import { supabase } from './supabaseClient.js'

export async function fetchNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, link, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}

// "just now", "5m ago", "2h ago", "3d ago", then a date.
export function formatAgo(iso) {
  const minutes = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h ago`
  if (minutes < 7 * 24 * 60) return `${Math.floor(minutes / 1440)}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
