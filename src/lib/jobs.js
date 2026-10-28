// Jobs in Supabase (public.jobs, read through the public.job_listings view) and the
// labels/formatting both sides share.
import { supabase } from './supabaseClient.js'

export const JOB_TYPES = [
  { value: 'full_time', label: 'Full time' },
  { value: 'part_time', label: 'Part time' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Internship' },
]
// Same levels the applicant profile will use.
export const EXPERIENCE_LEVELS = [
  { value: 'fresher', label: 'Fresher' },
  { value: '0_1', label: '0–1 yr' },
  { value: '1_3', label: '1–3 yrs' },
  { value: '3_plus', label: '3+ yrs' },
]
export const LOCATION_TYPES = [
  { value: 'city', label: 'City' },
  { value: 'remote', label: 'Work from home' },
  { value: 'hybrid', label: 'Hybrid' },
]
export const JOB_PLATFORMS = ['YouTube', 'Instagram', 'X', 'LinkedIn', 'Other']

const labelOf = (list, value) => list.find((item) => item.value === value)?.label ?? value
export const jobTypeLabel = (value) => labelOf(JOB_TYPES, value)
export const experienceLabel = (value) => labelOf(EXPERIENCE_LEVELS, value)

const rupees = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`

// "₹15,000/month", "₹3,00,000/year" or "Unpaid".
export function formatJobPay(job) {
  if (job.pay_type === 'unpaid') return 'Unpaid'
  return `${rupees(job.pay_amount)}/${job.pay_type === 'per_annum' ? 'year' : 'month'}`
}

// "Remote", "On-site · Mumbai" or "Hybrid · Mumbai".
export function formatJobLocation(job) {
  if (job.location_type === 'remote') return 'Remote'
  return `${job.location_type === 'hybrid' ? 'Hybrid' : 'On-site'} · ${job.city}`
}

// Open unless closed by the recruiter or past apply_by. The database's job_is_open() is the
// source of truth (job_listings.is_open); this mirrors it for rows fetched earlier.
export const isJobOpen = (job) => job.is_open ?? (!job.closed_at && new Date(job.apply_by) > new Date())

// ---- Reads ----

// Open jobs, newest first, for Find Opportunities.
export async function fetchOpenJobs() {
  const { data, error } = await supabase
    .from('job_listings')
    .select('*')
    .eq('is_open', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// One job with its recruiter's public details, open or closed. null if it doesn't exist.
export async function fetchJob(jobId) {
  // Not a UUID: can't be a job (and would make the database complain).
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) return null
  const { data, error } = await supabase.from('job_listings').select('*').eq('id', jobId).maybeSingle()
  if (error) throw error
  return data
}

export async function fetchJobsByRecruiter(recruiterId, { openOnly = false } = {}) {
  let request = supabase.from('job_listings').select('*').eq('recruiter_id', recruiterId)
  if (openOnly) request = request.eq('is_open', true)
  const { data, error } = await request.order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ---- Writes (recruiters; the database checks ownership) ----

export async function createJob(fields) {
  const { data, error } = await supabase.from('jobs').insert(fields).select('id').single()
  if (error) throw error
  return data.id
}

export async function updateJob(jobId, fields) {
  const { error } = await supabase.from('jobs').update(fields).eq('id', jobId)
  if (error) throw error
}

export const closeJob = (jobId) => updateJob(jobId, { closed_at: new Date().toISOString() })
export const reopenJob = (jobId) => updateJob(jobId, { closed_at: null })
