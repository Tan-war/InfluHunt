// Formatting for the chat UI: times, day labels, and message text with links.
import { formatCreatorType } from '../candidates.js'
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const daysAgo = (iso) => Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86_400_000)

// "10:42 am" (follows the device's 12/24-hour setting).
export const formatClock = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

// Chat list: "10:42 am" today, "Yesterday", then "12 Oct" (adds the year if not this year).
export function formatListTime(iso) {
  const days = daysAgo(iso)
  if (days <= 0) return formatClock(iso)
  if (days === 1) return 'Yesterday'
  const date = new Date(iso)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) })
}

// Day separators: "Today", "Yesterday", "12 Oct 2026".
export function formatDayLabel(iso) {
  const days = daysAgo(iso)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const sameDay = (a, b) => startOfDay(new Date(a)).getTime() === startOfDay(new Date(b)).getTime()

const LINK = /(https?:\/\/[^\s<>"]+)/g

// Message text as React nodes: plain text, with http(s) links made clickable. Never HTML,
// so typed tags like <b> or <script> just show as text. Trailing punctuation stays out of links.
export function renderMessageText(body) {
  return body.split(LINK).map((part, i) => {
    if (i % 2 === 0) return part
    const [, url, trailing] = part.match(/^(.*?)([.,!?;:)\]'"]*)$/)
    return (
      <span key={i}>
        <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-2">
          {url}
        </a>
        {trailing}
      </span>
    )
  })
}

// Who a chat is with, for the chat list and the chat header.
//   Recruiter's view: the applicant's name and photo; their creator type, plus the job if any.
//   Applicant's view: the recruiter's name and logo; their brand, plus the job if any.
export function chatPartner(c) {
  const context =
    c.my_side === 'recruiter' ? formatCreatorType(c.other_roles ?? [], c.other_role_other ?? '') : c.recruiter_brand_name
  return {
    name: c.other_name || 'InfluHunt member',
    avatarUrl: c.other_avatar_url,
    subtitle: [context, c.job_title].filter(Boolean).join(' · '),
  }
}

// The note at the top of a chat, for the applicant: "Asha messaged you about Video editor".
export const startedNote = (c) => `${c.other_name || 'The creator'} messaged you${c.job_title ? ` about ${c.job_title}` : ''}`
