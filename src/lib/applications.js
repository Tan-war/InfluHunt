// Applications in Supabase (public.applications). The database checks who may do what:
// applicants apply for themselves to open jobs; status changes go through
// set_application_status(), which only the job's recruiter can call.
import { supabase } from './supabaseClient.js'

export const STATUS_LABELS = {
  applied: 'Applied',
  viewed: 'Viewed',
  shortlisted: 'Shortlisted',
  not_selected: 'Not selected',
}
export const MAX_PITCH = 150

// ---- Applicants ----

// The signed-in applicant's applications, newest first: [{ id, job_id, status, pitch, created_at }].
export async function fetchMyApplications() {
  const { data, error } = await supabase
    .from('applications')
    .select('id, job_id, status, pitch, created_at, status_updated_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchMyApplication(jobId) {
  const { data, error } = await supabase
    .from('applications')
    .select('id, job_id, status, pitch, created_at, status_updated_at')
    .eq('job_id', jobId)
    .maybeSingle()
  if (error) throw error
  return data
}

// Resolves to 'applied' when sent (or when already applied), 'closed' if the job closed meanwhile.
export async function applyToJob(userId, jobId, pitch) {
  const { error } = await supabase
    .from('applications')
    .insert({ job_id: jobId, applicant_id: userId, pitch: pitch.trim() || null })
  if (!error) return 'applied'
  if (error.code === '23505') return 'applied' // unique (job_id, applicant_id): already applied
  if (error.code === '42501') return 'closed' // refused by the rules: most likely no longer open
  throw error
}

// ---- Recruiters ----

// Applicants for one of my jobs, with their public profile fields (never email or phone).
export async function fetchJobApplicants(jobId) {
  const { data, error } = await supabase.rpc('get_job_applicants', { job: jobId })
  if (error) throw error
  return data
}

// Applicant counts for my jobs: { [jobId]: count }.
export async function fetchApplicantCounts(jobIds) {
  if (jobIds.length === 0) return {}
  const { data, error } = await supabase.from('applications').select('job_id').in('job_id', jobIds)
  if (error) throw error
  return data.reduce((counts, row) => ({ ...counts, [row.job_id]: (counts[row.job_id] ?? 0) + 1 }), {})
}

// One application to one of my jobs (the rules hide everyone else's).
export async function fetchApplication(applicationId) {
  const { data, error } = await supabase
    .from('applications')
    .select('id, job_id, applicant_id, status, pitch, created_at, status_updated_at')
    .eq('id', applicationId)
    .maybeSingle()
  if (error) throw error
  return data
}

// All applications this candidate made to my jobs (the rules hide the rest), with job titles.
export async function fetchCandidateApplications(candidateId) {
  const { data, error } = await supabase
    .from('applications')
    .select('id, job_id, status, created_at, jobs(title)')
    .eq('applicant_id', candidateId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function setApplicationStatus(applicationId, newStatus) {
  const { data, error } = await supabase.rpc('set_application_status', {
    application_id: applicationId,
    new_status: newStatus,
  })
  if (error) throw error
  return data
}

// A candidate's public profile (signed-in recruiters only), or null.
export async function fetchCandidate(candidateId) {
  if (!/^[0-9a-f-]{36}$/i.test(candidateId)) return null
  const { data, error } = await supabase.rpc('get_candidate', { candidate: candidateId })
  if (error) throw error
  return data?.[0] ?? null
}
