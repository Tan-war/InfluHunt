// Shared display helpers for applicant (candidate) profiles on the recruiter side.
import { supabase } from './supabaseClient.js'

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

// "youtube.com/@someone/videos" from a full link, for showing a work link compactly.
export function linkLabel(url) {
  return url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/+$/, '')
}

// The first ~100 characters, cut at a word.
export function shortText(text = '', max = 100) {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  return `${cut.slice(0, cut.lastIndexOf(' ') > 60 ? cut.lastIndexOf(' ') : max).trimEnd()}…`
}

// ---- Find Talent (signed-in recruiters only; the database returns public fields only) ----

export const TALENT_PAGE_SIZE = 20

// One page of candidates: { rows, hasMore }. Asks for one extra row to know if there's more.
export async function searchCandidates({ q, skills, creatorType, jobType, experience }, offset = 0) {
  const { data, error } = await supabase.rpc('search_candidates', {
    q: q.trim() || null,
    skill_filter: skills.length ? skills : null,
    creator_type: creatorType || null,
    job_type: jobType || null,
    experience: experience || null,
    page_size: TALENT_PAGE_SIZE + 1,
    page_offset: offset,
  })
  if (error) throw error
  return { rows: data.slice(0, TALENT_PAGE_SIZE), hasMore: data.length > TALENT_PAGE_SIZE }
}

// Skills candidates actually list, most common first, for the Skills filter.
export async function fetchSkillOptions() {
  const { data, error } = await supabase.rpc('candidate_skill_options')
  if (error) throw error
  // A set of plain values; older PostgREST versions wrap each in an object.
  return data.map((item) => (typeof item === 'string' ? item : Object.values(item)[0]))
}
