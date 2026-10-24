import { useEffect, useState } from 'react'

const initialsOf = (name) =>
  name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?'

// A round photo, or initials when there's no photo or it fails to load.
// className sets the size (and any border); the circle and fallback are built in.
export default function Avatar({ url, name = '', className = 'h-11 w-11' }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
  }, [url])
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-page ${className}`}>
      {url && !failed ? (
        // no-referrer: Google photo URLs can refuse requests that carry a referrer.
        <img src={url} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-semibold text-ink">{initialsOf(name)}</span>
      )}
    </span>
  )
}
