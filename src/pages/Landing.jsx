import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { btnPrimary, btnSecondary } from '../components/ui.js'
import { isSignedIn } from '../lib/storage.js'

export default function Landing() {
  const [showComingSoon, setShowComingSoon] = useState(false)

  // Signed-in people go straight to their home page.
  if (isSignedIn()) return <Navigate to="/find" replace />

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Find your next creator job.</h1>
      <p className="mt-4 max-w-md text-lg text-muted">
        Jobs for YouTubers, Instagram creators, editors and artists, in one place.
      </p>

      <div className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Link to="/find" className={btnPrimary}>
          Find opportunities
        </Link>
        <button type="button" onClick={() => setShowComingSoon(true)} className={btnSecondary}>
          Post an opportunity
        </button>
        <Link to="/sign-in" className={btnSecondary}>
          Sign in
        </Link>
      </div>

      {showComingSoon && <p className="mt-4 text-sm text-muted">Coming soon.</p>}
    </div>
  )
}
