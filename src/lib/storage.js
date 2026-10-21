// All browser storage goes through here. Every read and write is wrapped in
// try/catch so a blocked or full localStorage never crashes the page.
import { useEffect, useState } from 'react'

const KEYS = {
  profile: 'influhunt.profile',
  session: 'influhunt.session',
  applications: 'influhunt.applications',
  likes: 'influhunt.likes',
  reports: 'influhunt.reports',
  listScroll: 'influhunt.listScroll',
  pendingApply: 'influhunt.pendingApply',
}
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

// Re-render the calling component whenever stored data changes (this tab or another).
export function useStorageUpdates() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const bump = () => setTick((t) => t + 1)
    window.addEventListener(CHANGE_EVENT, bump)
    window.addEventListener('storage', bump)
    return () => {
      window.removeEventListener(CHANGE_EVENT, bump)
      window.removeEventListener('storage', bump)
    }
  }, [])
}

// Profile (one per device for now)
export const getProfile = () => read(KEYS.profile, null)
export const saveProfile = (profile) => write(KEYS.profile, profile)

// Signed-in state
export const isSignedIn = () => read(KEYS.session, null)?.signedIn === true
export const getSessionEmail = () => read(KEYS.session, null)?.email ?? ''
export const signIn = (email) => write(KEYS.session, { signedIn: true, email })
export const signOut = () => write(KEYS.session, null)

// Applications: [{ jobId, appliedOn }]
export const getApplications = () => read(KEYS.applications, [])
export const hasApplied = (jobId) => getApplications().some((a) => a.jobId === jobId)
export function recordApplication(jobId) {
  if (hasApplied(jobId)) return true
  return write(KEYS.applications, [...getApplications(), { jobId, appliedOn: new Date().toISOString() }])
}

// Recruiter likes: [{ id, jobId, brandName, role, hrEmail, date, seen }]
export const getLikes = () => read(KEYS.likes, [])
export const hasUnseenLikes = () => getLikes().some((like) => !like.seen)
export function addLike({ jobId, brandName, role, hrEmail }) {
  const like = {
    id: `${Date.now()}`,
    jobId,
    brandName,
    role,
    hrEmail,
    date: new Date().toISOString(),
    seen: false,
  }
  return write(KEYS.likes, [...getLikes(), like])
}
export function markLikesSeen() {
  const likes = getLikes()
  if (likes.some((like) => !like.seen)) write(KEYS.likes, likes.map((like) => ({ ...like, seen: true })))
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

// "Save and apply": the profile page leaves the job id here, and the job page
// picks it up once (then clears it) to finish applying. This tab only.
export function setPendingApply(jobId) {
  try {
    sessionStorage.setItem(KEYS.pendingApply, jobId)
  } catch {
    // Ignore: the person can still tap Apply now again.
  }
}
export function takePendingApply() {
  try {
    const jobId = sessionStorage.getItem(KEYS.pendingApply)
    sessionStorage.removeItem(KEYS.pendingApply)
    return jobId
  } catch {
    return null
  }
}
