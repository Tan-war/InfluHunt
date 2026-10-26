// Test-mode chat backend: everything is saved in this browser (via lib/storage.js),
// one blob per signed-in user. Rows are shaped exactly like the future database
// tables, so moving to Supabase is a straight copy:
//
//   conversations: id, application_id, job_id, applicant_id, recruiter_id,
//     recruiter_display_name, recruiter_avatar_url, job_title, applicant_last_read_at,
//     recruiter_last_read_at, last_message_at, last_message_preview, created_at
//   messages: id, conversation_id, sender_id, sender_role ('applicant' | 'recruiter' |
//     'system'), body, created_at
//
// Every function is async, like a real network call.
import jobs from '../../data/jobs.js'
import { supabase } from '../supabaseClient.js'
import { getChatData, onStorageChange, saveChatData } from '../storage.js'
import { MAX_MESSAGE_LENGTH, previewOf, shortlistNote } from './rules.js'

const SAMPLE_REPLIES = [
  'Hey! Thanks for applying 🙌',
  'Loved your work. Can you share one more sample?',
  'Are you free for a quick call this week?',
  'Sounds good 👍',
  'Sending over the brief now.',
]

const now = () => new Date().toISOString()

async function currentUserId() {
  const { data } = (await supabase?.auth.getSession()) ?? { data: {} }
  const userId = data.session?.user?.id
  if (!userId) throw new Error('not_signed_in')
  return userId
}

const isShortlisted = (job) => job?.applicationStatus === 'shortlisted'

function newConversation(userId, application, job, at) {
  return {
    id: crypto.randomUUID(),
    application_id: application.id,
    job_id: job.id,
    applicant_id: userId,
    recruiter_id: job.recruiterId,
    recruiter_display_name: job.brandName,
    recruiter_avatar_url: null,
    job_title: job.role,
    applicant_last_read_at: at,
    recruiter_last_read_at: null,
    last_message_at: at,
    last_message_preview: '',
    created_at: at,
  }
}

function newMessage(conversation, senderId, senderRole, body, at = now()) {
  return { id: crypto.randomUUID(), conversation_id: conversation.id, sender_id: senderId, sender_role: senderRole, body, created_at: at }
}

// Adds a message and updates the conversation's last-message fields.
function addMessage(data, conversation, message) {
  data.messages.push(message)
  conversation.last_message_at = message.created_at
  conversation.last_message_preview = previewOf(message.body)
}

// Sample chats for the mock shortlisted jobs, created on first use (and on "Load sample chats").
function seed(userId) {
  const data = { seeded: true, conversations: [], messages: [] }
  const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString()
  const scripts = [
    // [minutes ago, sender role, body]. The last recruiter message here stays unread.
    [
      [26 * 60, 'recruiter', 'Hi! We liked your portfolio. Have you made gaming or tech thumbnails before?'],
      [26 * 60 - 5, 'applicant', 'Hi! Yes, a few for a friend’s channel. Happy to share them 😊'],
      [12, 'recruiter', 'Great, send them over when you can. https://youtube.com/@bytebazaar is our channel for reference.'],
    ],
    [
      [3 * 24 * 60, 'recruiter', 'Thanks for applying! Could you do a short test shoot next week?'],
      [3 * 24 * 60 - 30, 'applicant', 'Yes, works for me 🙌'],
    ],
  ]
  jobs.filter(isShortlisted).forEach((job, i) => {
    // Applications live in Supabase now; test chats just get a made-up application id.
    const application = { id: crypto.randomUUID(), jobId: job.id }
    const script = scripts[i] ?? []
    const start = minutesAgo((script[0]?.[0] ?? 60) + 1)
    const conversation = newConversation(userId, application, job, start)
    data.conversations.push(conversation)
    addMessage(data, conversation, newMessage(conversation, null, 'system', shortlistNote(job.role), start))
    for (const [ago, role, body] of script) {
      addMessage(data, conversation, newMessage(conversation, role === 'applicant' ? userId : job.recruiterId, role, body, minutesAgo(ago)))
    }
    // Everything read except the newest recruiter message of the first chat.
    const lastRead = i === 0 ? minutesAgo(13) : now()
    conversation.applicant_last_read_at = lastRead
  })
  return data
}

function load(userId) {
  let data = getChatData(userId)
  if (!data) {
    data = seed(userId)
    saveChatData(userId, data)
  }
  return data
}

function save(userId, data) {
  if (!saveChatData(userId, data)) throw new Error('save_failed')
}

