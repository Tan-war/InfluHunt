import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <Link
        to="/"
        className="mt-4 inline-block text-accent transition-opacity duration-200 ease-in-out hover:opacity-80"
      >
        Go back home
      </Link>
    </div>
  )
}
