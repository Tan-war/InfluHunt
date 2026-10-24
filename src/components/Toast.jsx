import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

// const [toastVisible, showToast] = useToast(); call showToast() and it hides after 2.5s.
export function useToast() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => setVisible(false), 2500)
    return () => clearTimeout(timer)
  }, [visible])
  return [visible, useCallback(() => setVisible(true), [])]
}

// Short confirmation at the bottom of the screen. Sits above a pinned save bar on phones.
export default function Toast({ show, children }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-6 transition-opacity duration-200 ease-in-out sm:bottom-8 ${
        show ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {show && (
        <span className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white shadow-lg">
          <CheckCircle2 size={18} className="shrink-0" />
          {children}
        </span>
      )}
    </div>
  )
}
