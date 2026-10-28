import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Avatar from '../Avatar.jsx'
import Spinner from '../Spinner.jsx'
import MessageInput from './MessageInput.jsx'
import {
  findConversationWith,
  getConversation,
  getMessages,
  markRead,
  sendMessage,
  startConversation,
  subscribeToMessages,
} from '../../lib/chat/chatService.js'
import {
  chatPartner,
  formatClock,
  formatDayLabel,
  renderMessageText,
  sameDay,
  startedNote,
} from '../../lib/chat/display.jsx'
import { hasEmoji } from '../../lib/chat/rules.js'
import { fetchCandidate } from '../../lib/applications.js'
import { fetchJob } from '../../lib/jobs.js'
import { useAuth } from '../../lib/auth.jsx'
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

function Bubble({ message, mine, onRetry }) {
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

// The chat's frame: full screen on phones (following the keyboard), or filling its column.
function Shell({ fullScreen, viewport, children }) {
  const style = fullScreen ? { top: viewport?.top ?? 0, height: viewport?.height ?? '100dvh' } : undefined
  const className = fullScreen ? 'fixed inset-x-0 z-40 flex flex-col bg-white' : 'flex h-full flex-col'
  return (
    <div className={className} style={style}>
      {children}
    </div>
  )
}

function Unavailable() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
      <p className="text-lg font-medium">This chat isn't available.</p>
      <Link to="/chat" className="mt-3 text-accent transition-opacity duration-200 ease-in-out hover:opacity-80">
        Back to Chats
      </Link>
    </div>
  )
}

// Name, photo and context of the other person. nameLink / subtitleLink are optional.
function Header({ partner, nameLink, subtitleLink }) {
  const name = <p className="truncate font-medium leading-tight">{partner.name}</p>
  const subtitleClass = 'block truncate text-xs text-muted transition-colors duration-200 ease-in-out hover:text-ink'
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-line px-3 py-2.5 md:px-4">
      <Link
        to="/chat"
        aria-label="Back to chats"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink transition-colors duration-200 ease-in-out hover:bg-page md:hidden"
      >
        <ArrowLeft size={22} />
      </Link>
      <Avatar url={partner.avatarUrl} name={partner.name} className="h-10 w-10" />
      <div className="min-w-0 flex-1">
        {nameLink ? (
          <Link to={nameLink} className="block transition-opacity duration-200 ease-in-out hover:opacity-80">
            {name}
          </Link>
        ) : (
          name
        )}
        {partner.subtitle &&
          (subtitleLink ? (
            <Link to={subtitleLink} className={subtitleClass}>
              {partner.subtitle}
            </Link>
          ) : (
            <p className="truncate text-xs text-muted">{partner.subtitle}</p>
          ))}
      </div>
      {/* Later: a "⋯" menu here with Report and Block. */}
    </header>
  )
}

