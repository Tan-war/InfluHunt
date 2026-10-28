// The one place the UI gets chat data from (Supabase: public.conversations / public.messages).
// The database enforces the rules: only recruiters start chats (start_conversation), and an
// applicant can reply only after the recruiter has written. See the phase 5 migration.
//
// A conversation here is a row from my_conversations(): id, my_side ('recruiter' | 'applicant'),
// other_id, other_name, other_avatar_url, other_roles, other_role_other, recruiter_brand_name,
// job_id, job_title, application_id, last_message_at, last_message_preview, unread_count,
// recruiter_has_written, created_at.
import { supabase } from '../supabaseClient.js'
import { MAX_MESSAGE_LENGTH } from './rules.js'

const MESSAGE_COLUMNS = 'id, conversation_id, sender_id, sender_role, body, created_at'
const isUuid = (value) => /^[0-9a-f-]{36}$/i.test(String(value ?? ''))

async function currentUserId() {
  const { data } = (await supabase?.auth.getSession()) ?? { data: {} }
  const userId = data.session?.user?.id
  if (!userId) throw new Error('not_signed_in')
  return userId
}

// The caller's side in each chat they've opened, so sending knows which sender_role to use.
const sides = new Map()
const remember = (conversation) => {
  if (conversation) sides.set(conversation.id, conversation.my_side)
  return conversation
}

export async function listConversations() {
  const { data, error } = await supabase.rpc('my_conversations')
  if (error) throw error
  data.forEach(remember)
  return data
}

// null when it doesn't exist or this user isn't part of it.
export async function getConversation(conversationId) {
  if (!isUuid(conversationId)) return null
  const { data, error } = await supabase.rpc('my_conversations').eq('id', conversationId).maybeSingle()
  if (error) throw error
  return remember(data)
}

// My chat with this person (a recruiter's chat with an applicant, or the other way round), or null.
export async function findConversationWith(otherUserId) {
  if (!isUuid(otherUserId)) return null
  const { data, error } = await supabase.rpc('my_conversations').eq('other_id', otherUserId).maybeSingle()
  if (error) throw error
  return remember(data)
}

// Recruiters only: opens (or reuses) the chat with an applicant and sends the first message.
// Resolves to the conversation id.
export async function startConversation(applicantId, firstMessage, jobId = null) {
  const { data, error } = await supabase.rpc('start_conversation', {
    applicant_id: applicantId,
    first_message: String(firstMessage ?? '').trim(),
    job_id: jobId,
  })
  if (error) throw error
  return data
}

// Oldest first. before: ISO time; only messages older than it. hasMore: older ones exist.
export async function getMessages(conversationId, { before, limit = 50 } = {}) {
  let request = supabase
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit + 1)
  if (before) request = request.lt('created_at', before)
  const { data, error } = await request
  if (error) throw error
  return { messages: data.slice(0, limit).reverse(), hasMore: data.length > limit }
}

export async function sendMessage(conversationId, body) {
  const userId = await currentUserId()
  const text = String(body ?? '').trim()
  if (!text || text.length > MAX_MESSAGE_LENGTH) throw new Error('invalid_body')
  const side = sides.get(conversationId) ?? (await getConversation(conversationId))?.my_side
  if (!side) throw new Error('not_found')
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: userId, sender_role: side, body: text })
    .select(MESSAGE_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function markRead(conversationId) {
  const { error } = await supabase.rpc('mark_conversation_read', { conversation: conversationId })
  if (error) console.error('[InfluHunt] Marking the chat read failed', error)
}

// Total unread messages from the other side, across all my chats.
export async function getUnreadCount() {
  const list = await listConversations()
  return list.reduce((sum, c) => sum + c.unread_count, 0)
}

// Each listener gets its own channel, so two screens can listen at once.
const channelName = (topic) => `${topic}:${crypto.randomUUID()}`

// Calls onMessage(message) for each new message in this chat. Returns an unsubscribe function.
export function subscribeToMessages(conversationId, onMessage) {
  const channel = supabase
    .channel(channelName(`messages:${conversationId}`))
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onMessage(payload.new),
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

// Calls onChange when any of my chats changes (a new chat, a new message, read state).
export function subscribeToInbox(onChange) {
  const channel = supabase
    .channel(channelName('inbox'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => onChange())
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

// Where a recruiter's Message button goes. The new-chat screen opens the existing chat
// instead if there is one.
export const messagePath = (applicantId, jobId = null) =>
  `/chat/new?to=${encodeURIComponent(applicantId)}${jobId ? `&job=${encodeURIComponent(jobId)}` : ''}`
