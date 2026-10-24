import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../Avatar.jsx'
import Spinner from '../Spinner.jsx'
import { btnPrimary } from '../ui.js'
import { listConversations, subscribeToInbox, testTools } from '../../lib/chat/chatService.js'
import { formatListTime } from '../../lib/chat/display.jsx'
import { track } from '../../lib/analytics.js'

// All chats, newest first. compact: the desktop left column (smaller heading, no card).
export default function ChatList({ activeId, compact = false }) {
  const [conversations, setConversations] = useState(null)
  const [error, setError] = useState(false)

  const viewedRef = useRef(false)
  useEffect(() => {
    if (viewedRef.current) return
    viewedRef.current = true
    track('chat_list_viewed')
  }, [])

  useEffect(() => {
    let active = true
    const refresh = async () => {
      try {
        const list = await listConversations()
        if (active) {
          setConversations(list)
          setError(false)
        }
      } catch {
        if (active) setError(true)
      }
    }
    refresh()
    const unsubscribe = subscribeToInbox(refresh)
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const testLinks = testTools && (
    <p className="px-4 py-6 text-center text-[13px] text-muted">
      Test only:{' '}
      <button type="button" onClick={() => testTools.resetTestChats()} className="underline hover:text-ink">
        Reset test chats
      </button>{' '}
      ·{' '}
      <button type="button" onClick={() => testTools.loadSampleChats()} className="underline hover:text-ink">
        Load sample chats
      </button>
    </p>
  )

  let body
  if (error) body = <p className="px-4 py-10 text-center text-muted">Couldn't load your chats. Please try again.</p>
  else if (!conversations) body = <Spinner label="Loading chats" />
  else if (conversations.length === 0) {
    body = (
      <div className="px-6 py-10 text-center">
        <p className="text-muted">No chats yet. When a creator shortlists you, you can chat with them here.</p>
        <Link to="/find" className={`${btnPrimary} mt-6`}>
          Find opportunities
        </Link>
      </div>
    )
  } else {
    body = (
      <ul className="divide-y divide-line">
        {conversations.map((c) => {
          const unread = c.unread_count > 0
          return (
            <li key={c.id}>
              <Link
                to={`/chat/${c.id}`}
                aria-current={c.id === activeId ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-3 transition-colors duration-200 ease-in-out hover:bg-page ${
                  c.id === activeId ? 'bg-page' : ''
                }`}
              >
                <Avatar url={c.recruiter_avatar_url} name={c.recruiter_display_name} className="h-12 w-12" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium">{c.recruiter_display_name}</span>
                    <span className="shrink-0 text-xs text-muted">{formatListTime(c.last_message_at)}</span>
                  </span>
                  <span className="block truncate text-xs text-muted">{c.job_title}</span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <span className={`truncate text-sm ${unread ? 'font-medium text-ink' : 'text-muted'}`}>
                      {c.last_message_preview}
                    </span>
                    {unread && (
                      <span className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full bg-accent">
                        <span className="sr-only">Unread messages</span>
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    )
  }

  if (compact) {
    return (
      <div>
        <h1 className="px-4 pb-2 pt-5 text-xl font-semibold tracking-tight">Chats</h1>
        {body}
        {testLinks}
      </div>
    )
  }
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Chats</h1>
      <div className="mt-6 overflow-hidden rounded-card bg-white">{body}</div>
      {testLinks}
    </div>
  )
}