// One chat, for either side. fullScreen: phones, where it covers the page.
export default function Conversation({ conversationId, fullScreen = false }) {
  const [conversation, setConversation] = useState(undefined) // undefined: loading; null: unavailable
  const [messages, setMessages] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [showNewPill, setShowNewPill] = useState(false)
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
    const mySide = conversation.my_side
    return subscribeToMessages(conversationId, (message) => {
      const mine = message.sender_role === mySide
      if (nearBottomRef.current || mine) scrollIntentRef.current = 'bottom'
      else setShowNewPill(true)
      setMessages((list) => {
        // My own message can arrive here before the send call returns: swap out its "Sending…" copy.
        const pending = mine ? list.find((m) => m.local === 'sending' && m.body === message.body) : null
        return mergeMessages(pending ? list.filter((m) => m !== pending) : list, [message])
      })
      if (!mine) markRead(conversationId) // it's open, so it's read
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
      sender_role: conversation.my_side,
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

  if (conversation === undefined) {
    return (
      <Shell fullScreen={fullScreen} viewport={viewport}>
        <Spinner label="Loading chat" />
      </Shell>
    )
  }

  if (conversation === null) {
    return (
      <Shell fullScreen={fullScreen} viewport={viewport}>
        <Unavailable />
      </Shell>
    )
  }

  const isRecruiter = conversation.my_side === 'recruiter'
  // The database also refuses it; this just makes sure there's never a box to type in.
  const canReply = isRecruiter || conversation.recruiter_has_written

  return (
    <Shell fullScreen={fullScreen} viewport={viewport}>
      <Header
        partner={chatPartner(conversation)}
        nameLink={isRecruiter ? `/recruiter/candidates/${conversation.other_id}` : null}
        subtitleLink={!isRecruiter && conversation.job_id ? `/jobs/${conversation.job_id}` : null}
      />

      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto overscroll-contain px-3 py-4 md:px-5">
          {loadingOlder && <p className="pb-3 text-center text-xs text-muted">Loading earlier messages…</p>}
          {!isRecruiter && !hasMore && (
            <p className="mx-auto max-w-xs pb-2 text-center text-[13px] text-muted">{startedNote(conversation)}</p>
          )}
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
                  <Bubble message={message} mine={message.sender_role === conversation.my_side} onRetry={retry} />
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

      {canReply ? (
        <MessageInput onSend={handleSend} />
      ) : (
        <p className="shrink-0 border-t border-line px-4 py-4 text-center text-sm text-muted">
          You can reply once the creator messages you.
        </p>
      )}
    </Shell>
  )
}

// A recruiter's first message to an applicant (/chat/new?to=<applicant>&job=<job>). Opens the
// existing chat instead if there is one. The chat is only created when the first message is sent.
export function NewConversation({ applicantId, jobId, fullScreen = false }) {
  const navigate = useNavigate()
  const { user, role } = useAuth()
  const [draft, setDraft] = useState(undefined) // undefined: loading; null: unavailable; { candidate, job }
  const [pending, setPending] = useState(null) // the first message while it's being sent
  const viewport = useVisualViewport(fullScreen)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        if (role !== 'recruiter') return active && setDraft(null)
        const existing = await findConversationWith(applicantId)
        if (!active) return
        if (existing) return navigate(`/chat/${existing.id}`, { replace: true })
        const candidate = await fetchCandidate(applicantId)
        const job = candidate && jobId ? await fetchJob(jobId) : null
        if (active) setDraft(candidate ? { candidate, job: job?.recruiter_id === user.id ? job : null } : null)
      } catch {
        if (active) setDraft(null)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [applicantId, jobId, role, user.id, navigate])

  async function deliver(text) {
    setPending({ id: 'local-first', body: text, created_at: new Date().toISOString(), local: 'sending' })
    try {
      const id = await startConversation(applicantId, text, draft.job?.id ?? null)
      track('chat_started_by_recruiter', { has_job: Boolean(draft.job) })
      track('message_sent', { length: text.length, has_emoji: hasEmoji(text) })
      navigate(`/chat/${id}`, { replace: true })
    } catch (error) {
      setPending((m) => ({ ...m, local: 'failed' }))
      track('message_failed', { reason: error?.message ?? 'unknown' })
    }
  }

  if (draft === undefined) {
    return (
      <Shell fullScreen={fullScreen} viewport={viewport}>
        <Spinner label="Loading chat" />
      </Shell>
    )
  }
  if (draft === null) {
    return (
      <Shell fullScreen={fullScreen} viewport={viewport}>
        <Unavailable />
      </Shell>
    )
  }

  const { candidate, job } = draft
  const partner = chatPartner({
    my_side: 'recruiter',
    other_name: candidate.full_name,
    other_avatar_url: candidate.avatar_url,
    other_roles: candidate.roles,
    other_role_other: candidate.role_other,
    job_title: job?.title,
  })

  return (
    <Shell fullScreen={fullScreen} viewport={viewport}>
      <Header partner={partner} nameLink={`/recruiter/candidates/${applicantId}`} />
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-5">
        {pending ? (
          <Bubble message={pending} mine onRetry={() => deliver(pending.body)} />
        ) : (
          <p className="mx-auto max-w-xs pt-6 text-center text-[13px] text-muted">
            {candidate.full_name} will see your chat once you send your first message.
          </p>
        )}
      </div>
      {!pending && (
        <MessageInput
          onSend={(text) => {
            deliver(text)
            return true
          }}
          placeholder="Say hi and tell them about the gig 👋"
          autoFocus
        />
      )}
    </Shell>
  )
}
