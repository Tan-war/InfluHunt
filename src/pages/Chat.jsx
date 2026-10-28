import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import BackLink from '../components/BackLink.jsx'
import ChatList from '../components/chat/ChatList.jsx'
import Conversation, { NewConversation } from '../components/chat/Conversation.jsx'
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

// /chat, /chat/:conversationId and /chat/new?to=<applicant>&job=<job> (recruiters starting a chat).
// Phones: the list and a chat are separate full screens. Desktop (768px+): list on the left,
// open chat on the right. Works the same for both roles.
export default function Chat() {
  const { conversationId } = useParams()
  const [params] = useSearchParams()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const { role } = useAuth()

  // Always to the role's main page: the previous page here is often just another chat.
  // Wrapped in a flex row so it's exactly the link's height (an inline link adds line spacing).
  const back = (
    <div className="flex">
      {role === 'recruiter' ? (
        <BackLink to="/recruiter/jobs" label="Back to job postings" />
      ) : (
        <BackLink to="/find" label="Back to opportunities" />
      )}
    </div>
  )

  const isNew = conversationId === 'new'
  const renderChat = (fullScreen) =>
    isNew ? (
      <NewConversation
        key={params.toString()}
        applicantId={params.get('to')}
        jobId={params.get('job')}
        fullScreen={fullScreen}
      />
    ) : (
      <Conversation key={conversationId} conversationId={conversationId} fullScreen={fullScreen} />
    )

  if (!isDesktop) {
    if (conversationId) return renderChat(true)
    return (
      <div>
        {back}
        <div className="mt-6">
          <ChatList />
        </div>
      </div>
    )
  }

  return (
    <>
      {back}
      {/* Fills the screen below the top bar (4rem + 1px border), the page padding (2 × 2.5rem)
          and the back link with its gap (1.25rem + 1rem). */}
      <div className="mt-4 flex h-[calc(100dvh-11.25rem-1px)] min-h-[28rem] flex-col overflow-hidden rounded-card bg-white">
        <div className="grid min-h-0 flex-1 grid-cols-[320px_1fr]">
          <div className="min-h-0 overflow-y-auto border-r border-line">
            <ChatList activeId={isNew ? null : conversationId} compact />
          </div>
          <div className="min-h-0">
            {conversationId ? (
              renderChat(false)
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
