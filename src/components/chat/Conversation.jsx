import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Avatar from '../Avatar.jsx'
import Spinner from '../Spinner.jsx'
import MessageInput from './MessageInput.jsx'
import {
  getConversation,
  getMessages,
  markRead,
  sendMessage,
  subscribeToMessages,
  testTools,
} from '../../lib/chat/chatService.js'
import { formatClock, formatDayLabel, renderMessageText, sameDay } from '../../lib/chat/display.jsx'
import { hasEmoji } from '../../lib/chat/rules.js'
import { track } from '../../lib/analytics.js'

const PAGE_SIZE = 50
const NEAR_BOTTOM_PX = 120

// Size and position of the visible part of the screen. On phones the keyboard shrinks
// it, so the full-screen chat follows it and the input bar stays above the keyboard.
function useVisualViewport(enabled) {
  const [box, setBox] = useState(null)
  useEffect(() => {
    const vv = window.visualViewport
    if (!enabled || !vv) return
    const update = () => setBox({ top: vv.offsetTop, height: vv.height })
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [enabled])
  return box
}

// Merge messages by id, oldest first (local "sending"/"failed" ones keep their place at the end).
function mergeMessages(list, incoming) {
  const ids = new Set(list.map((m) => m.id))
  const fresh = incoming.filter((m) => !ids.has(m.id))
  if (fresh.length === 0) return list
  const saved = [...list.filter((m) => !m.local), ...fresh].sort((a, b) => a.created_at.localeCompare(b.created_at))
  return [...saved, ...list.filter((m) => m.local)]
}

function Bubble({ message, onRetry }) {
  const mine = message.sender_role === 'applicant'
  const failed = message.local === 'failed'
  return (
    <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[75%] whitespace-pre-wrap break-words rounded-[18px] px-3.5 py-2 text-base [overflow-wrap:anywhere] ${
          mine ? 'rounded-br-md bg-ink text-white' : 'rounded-bl-md bg-page text-ink'
        } ${message.local === 'sending' ? 'opacity-60' : ''}`}
      >
        {renderMessageText(message.body)}
      </div>
      {failed ? (
        <button type="button" onClick={() => onRetry(message)} className="mt-1 text-xs font-medium text-red-600">
          Not sent. Tap to retry.
        </button>
      ) : (
        <span className="mt-1 text-[11px] text-muted">
          {message.local === 'sending' ? 'Sending…' : formatClock(message.created_at)}
        </span>
      )}
    </div>
  )
}

// One chat. fullScreen: phones, where it covers the page; otherwise it fills its column.
export default function Conversation({ conversationId, fullScreen = false, banner = null }) {
  const [conversation, setConversation] = useState(undefined) // undefined: loading; null: unavailable
  const [messages, setMessages] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [showNewPill, setShowNewPill] = useState(false)
  const [replyQueued, setReplyQueued] = useState(false)
  const scrollRef = useRef(null)
  const nearBottomRef = useRef(true)
  const scrollIntentRef = useRef(null) // 'bottom' | { height, top } (keep place after loading older)
  const lastSentAtRef = useRef(0)
  const loadingOlderRef = useRef(false)
  const viewport = useVisualViewport(fullScreen)

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  // Load the chat and its latest messages.
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const found = await getConversation(conversationId)
        if (!active) return
        if (!found) {
          setConversation(null)
          return
        }
        const page = await getMessages(conversationId, { limit: PAGE_SIZE })
        if (!active) return
        scrollIntentRef.current = 'bottom'
        setConversation(found)
        setMessages(page.messages)
        setHasMore(page.hasMore)
        track('chat_opened', { conversation_id: conversationId })
        markRead(conversationId)
      } catch {
        if (active) setConversation(null)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [conversationId])

  // New messages (a reply, or something sent from another tab).
  useEffect(() => {
    if (!conversation) return
    return subscribeToMessages(conversationId, (message) => {
      const mine = message.sender_role === 'applicant'
      if (nearBottomRef.current || mine) scrollIntentRef.current = 'bottom'
      else setShowNewPill(true)
      setMessages((list) => mergeMessages(list, [message]))
      markRead(conversationId) // it's open, so it's read
    })
  }, [conversation, conversationId])

  // Apply the scroll we wanted once new messages are on screen.
  useLayoutEffect(() => {
    const el = scrollRef.current
    const intent = scrollIntentRef.current
    if (!el || !intent) return
    if (intent === 'bottom') el.scrollTop = el.scrollHeight
    else el.scrollTop = el.scrollHeight - intent.height + intent.top
    scrollIntentRef.current = null
  }, [messages])

  // Keyboard opening (screen shrinking): stay pinned to the newest message.
  useLayoutEffect(() => {
    if (nearBottomRef.current) scrollToBottom()
  }, [viewport?.height, scrollToBottom])

  async function loadOlder() {
    const oldest = messages.find((m) => !m.local)
    if (!oldest || loadingOlderRef.current) return
    loadingOlderRef.current = true
    setLoadingOlder(true)
    try {
      const page = await getMessages(conversationId, { before: oldest.created_at, limit: PAGE_SIZE })
      const el = scrollRef.current
      scrollIntentRef.current = { height: el.scrollHeight, top: el.scrollTop }
      setMessages((list) => mergeMessages(list, page.messages))
      setHasMore(page.hasMore)
    } finally {
      loadingOlderRef.current = false
      setLoadingOlder(false)
    }
  }

  function onScroll() {
    const el = scrollRef.current
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX
    if (nearBottomRef.current) setShowNewPill(false)
    if (el.scrollTop < 60 && hasMore) loadOlder()
  }

  async function deliver(localMessage) {
    try {
      const saved = await sendMessage(conversationId, localMessage.body)
      setMessages((list) => mergeMessages(list.filter((m) => m.id !== localMessage.id), [saved]))
      track('message_sent', { length: saved.body.length, has_emoji: hasEmoji(saved.body) })
    } catch (error) {
      setMessages((list) => list.map((m) => (m.id === localMessage.id ? { ...m, local: 'failed' } : m)))
      track('message_failed', { reason: error?.message ?? 'unknown' })
    }
  }

  // Shows the message straight away ("Sending…"), then swaps in the saved one.
  function handleSend(text) {
    // About one message a second; extra taps are ignored. (A server-side limit comes later.)
    if (Date.now() - lastSentAtRef.current < 1000) return false
    lastSentAtRef.current = Date.now()
    const localMessage = {
      id: `local-${crypto.randomUUID()}`,
      conversation_id: conversationId,
      sender_role: 'applicant',
      body: text,
      created_at: new Date().toISOString(),
      local: 'sending',
    }
    scrollIntentRef.current = 'bottom'
    setMessages((list) => [...list, localMessage])
    deliver(localMessage)
    return true
  }

  function retry(message) {
    setMessages((list) => list.map((m) => (m.id === message.id ? { ...m, local: 'sending' } : m)))
    deliver(message)
  }

  function simulateReply() {
    setReplyQueued(true)
    testTools.simulateRecruiterReply(conversationId).finally(() => setReplyQueued(false))
  }

  const shellStyle = fullScreen ? { top: viewport?.top ?? 0, height: viewport?.height ?? '100dvh' } : undefined
  const shellClass = fullScreen ? 'fixed inset-x-0 z-40 flex flex-col bg-white' : 'flex h-full flex-col'

  if (conversation === undefined) {
    return (
      <div className={shellClass} style={shellStyle}>
        <Spinner label="Loading chat" />
      </div>
    )
  }

  if (conversation === null) {
    return (
      <div className={shellClass} style={shellStyle}>
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <p className="text-lg font-medium">This chat isn't available.</p>
          <Link to="/chat" className="mt-3 text-accent transition-opacity duration-200 ease-in-out hover:opacity-80">
            Back to Chats
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={shellClass} style={shellStyle}>
      {fullScreen && banner}
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-3 py-2.5 md:px-4">
        <Link
          to="/chat"
          aria-label="Back to chats"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink transition-colors duration-200 ease-in-out hover:bg-page md:hidden"
        >
          <ArrowLeft size={22} />
        </Link>
        <Avatar url={conversation.recruiter_avatar_url} name={conversation.recruiter_display_name} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-tight">{conversation.recruiter_display_name}</p>
          <Link
            to={`/jobs/${conversation.job_id}`}
            className="block truncate text-xs text-muted transition-colors duration-200 ease-in-out hover:text-ink"
          >
            {conversation.job_title}
          </Link>
        </div>
        {testTools && (
          <button
            type="button"
            onClick={simulateReply}
            disabled={replyQueued}
            className="shrink-0 rounded-full border border-dashed border-line px-3 py-1.5 text-xs text-muted transition-colors duration-200 ease-in-out hover:text-ink disabled:opacity-60"
          >
            {replyQueued ? 'Reply in 3s…' : 'Simulate recruiter reply'}
          </button>
        )}
        {/* Later: a "⋯" menu here with Report and Block. */}
      </header>

      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto overscroll-contain px-3 py-4 md:px-5">
          {loadingOlder && <p className="pb-3 text-center text-xs text-muted">Loading earlier messages…</p>}
          <ol className="space-y-2">
            {messages.map((message, i) => {
              const showDay = i === 0 || !sameDay(messages[i - 1].created_at, message.created_at)
              return (
                <li key={message.id}>
                  {showDay && (
                    <p className="py-2 text-center">
                      <span className="rounded-full bg-page px-3 py-1 text-xs text-muted">{formatDayLabel(message.created_at)}</span>
                    </p>
                  )}
                  {message.sender_role === 'system' ? (
                    <p className="mx-auto max-w-xs py-1 text-center text-[13px] text-muted">{message.body}</p>
                  ) : (
                    <Bubble message={message} onRetry={retry} />
                  )}
                </li>
              )
            })}
          </ol>
        </div>
        {showNewPill && (
          <button
            type="button"
            onClick={() => {
              setShowNewPill(false)
              scrollToBottom(true)
            }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white shadow-lg"
          >
            New message ↓
          </button>
        )}
      </div>

      <MessageInput onSend={handleSend} />
    </div>
  )
}
