// Small loading spinner, centred in the content column.
export default function Spinner({ label = 'Loading' }) {
  return (
    <div role="status" className="flex justify-center py-16">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-ink" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
