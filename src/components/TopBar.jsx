import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MessageCircle, Sparkles, User } from 'lucide-react'
import { isSignedIn, signOut, useStorageUpdates } from '../lib/storage.js'

const menuItemClass =
  'block w-full rounded-input px-3 py-2 text-left text-base text-ink transition-colors duration-200 ease-in-out hover:bg-page'

function ProfileMenu({ signedIn }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  // Close on route change, outside click or Escape.
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])
  useEffect(() => {
    if (!open) return
    const onPointer = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-page text-muted transition-colors duration-200 ease-in-out hover:text-ink"
      >
        <User size={22} strokeWidth={1.75} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-48 rounded-card border border-line bg-white p-1.5 shadow-lg"
        >
          {signedIn ? (
            <>
              <Link role="menuitem" to="/profile" className={menuItemClass}>
                Edit profile
              </Link>
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  signOut()
                  navigate('/')
                }}
                className={menuItemClass}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link role="menuitem" to="/profile" className={menuItemClass}>
                Create profile
              </Link>
              <Link role="menuitem" to="/sign-in" className={menuItemClass}>
                Sign in
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function TopBar() {
  useStorageUpdates()
  const signedIn = isSignedIn()

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/80 backdrop-blur">
      <div className="flex h-16 w-full items-center justify-between px-6">
        <Link to="/find" className="flex items-center gap-2 text-2xl font-bold tracking-tight text-ink">
          {/* Temporary placeholder logo */}
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-ink text-white">
            <Sparkles size={20} strokeWidth={2} />
          </span>
          INFLUHUNT
        </Link>
        <div className="flex items-center gap-3">
          {signedIn && (
            <Link
              to="/chat"
              aria-label="Chat"
              className="relative flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors duration-200 ease-in-out hover:bg-page"
            >
              <MessageCircle size={24} strokeWidth={1.75} />
            </Link>
          )}
          <ProfileMenu signedIn={signedIn} />
        </div>
      </div>
    </header>
  )
}
