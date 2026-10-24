import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import BackLink from '../components/BackLink.jsx'
import ChatList from '../components/chat/ChatList.jsx'
import Conversation from '../components/chat/Conversation.jsx'
import { btnPrimary } from '../components/ui.js'
import { testTools } from '../lib/chat/chatService.js'
import { useAuth } from '../lib/auth.jsx'

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const onChange = () => setMatches(list.matches)
    onChange()
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])
  return matches
}

// Always to the opportunities page: the previous page here is often just another chat.
// Wrapped in a flex row so it's exactly the link's height (an inline link adds line spacing).
const backToOpportunities = (
  <div className="flex">
    <BackLink to="/find" label="Back to opportunities" />
  </div>
)

// Dev builds with the mock backend only.
const testBanner = testTools && (
  <p className="bg-amber-50 px-4 py-2 text-center text-[13px] text-amber-900">
    Test mode: chats are saved only in this browser.
  </p>
)

// /chat and /chat/:conversationId. Phones: the list and a chat are separate full screens.
// Desktop (768px+): list on the left, open chat on the right.
export default function Chat() {
  const { conversationId } = useParams()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const { role } = useAuth()

  // Test-mode chat is applicant-only; recruiter chat arrives in phase 5.
  if (role === 'recruiter') {
    return (
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Chats</h1>
        <div className="mt-6 rounded-card bg-white px-6 py-10 text-center">
          <p className="text-muted">No chats yet. Find talent and say hi.</p>
          <Link to="/recruiter/talent" className={`${btnPrimary} mt-6`}>
            Find talent
          </Link>
        </div>
      </div>
    )
  }

  if (!isDesktop) {
    if (conversationId) return <Conversation key={conversationId} conversationId={conversationId} fullScreen banner={testBanner} />
    return (
      <div>
        {backToOpportunities}
        {testBanner && <div className="mt-6 overflow-hidden rounded-card">{testBanner}</div>}
        <div className="mt-6">
          <ChatList />
        </div>
      </div>
    )
  }

  return (
    <>
      {backToOpportunities}
      {/* Fills the screen below the top bar (4rem + 1px border), the page padding (2 × 2.5rem)
          and the back link with its gap (1.25rem + 1rem). */}
      <div className="mt-4 flex h-[calc(100dvh-11.25rem-1px)] min-h-[28rem] flex-col overflow-hidden rounded-card bg-white">
        {testBanner}
        <div className="grid min-h-0 flex-1 grid-cols-[320px_1fr]">
          <div className="min-h-0 overflow-y-auto border-r border-line">
            <ChatList activeId={conversationId} compact />
          </div>
          <div className="min-h-0">
            {conversationId ? (
              <Conversation key={conversationId} conversationId={conversationId} />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-muted">
                Pick a chat to start talking.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