const unreadIn = (data, conversation) =>
  data.messages.filter(
    (m) =>
      m.conversation_id === conversation.id &&
      m.sender_role === 'recruiter' &&
      m.created_at > (conversation.applicant_last_read_at ?? ''),
  ).length

export async function listConversations() {
  const userId = await currentUserId()
  const data = load(userId)
  return data.conversations
    .map((c) => ({ ...c, unread_count: unreadIn(data, c) }))
    .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at))
}

// null when it doesn't exist or this user isn't part of it.
export async function getConversation(conversationId) {
  const userId = await currentUserId()
  const conversation = load(userId).conversations.find((c) => c.id === conversationId)
  return conversation && conversation.applicant_id === userId ? conversation : null
}

// Test mode can only reopen a sample chat by its application id (real applications are in
// Supabase, and chats move there in phase 5).
export async function getOrCreateConversation(applicationId) {
  const userId = await currentUserId()
  const existing = load(userId).conversations.find((c) => c.application_id === applicationId)
  if (!existing) throw new Error('not_shortlisted')
  return existing
}

// Oldest first. before: ISO time; only messages older than it. hasMore: older ones exist.
export async function getMessages(conversationId, { before, limit = 50 } = {}) {
  const userId = await currentUserId()
  const all = load(userId)
    .messages.filter((m) => m.conversation_id === conversationId && (!before || m.created_at < before))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  return { messages: all.slice(-limit), hasMore: all.length > limit }
}

export async function sendMessage(conversationId, body) {
  const userId = await currentUserId()
  const text = String(body ?? '').trim()
  if (!text || text.length > MAX_MESSAGE_LENGTH) throw new Error('invalid_body')
  // Test-mode stand-in for a network failure: DevTools → Network → Offline.
  if (!navigator.onLine) throw new Error('offline')
  const data = load(userId)
  const conversation = data.conversations.find((c) => c.id === conversationId && c.applicant_id === userId)
  if (!conversation) throw new Error('not_found')
  const message = newMessage(conversation, userId, 'applicant', text)
  addMessage(data, conversation, message)
  conversation.applicant_last_read_at = message.created_at
  save(userId, data)
  return message
}

export async function markRead(conversationId) {
  const userId = await currentUserId()
  const data = load(userId)
  const conversation = data.conversations.find((c) => c.id === conversationId)
  if (!conversation) return
  const latest = data.messages
    .filter((m) => m.conversation_id === conversationId)
    .reduce((max, m) => (m.created_at > max ? m.created_at : max), '')
  if ((conversation.applicant_last_read_at ?? '') >= latest) return
  conversation.applicant_last_read_at = now()
  save(userId, data)
}

// Total unread recruiter messages across all chats.
export async function getUnreadCount() {
  const userId = await currentUserId()
  const data = load(userId)
  return data.conversations.reduce((sum, c) => sum + unreadIn(data, c), 0)
}

// Calls onMessage(message) for each new message in this chat, from this tab or another
// (via storage events). Returns an unsubscribe function.
export function subscribeToMessages(conversationId, onMessage) {
  let seen = null
  let active = true
  const check = async () => {
    try {
      const userId = await currentUserId()
      const current = (getChatData(userId)?.messages ?? []).filter((m) => m.conversation_id === conversationId)
      if (!active) return
      if (seen) current.filter((m) => !seen.has(m.id)).forEach(onMessage)
      seen = new Set(current.map((m) => m.id))
    } catch {
      // Signed out: nothing to deliver.
    }
  }
  check()
  const unsubscribe = onStorageChange(check)
  return () => {
    active = false
    unsubscribe()
  }
}

// Calls onChange when anything in this user's chats changes (list, unread counts).
export function subscribeToInbox(onChange) {
  return onStorageChange(onChange)
}

// ---- Test helpers (dev builds only; see chatService.js) ----

export async function simulateRecruiterReply(conversationId, { delayMs = 3000 } = {}) {
  const userId = await currentUserId()
  await new Promise((resolve) => setTimeout(resolve, delayMs))
  const data = load(userId)
  const conversation = data.conversations.find((c) => c.id === conversationId)
  if (!conversation) return
  const body = SAMPLE_REPLIES[Math.floor(Math.random() * SAMPLE_REPLIES.length)]
  addMessage(data, conversation, newMessage(conversation, conversation.recruiter_id, 'recruiter', body))
  save(userId, data)
}

export async function resetTestChats() {
  const userId = await currentUserId()
  save(userId, { seeded: true, conversations: [], messages: [] })
}

export async function loadSampleChats() {
  const userId = await currentUserId()
  save(userId, seed(userId))
}
