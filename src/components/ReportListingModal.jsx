import { useId, useState } from 'react'
import Modal from './Modal.jsx'
import { btnPrimary, btnText, inputClass } from './ui.js'
import { addReport } from '../lib/storage.js'

const REASONS = ['Fake or scam', 'Asks me to pay', 'Inappropriate content', 'Other']
const NOTE_MAX = 300

export default function ReportListingModal({ jobId, onClose }) {
  const id = useId()
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!reason) return
    addReport({ jobId, reason, note: note.trim() })
    setSent(true)
  }

  if (sent) {
    return (
      <Modal title="Report sent" onClose={onClose}>
        <p className="text-muted">Thanks. We'll review this listing.</p>
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className={`${btnPrimary} w-full sm:w-auto`}>
            Done
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Report this listing" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">What's wrong?</legend>
          <div className="space-y-2">
            {REASONS.map((option) => (
              <label key={option} className="flex cursor-pointer items-center gap-2 text-base">
                <input
                  type="radio"
                  name={`${id}-reason`}
                  value={option}
                  checked={reason === option}
                  onChange={() => setReason(option)}
                  className="h-4 w-4 accent-accent"
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>

        <label htmlFor={`${id}-note`} className="mb-1.5 mt-5 block text-sm font-medium">
          Anything else? <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id={`${id}-note`}
          rows={3}
          maxLength={NOTE_MAX}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Tell us a bit more."
          className={inputClass(false)}
        />
        <p className="mt-1 text-right text-xs text-muted">
          {note.length}/{NOTE_MAX}
        </p>

        <div className="mt-4 flex flex-col-reverse gap-2 border-t border-line pt-6 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={btnText}>
            Cancel
          </button>
          <button type="submit" disabled={!reason} className={btnPrimary}>
            Send report
          </button>
        </div>
      </form>
    </Modal>
  )
}
