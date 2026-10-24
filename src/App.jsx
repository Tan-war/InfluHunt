import { Navigate, Routes, Route, useLocation } from 'react-router-dom'
import TopBar from './components/TopBar.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import Landing from './pages/Landing.jsx'
import FindOpportunities from './pages/FindOpportunities.jsx'
import JobDetails from './pages/JobDetails.jsx'
import Login from './pages/Login.jsx'
import AuthCallback from './pages/AuthCallback.jsx'
import Terms from './pages/Terms.jsx'
import Privacy from './pages/Privacy.jsx'
import Profile from './pages/Profile.jsx'
import Notifications from './pages/Notifications.jsx'
import Chat from './pages/Chat.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  const { pathname, search } = useLocation()

  return (
    <div className="min-h-screen bg-page text-ink">
      {pathname !== '/' && <TopBar />}
      <main className="mx-auto w-full max-w-content px-6 py-10">
        {/* Keyed by path so moving to another page clears a previous crash. All of /chat
            shares one key, so switching chats doesn't rebuild the chat list. */}
        <ErrorBoundary key={pathname.startsWith('/chat') ? '/chat' : pathname}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/find" element={<FindOpportunities />} />
            <Route path="/jobs/:id" element={<JobDetails />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            {/* Old email/password page: now Google sign-in. */}
            <Route path="/sign-in" element={<Navigate to={`/login${search}`} replace />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
            <Route path="/chat" element={<RequireAuth><Chat /></RequireAuth>} />
            <Route path="/chat/:conversationId" element={<RequireAuth><Chat /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  )
}
