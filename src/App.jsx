import { Routes, Route, useLocation } from 'react-router-dom'
import TopBar from './components/TopBar.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Landing from './pages/Landing.jsx'
import FindOpportunities from './pages/FindOpportunities.jsx'
import JobDetails from './pages/JobDetails.jsx'
import SignIn from './pages/SignIn.jsx'
import Profile from './pages/Profile.jsx'
import Notifications from './pages/Notifications.jsx'
import Chat from './pages/Chat.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen bg-page text-ink">
      {pathname !== '/' && <TopBar />}
      <main className="mx-auto w-full max-w-content px-6 py-10">
        {/* Keyed by path so moving to another page clears a previous crash. */}
        <ErrorBoundary key={pathname}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/find" element={<FindOpportunities />} />
            <Route path="/jobs/:id" element={<JobDetails />} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/:recruiterId" element={<Chat />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  )
}
