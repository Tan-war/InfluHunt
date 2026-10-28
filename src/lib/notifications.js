// In-app notifications (public.notifications). Created only by the database; the browser
// reads its own and marks them read through mark_notifications_read().
import { useEffect, useState } from 'react'
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

export async function fetchUnreadNotificationCount() {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null)
  if (error) throw error
  return count ?? 0
}

// ids: just these; leave out to mark all as read.
export async function markNotificationsRead(ids = null) {
  const { error } = await supabase.rpc('mark_notifications_read', { ids })
  if (error) throw error
}

// Calls onChange when one of my notifications is added or marked read. Returns an unsubscribe.
export function subscribeToNotifications(userId, onChange) {
  const channel = supabase
    .channel(`notifications:${userId}:${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () =>
      onChange(),
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

// Live count of unread notifications for the bell (0 when signed out).
export function useUnreadNotifications(userId) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!userId) {
      setCount(0)
      return
    }
    let active = true
    const refresh = () =>
      fetchUnreadNotificationCount()
        .then((next) => active && setCount(next))
        .catch(() => {})
    refresh()
    const unsubscribe = subscribeToNotifications(userId, refresh)
    return () => {
      active = false
      unsubscribe()
    }
  }, [userId])
  return count
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
