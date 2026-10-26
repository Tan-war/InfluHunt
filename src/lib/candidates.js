// Shared display helpers for applicant (candidate) profiles on the recruiter side.

// "Video editor, Scriptwriter" with "Other" replaced by what they typed.
export function formatCreatorType(roles = [], roleOther = '') {
  return roles.map((role) => (role === 'Other' && roleOther ? roleOther : role)).join(', ')
}

export const firstName = (fullName = '') => fullName.trim().split(/\s+/)[0] || 'them'

// Status chip colours, shared by the applicants list and the candidate page.
export const STATUS_CHIP = {
  applied: 'border border-ink text-ink',
  viewed: 'bg-page text-ink',
  shortlisted: 'bg-ink text-white',
  not_selected: 'bg-page text-muted',
}
