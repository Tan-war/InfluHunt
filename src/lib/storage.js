// All browser storage goes through here. Every read and write is wrapped in
// try/catch so a blocked or full localStorage never crashes the page.
import { useEffect, useState } from 'react'

// Sign-in, profiles, jobs, applications and chat live in Supabase now. What's left here is
// reports and the listings scroll.
const KEYS = {
  reports: 'influhunt.reports',
  listScroll: 'influhunt.listScroll',
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

