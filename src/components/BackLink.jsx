import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

// "‹ Back": returns to the previous page in the app (so the listings page comes back
// with its search, filters and scroll). With no previous page, e.g. opened from a
// shared link, it goes to the opportunities page instead.
export default function BackLink() {
  const navigate = useNavigate()
  const location = useLocation()
  // React Router gives the first page of a visit the key 'default'.
  const hasPrevious = location.key !== 'default'

  return (
    <Link
      to="/find"
      onClick={(e) => {
        if (!hasPrevious) return
        e.preventDefault()
        navigate(-1)
      }}
      className="-ml-1 inline-flex items-center gap-0.5 text-sm text-accent transition-opacity duration-200 ease-in-out hover:opacity-80"
    >
      <ChevronLeft size={18} />
      Back
    </Link>
  )
}
