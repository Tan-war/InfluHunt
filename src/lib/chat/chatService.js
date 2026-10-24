// The one place the UI gets chat data from. Never import an adapter or touch storage
// from components: switching to Supabase means adding supabaseAdapter.js with the same
// functions and choosing it here.
//
// Backend comes from VITE_CHAT_BACKEND (see .env.example). Only "mock" exists for now.
import * as mockAdapter from './mockAdapter.js'

const ADAPTERS = { mock: mockAdapter }
const requested = import.meta.env.VITE_CHAT_BACKEND || 'mock'
if (!ADAPTERS[requested]) console.warn(`[InfluHunt] Unknown VITE_CHAT_BACKEND "${requested}", using "mock".`)

export const chatBackend = ADAPTERS[requested] ? requested : 'mock'
const adapter = ADAPTERS[chatBackend]

export const listConversations = () => adapter.listConversations()
export const getConversation = (conversationId) => adapter.getConversation(conversationId)
export const getOrCreateConversation = (applicationId) => adapter.getOrCreateConversation(applicationId)
export const getMessages = (conversationId, options) => adapter.getMessages(conversationId, options)
export const sendMessage = (conversationId, body) => adapter.sendMessage(conversationId, body)
export const markRead = (conversationId) => adapter.markRead(conversationId)
export const getUnreadCount = () => adapter.getUnreadCount()
export const subscribeToMessages = (conversationId, onMessage) => adapter.subscribeToMessages(conversationId, onMessage)
export const subscribeToInbox = (onChange) => adapter.subscribeToInbox(onChange)

// Test tools: only in development builds with the mock backend (null otherwise).
export const testTools =
  import.meta.env.DEV && chatBackend === 'mock'
    ? {
        simulateRecruiterReply: mockAdapter.simulateRecruiterReply,
        resetTestChats: mockAdapter.resetTestChats,
        loadSampleChats: mockAdapter.loadSampleChats,
      }
    : null
