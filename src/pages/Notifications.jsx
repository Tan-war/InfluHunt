import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Spinner from '../components/Spinner.jsx'
import { fetchNotifications, formatAgo } from '../lib/notifications.js'

// /notifications: newest first. (Phase 6 adds unread highlights, "Mark all as read" and live updates.)
export default function Notifications() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    fetchNotifications()
      .then((rows) => active && setItems(rows))
      .catch(() => active && setError(true))
    return () => {
      active = false
    }
  }, [])

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
      {error ? (
        <p className="mt-10 text-center text-muted">Couldn't load notifications. Please refresh to try again.</p>
      ) : !items ? (
        <Spinner label="Loading notifications" />
      ) : items.length === 0 ? (
        <p className="mt-10 text-center text-muted">You're all caught up.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={item.link}
                className="block rounded-card bg-white px-5 py-4 transition-shadow duration-200 ease-in-out hover:shadow-lg"
              >
                <span className="block font-medium">{item.title}</span>
                {item.body && <span className="mt-1 block text-sm text-muted">{item.body}</span>}
                <span className="mt-1 block text-xs text-muted">{formatAgo(item.created_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
