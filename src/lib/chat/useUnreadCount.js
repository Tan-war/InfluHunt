import { useEffect, useState } from 'react'
import { getUnreadCount, subscribeToInbox } from './chatService.js'

// Live total of unread chat messages for the signed-in user (0 when signed out).
export function useUnreadCount(userId) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!userId) {
      setCount(0)
      return
    }
    let active = true
    const refresh = async () => {
      try {
        const next = await getUnreadCount()
        if (active) setCount(next)
      } catch {
        if (active) setCount(0)
      }
    }
    refresh()
    const unsubscribe = subscribeToInbox(refresh)
    return () => {
      active = false
      unsubscribe()
    }
  }, [userId])
  return count
}
