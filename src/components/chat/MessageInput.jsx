import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { SendHorizontal, Smile } from 'lucide-react'
import { COUNTER_FROM, MAX_MESSAGE_LENGTH, QUICK_EMOJIS } from '../../lib/chat/rules.js'
import { track } from '../../lib/analytics.js'

const MAX_HEIGHT = 4 * 24 + 20 // 4 lines of 24px text + vertical padding

// Touch screens: Enter adds a new line and the Send button sends.
// Mouse/keyboard: Enter sends, Shift+Enter adds a new line.
const isTouch = () => window.matchMedia('(pointer: coarse)').matches

// onSend(text) returns false when the message was ignored (rate limit), so the text stays.
export default function MessageInput({ onSend }) {
  const [value, setValue] = useState('')
  const [trayOpen, setTrayOpen] = useState(false)
  const textRef = useRef(null)
  const trimmed = value.trim()
  const canSend = trimmed.length > 0 && trimmed.length <= MAX_MESSAGE_LENGTH

  // Grow with the text, up to 4 lines, then scroll.
  useLayoutEffect(() => {
    const el = textRef.current
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden'
  }, [value])

  useEffect(() => {
    if (!trayOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setTrayOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [trayOpen])

  function send() {
    if (!canSend) return
    if (onSend(trimmed) === false) return
    setValue('')
    setTrayOpen(false)
  }

  function insertEmoji(emoji) {
    const el = textRef.current
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? start
    setValue(value.slice(0, start) + emoji + value.slice(end))
    track('quick_emoji_used', { emoji })
    requestAnimationFrame(() => {
      el.setSelectionRange(start + emoji.length, start + emoji.length)
      if (!isTouch()) el.focus() // on phones, don't pop the keyboard open for every emoji
    })
  }

  return (
    <div className="relative shrink-0 border-t border-line bg-white px-3 py-2.5 md:px-4">
      {trayOpen && (
        <div
          role="group"
          aria-label="Quick emojis"
          className="absolute bottom-full left-3 mb-2 flex gap-1 rounded-full border border-line bg-white p-1.5 shadow-lg"
        >
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => insertEmoji(emoji)}
              aria-label={`Insert ${emoji}`}
              className="flex h-9 w-9 items-center justify-center rounded-full text-xl transition-colors duration-200 ease-in-out hover:bg-page"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => setTrayOpen((open) => !open)}
          aria-label="Quick emojis"
          aria-expanded={trayOpen}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-200 ease-in-out hover:bg-page hover:text-ink"
        >
          <Smile size={22} />
        </button>
        <textarea
          ref={textRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !isTouch()) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="Message"
          aria-label="Message"
          className="min-w-0 flex-1 resize-none rounded-[22px] border border-line bg-white px-4 py-2.5 text-base leading-6 text-ink outline-none transition-colors duration-200 ease-in-out placeholder:text-muted focus:border-accent"
        />
        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          aria-label="Send"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-opacity duration-200 ease-in-out hover:opacity-90 disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
        >
          <SendHorizontal size={20} />
        </button>
      </div>

      {value.length > COUNTER_FROM && (
        <p className={`mt-1 text-right text-xs ${trimmed.length > MAX_MESSAGE_LENGTH ? 'text-red-600' : 'text-muted'}`}>
          {value.length}/{MAX_MESSAGE_LENGTH}
        </p>
      )}
    </div>
  )
}
