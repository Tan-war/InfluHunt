import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

// "‹ Back": returns to the previous page in the app (so the listings page comes back
// with its search, filters and scroll). With no previous page, e.g. opened from a
// shared link, it goes to the opportunities page instead.
// With `to`, it always goes to that page instead, labelled `label`.
export default function BackLink({ to, label = 'Back' }) {
  const navigate = useNavigate()
  // React Router numbers its history entries (idx 0 = first page of this visit; a
  // redirect that replaces a page keeps its number). Above 0 means an in-app page is
  // behind this one, so "back" won't leave the site (e.g. towards Google after sign-in).
  const hasPrevious = (window.history.state?.idx ?? 0) > 0

  return (
    <Link
      to={to ?? '/find'}
      onClick={(e) => {
        if (to || !hasPrevious) return
        e.preventDefault()
        navigate(-1)
      }}
      className="-ml-1 inline-flex items-center gap-0.5 text-sm text-accent transition-opacity duration-200 ease-in-out hover:opacity-80"
    >
      <ChevronLeft size={18} />
      {label}
    </Link>
  )
}
