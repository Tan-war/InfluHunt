import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Spinner from '../components/Spinner.jsx'
import { useAuth } from '../lib/auth.jsx'
import {
  fetchNotifications,
  formatAgo,
  markNotificationsRead,
  subscribeToNotifications,
} from '../lib/notifications.js'
import { track } from '../lib/analytics.js'

// /notifications (both roles): newest first, unread ones highlighted, live.
export default function Notifications() {
  const { user } = useAuth()
  const [items, setItems] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    const refresh = () =>
      fetchNotifications()
        .then((rows) => {
          if (!active) return
          setItems(rows)
          setError(false)
        })
        .catch(() => active && setError(true))
    refresh()
    const unsubscribe = subscribeToNotifications(user.id, refresh)
    return () => {
      active = false
      unsubscribe()
    }
  }, [user.id])

  const hasUnread = items?.some((item) => !item.read_at)
  const markLocally = (ids) =>
    setItems((list) =>
      list.map((item) => (!item.read_at && (!ids || ids.includes(item.id)) ? { ...item, read_at: new Date().toISOString() } : item)),
    )

  function markAllRead() {
    markLocally(null)
    markNotificationsRead().catch(() => {})
  }

  function open(item) {
    track('notification_clicked', { type: item.type })
    if (item.read_at) return
    markLocally([item.id])
    markNotificationsRead([item.id]).catch(() => {})
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
        {hasUnread && (
          <button
            type="button"
            onClick={markAllRead}
            className="shrink-0 pb-1 text-sm text-accent transition-opacity duration-200 ease-in-out hover:opacity-80"
          >
            Mark all as read
          </button>
        )}
      </div>
      {error && !items ? (
        <p className="mt-10 text-center text-muted">Couldn't load notifications. Please refresh to try again.</p>
      ) : !items ? (
        <Spinner label="Loading notifications" />
      ) : items.length === 0 ? (
        <p className="mt-10 text-center text-muted">You're all caught up.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item) => {
            const unread = !item.read_at
            return (
              <li key={item.id}>
                <Link
                  to={item.link}
                  state={{ source: 'notification' }}
                  onClick={() => open(item)}
                  className={`flex items-start gap-3 rounded-card px-5 py-4 transition-shadow duration-200 ease-in-out hover:shadow-lg ${
                    unread ? 'border border-ink/10 bg-white' : 'border border-transparent bg-white/60'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block break-words ${unread ? 'font-semibold' : 'font-medium text-muted'}`}>{item.title}</span>
                    {item.body && <span className="mt-1 block break-words text-sm text-muted">{item.body}</span>}
                    <span className="mt-1 block text-xs text-muted">{formatAgo(item.created_at)}</span>
                  </span>
                  {unread && (
                    <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-accent">
                      <span className="sr-only">Unread</span>
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
