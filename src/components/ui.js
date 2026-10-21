// Shared class names so buttons and inputs look the same on every screen.

export const btnPrimary =
  'inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-base font-medium text-white transition-opacity duration-200 ease-in-out hover:opacity-90 disabled:cursor-not-allowed disabled:bg-line disabled:text-muted disabled:opacity-100'

export const btnSecondary =
  'inline-flex items-center justify-center rounded-full border border-line bg-white px-6 py-3 text-base font-medium text-ink transition-colors duration-200 ease-in-out hover:border-ink'

export const btnText =
  'inline-flex items-center justify-center rounded-full px-4 py-3 text-base font-medium text-muted transition-colors duration-200 ease-in-out hover:text-ink'

export const inputBase =
  'w-full rounded-input border bg-white px-4 py-3 text-base text-ink placeholder:text-muted outline-none transition-colors duration-200 ease-in-out focus:border-accent'

export const inputClass = (hasError) => `${inputBase} ${hasError ? 'border-red-500' : 'border-line'}`
