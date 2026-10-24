import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, MessageCircle, Sparkles, Users } from 'lucide-react'
import Avatar from './Avatar.jsx'
import { btnPrimary } from './ui.js'
import { useAuth } from '../lib/auth.jsx'
import { loginPath } from '../lib/redirect.js'
import { homeFor } from '../lib/roles.js'
import { useUnreadCount } from '../lib/chat/useUnreadCount.js'

const iconLinkClass =
  'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition-colors duration-200 ease-in-out hover:bg-page'

const menuItemClass =
  'block w-full rounded-input px-3 py-2 text-left text-base text-ink transition-colors duration-200 ease-in-out hover:bg-page'

function ProfileMenu() {
  const { user, profile, role, recruiterProfile, signOut } = useAuth()
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
        className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-line bg-page transition-colors duration-200 ease-in-out hover:border-ink"
      >
        <Avatar
          url={
            recruiterProfile?.logo_url || profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture
          }
          name={
            recruiterProfile?.display_name || profile?.full_name || user.user_metadata?.full_name || user.email || ''
          }
          className="h-full w-full"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-48 rounded-card border border-line bg-white p-1.5 shadow-lg"
        >
          <Link role="menuitem" to={role === 'recruiter' ? '/recruiter/profile' : '/profile'} className={menuItemClass}>
            My profile
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={async () => {
              await signOut()
              // replace: a protected page may already have redirected to /login on sign-out.
              navigate('/', { replace: true })
            }}
            className={menuItemClass}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default function TopBar() {
  const { user, role, loading } = useAuth()
  const { pathname, search } = useLocation()
  const isRecruiter = role === 'recruiter'
  // Test-mode chat is applicant-only until recruiter chat arrives (phase 5).
  const unread = useUnreadCount(role === 'applicant' ? user?.id : null)

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/80 backdrop-blur">
      <div className="flex h-16 w-full items-center justify-between px-6">
        <Link
          to={user && role ? homeFor(role) : '/find'}
          aria-label="InfluHunt home"
          className="flex items-center gap-2 text-2xl font-bold tracking-tight text-ink"
        >
          {/* Temporary placeholder logo */}
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-ink text-white">
            <Sparkles size={20} strokeWidth={2} />
          </span>
          {/* Recruiters have more icons, so on phones they get the logo mark only. */}
          <span className={isRecruiter ? 'hidden sm:inline' : ''}>INFLUHUNT</span>
        </Link>
        <div className={`flex items-center ${isRecruiter ? 'gap-1 sm:gap-3' : 'gap-3'}`}>
          {loading ? (
            // Placeholder while sign-in state loads, so the logged-out UI doesn't flash.
            <span className="h-11 w-11 rounded-full bg-page" aria-hidden="true" />
          ) : user ? (
            <>
              {isRecruiter && (
                // Icon only on phones; with its label from 640px up.
                <Link
                  to="/recruiter/talent"
                  aria-label="Find talent"
                  className="flex h-11 shrink-0 items-center gap-2 rounded-full px-2.5 text-ink transition-colors duration-200 ease-in-out hover:bg-page sm:px-4"
                >
                  <Users size={22} strokeWidth={1.75} />
                  <span className="hidden text-sm font-medium sm:inline">Find talent</span>
                </Link>
              )}
              <Link to="/chat" aria-label={unread > 0 ? `Chat, ${unread} unread` : 'Chat'} className={iconLinkClass}>
                <MessageCircle size={24} strokeWidth={1.75} />
                {unread > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
              {isRecruiter && (
                <Link to="/notifications" aria-label="Notifications" className={iconLinkClass}>
                  <Bell size={24} strokeWidth={1.75} />
                </Link>
              )}
              <ProfileMenu />
            </>
          ) : (
            pathname !== '/login' &&
            pathname !== '/auth/callback' && (
              <Link to={loginPath(pathname + search)} className={`${btnPrimary} px-5 py-2 text-sm`}>
                Sign in
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  )
}
