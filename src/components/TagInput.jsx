import { useState } from 'react'
import { X } from 'lucide-react'
import { inputClass } from './ui.js'

// Type a word and press Enter (or a comma) to add it as a chip; tap × to remove.
// A typed word that wasn't added yet is added when the field loses focus.
export default function TagInput({ id, values, onChange, placeholder, max = 10, hasError, onBlur }) {
  const [draft, setDraft] = useState('')
  const full = values.length >= max

  function add(raw) {
    const tag = raw.trim().replace(/,$/, '').trim()
    setDraft('')
    if (!tag || full || values.some((v) => v.toLowerCase() === tag.toLowerCase())) return
    onChange([...values, tag])
  }

  return (
    <div>
      <input
        id={id}
        value={draft}
        disabled={full}
        onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add(draft)
          }
        }}
        onBlur={() => {
          add(draft)
          onBlur?.()
        }}
        placeholder={full ? `That's ${max}. Remove one to add another.` : placeholder}
        aria-invalid={!!hasError}
        className={`${inputClass(hasError)} disabled:bg-page disabled:text-muted`}
      />
      {values.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {values.map((tag) => (
            <li key={tag} className="flex items-center gap-1 rounded-full bg-page py-1 pl-3 pr-1 text-sm">
              {tag}
              <button
                type="button"
                onClick={() => onChange(values.filter((v) => v !== tag))}
                aria-label={`Remove ${tag}`}
                className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors duration-200 ease-in-out hover:bg-line hover:text-ink"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
