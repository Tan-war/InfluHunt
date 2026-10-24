// Formatting for the chat UI: times, day labels, and message text with links.
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
