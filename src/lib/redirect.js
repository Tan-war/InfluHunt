// Only same-site relative paths are allowed as a post-sign-in destination, so a link
// like /login?next=https://evil.com can't send people off-site (open redirect).
// "/\" counts as "//" in browsers, so it's rejected too.
export function safeNext(next) {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/'
  return next
}

// Builds /login?next=<path>, encoding the path so its own query (e.g. ?apply=1) survives.
export const loginPath = (next) => `/login?next=${encodeURIComponent(safeNext(next))}`
