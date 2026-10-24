// All browser storage goes through here. Every read and write is wrapped in
// try/catch so a blocked or full localStorage never crashes the page.
import { useEffect, useState } from 'react'

// Sign-in and the profile live in Supabase now (see lib/auth.jsx). What's left here is
// mock data, kept per signed-in user (keys end in .<userId>).
const KEYS = {
  applications: 'influhunt.applications',
  likes: 'influhunt.likes',
  reports: 'influhunt.reports',
  listScroll: 'influhunt.listScroll',
  chat: 'influhunt.chat',
}
const forUser = (key, userId) => `${key}.${userId}`
const CHANGE_EVENT = 'influhunt:storage'

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
    window.dispatchEvent(new Event(CHANGE_EVENT))
    return true
  } catch {
    return false
  }
}

// Calls onChange whenever stored data changes, in this tab or another. Returns an unsubscribe.
export function onStorageChange(onChange) {
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

// Re-render the calling component whenever stored data changes (this tab or another).
export function useStorageUpdates() {
  const [, setTick] = useState(0)
  useEffect(() => onStorageChange(() => setTick((t) => t + 1)), [])
}

// Applications: [{ id, jobId, appliedOn, sample? }]. id is a UUID, as a database row will
// have; sample marks ones the test chats created (see lib/chat/mockAdapter.js).
export function getApplications(userId) {
  if (!userId) return []
  const key = forUser(KEYS.applications, userId)
  const applications = read(key, [])
  // Older entries were saved without an id: give them one. Saved quietly (no change
  // event), since this can run while a component renders.
  if (applications.some((a) => !a.id)) {
    const withIds = applications.map((a) => (a.id ? a : { ...a, id: crypto.randomUUID() }))
    try {
      localStorage.setItem(key, JSON.stringify(withIds))
    } catch {
      // Ignore: ids are added again next time.
    }
    return withIds
  }
  return applications
}
export const getApplication = (userId, jobId) => getApplications(userId).find((a) => a.jobId === jobId) ?? null
export const hasApplied = (userId, jobId) => getApplication(userId, jobId) !== null
export function recordApplication(userId, jobId, { sample = false } = {}) {
  if (hasApplied(userId, jobId)) return true
  const application = { id: crypto.randomUUID(), jobId, appliedOn: new Date().toISOString() }
  if (sample) application.sample = true
  return write(forUser(KEYS.applications, userId), [...getApplications(userId), application])
}
export function removeSampleApplications(userId) {
  return write(
    forUser(KEYS.applications, userId),
    getApplications(userId).filter((a) => !a.sample),
  )
}

// Test-mode chat data, one blob per user: { seeded, conversations: [], messages: [] }.
// Only lib/chat/mockAdapter.js uses these.
export const getChatData = (userId) => read(forUser(KEYS.chat, userId), null)
export const saveChatData = (userId, data) => write(forUser(KEYS.chat, userId), data)

// Recruiter likes: [{ id, jobId, brandName, role, hrEmail, date, seen }]
export const getLikes = (userId) => (userId ? read(forUser(KEYS.likes, userId), []) : [])
export function addLike(userId, { jobId, brandName, role, hrEmail }) {
  const like = {
    id: `${Date.now()}`,
    jobId,
    brandName,
    role,
    hrEmail,
    date: new Date().toISOString(),
    seen: false,
  }
  return write(forUser(KEYS.likes, userId), [...getLikes(userId), like])
}
export function markLikesSeen(userId) {
  const likes = getLikes(userId)
  if (likes.some((like) => !like.seen)) write(forUser(KEYS.likes, userId), likes.map((like) => ({ ...like, seen: true })))
}

// Listing reports: [{ jobId, reason, note, reportedAt }]. Local only until there is a backend.
export const getReports = () => read(KEYS.reports, [])
export function addReport({ jobId, reason, note }) {
  const report = { jobId, reason, note, reportedAt: new Date().toISOString() }
  console.info('[InfluHunt] Listing reported', report)
  return write(KEYS.reports, [...getReports(), report])
}

// Scroll position of the listings page, kept for this tab only (sessionStorage).
// Stored with the query string so a different search doesn't restore a stale position.
export function getListScroll() {
  try {
    return JSON.parse(sessionStorage.getItem(KEYS.listScroll)) ?? null
  } catch {
    return null
  }
}
export function saveListScroll(search, y) {
  try {
    sessionStorage.setItem(KEYS.listScroll, JSON.stringify({ search, y }))
  } catch {
    // Ignore: restoring scroll is a nice-to-have.
  }
}

