export function formatPay(pay) {
  return pay === 0 ? 'Unpaid' : `₹${pay.toLocaleString('en-IN')} / month`
}

export function formatWorkMode(job) {
  return job.location ? `${job.workMode} · ${job.location}` : job.workMode
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Location chip: WFH → Remote, WFO → On-site, keeping the city when there is one.
export function formatLocation(job) {
  const mode = { WFH: 'Remote', WFO: 'On-site', Hybrid: 'Hybrid' }[job.workMode] ?? job.workMode
  return job.location && job.workMode !== 'WFH' ? `${mode} · ${job.location}` : mode
}

// 'YYYY-MM-DD' as a local calendar date (new Date('YYYY-MM-DD') would be UTC).
function parseDay(day) {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// e.g. "today", "yesterday", "3 days ago", "2 weeks ago"
export function formatDaysAgo(day) {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const days = Math.max(0, Math.round((start - parseDay(day)) / 86400000))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} ${days < 14 ? 'week' : 'weeks'} ago`
  const months = Math.floor(days / 30)
  return `${months} ${months === 1 ? 'month' : 'months'} ago`
}

// e.g. "30 Oct"
export function formatShortDate(day) {
  return parseDay(day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
