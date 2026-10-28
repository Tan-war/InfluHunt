import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { btnPrimary } from '../ui.js'
import { findConversationWith } from '../../lib/chat/chatService.js'

// For an applicant's application pop-up: "Open chat" when this creator has messaged them,
// otherwise a short note. Applicants can't start chats, so there's never a button to.
export default function CreatorChatLink({ recruiterId, status }) {
  const [conversation, setConversation] = useState(undefined) // undefined: loading; null: none

  useEffect(() => {
    let active = true
    findConversationWith(recruiterId)
      .then((found) => active && setConversation(found))
      .catch(() => active && setConversation(null))
    return () => {
      active = false
    }
  }, [recruiterId])

  if (conversation === undefined) return null
  if (conversation) {
    return (
      <div className="mt-6 flex justify-center">
        <Link to={`/chat/${conversation.id}`} className={`${btnPrimary} w-full sm:w-auto`}>
          Open chat
        </Link>
      </div>
    )
  }
  if (status === 'not_selected') return null
  return <p className="mt-4 text-center text-sm text-muted">The creator will message you here if they'd like to talk.</p>
}
