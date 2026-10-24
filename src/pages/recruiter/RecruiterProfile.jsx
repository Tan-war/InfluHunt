import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackLink from '../../components/BackLink.jsx'
import RecruiterProfileForm from '../../components/RecruiterProfileForm.jsx'
import Toast, { useToast } from '../../components/Toast.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { saveRecruiterProfile } from '../../lib/recruiterProfiles.js'
import { track } from '../../lib/analytics.js'

// /recruiter/onboarding (first time) and /recruiter/profile (editing).
export default function RecruiterProfile({ onboarding = false }) {
  const navigate = useNavigate()
  // Behind RequireAuth role="recruiter", so the user and their rows have loaded.
  const { user, recruiterProfile, refreshProfile } = useAuth()
  const [toastVisible, showToast] = useToast()
  const meta = user.user_metadata ?? {}
  // Google's name and photo fill in until they've saved their own.
  const [initial] = useState(() => ({
    displayName: recruiterProfile?.display_name || meta.full_name || meta.name || '',
    brandName: recruiterProfile?.brand_name ?? '',
    primaryLink: recruiterProfile?.primary_link ?? '',
    logoUrl: recruiterProfile?.logo_url || meta.avatar_url || meta.picture || '',
    niche: recruiterProfile?.niche ?? '',
    platforms: recruiterProfile?.platforms ?? [],
    bio: recruiterProfile?.bio ?? '',
  }))
  const firstTime = !recruiterProfile?.profile_completed

  async function handleSubmit(fields) {
    if (!(await saveRecruiterProfile(user.id, fields))) return false
    if (firstTime) track('recruiter_profile_completed')
    await refreshProfile()
    if (onboarding) navigate('/recruiter/jobs/new', { replace: true })
    else showToast()
    return true
  }

  return (
    // Bottom padding on phones keeps the last fields clear of the pinned save bar.
    <div className="pb-24 sm:pb-0">
      {!onboarding && <BackLink to="/recruiter/jobs" label="My job postings" />}
      <h1 className={`${onboarding ? '' : 'mt-6 '}text-3xl font-semibold tracking-tight`}>
        {onboarding ? 'Set up your recruiter profile' : 'Your recruiter profile'}
      </h1>
      <p className="mt-2 text-muted">Applicants see this when they look at your gigs.</p>

      <div className="mt-6 rounded-card bg-white p-6">
        <RecruiterProfileForm
          userId={user.id}
          initial={initial}
          email={user.email}
          emailHint={user.app_metadata?.provider === 'google' ? 'Signed in with Google' : 'Signed in with email'}
          submitLabel={onboarding ? 'Save and post a job' : 'Save changes'}
          onSubmit={handleSubmit}
        />
      </div>

      <Toast show={toastVisible}>Saved</Toast>
    </div>
  )
}
