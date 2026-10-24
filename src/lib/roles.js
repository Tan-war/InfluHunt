// Account roles and where each one lands. One Google account = one role, set once.
import { safeNext } from './redirect.js'

export const ROLES = ['applicant', 'recruiter']
export const isRole = (value) => ROLES.includes(value)

// Home page for each role; no role yet means "choose one".
export const homeFor = (role) => (role === 'recruiter' ? '/recruiter/jobs' : role === 'applicant' ? '/find' : '/welcome')

// Pages only applicants use: their profile and the apply flow (?apply=1).
const isApplicantOnly = (path) => path.startsWith('/profile') || /[?&]apply=1(&|$)/.test(path)

// Where to send someone after sign-in (or after choosing a role), given where they were headed.
export function routeAfterSignIn({ role, profile, recruiterProfile, next }) {
  const target = safeNext(next)
  if (!role) return `/welcome?next=${encodeURIComponent(target)}`
  if (role === 'recruiter') {
    if (!recruiterProfile?.profile_completed) return '/recruiter/onboarding'
    return target === '/' || isApplicantOnly(target) ? '/recruiter/jobs' : target
  }
  const destination = target === '/' || target.startsWith('/recruiter') ? '/find' : target
  return profile?.profile_completed ? destination : `/profile?next=${encodeURIComponent(destination)}`
}
