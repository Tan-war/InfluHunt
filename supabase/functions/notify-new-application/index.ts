// Supabase Edge Function (runs on Deno, not in the browser): emails the job's contact address
// when someone applies. Called by a Database Webhook on applications INSERT.
//
// Secrets (Edge Function secrets, never in the repo or the frontend):
//   RESEND_API_KEY  Resend API key
//   SITE_URL        e.g. https://influhunt.example (no trailing slash needed)
//   WEBHOOK_SECRET  any long random string; the webhook sends it in the x-webhook-secret header
//   RESEND_FROM     optional, e.g. "InfluHunt <hello@yourdomain.com>"; defaults to Resend's test sender
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
//
// The email never includes the applicant's email or phone. If sending fails, it's logged and
// nothing else happens: the application is already saved (the webhook runs after the insert).
import { createClient } from 'npm:@supabase/supabase-js@2'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

function emailFor({ name, pitch, jobTitle, link }) {
  const safe = { name: escapeHtml(name), pitch: pitch ? escapeHtml(pitch) : '', jobTitle: escapeHtml(jobTitle), link: escapeHtml(link) }
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1D1D1F;background:#F5F5F7;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:24px">
    <p style="margin:0 0 8px;font-size:18px;font-weight:600">${safe.name} applied for ${safe.jobTitle}</p>
    ${safe.pitch ? `<p style="margin:0 0 16px;color:#6E6E73">“${safe.pitch}”</p>` : ''}
    <a href="${safe.link}" style="display:inline-block;background:#0071E3;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:500">View application</a>
    <p style="margin:24px 0 0;font-size:13px;color:#6E6E73">You're getting this because you posted ${safe.jobTitle} on InfluHunt.</p>
  </div>
</div>`
  const text = `${name} applied for ${jobTitle}\n${pitch ? `\n“${pitch}”\n` : ''}\nView application: ${link}\n`
  return { html, text }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const secret = Deno.env.get('WEBHOOK_SECRET')
  if (!secret || req.headers.get('x-webhook-secret') !== secret) return json({ error: 'unauthorized' }, 401)

  let payload
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'bad_request' }, 400)
  }
  if (payload?.type !== 'INSERT' || payload?.table !== 'applications' || !payload?.record?.id) {
    return json({ skipped: true })
  }
  const applicationId = payload.record.id

  try {
    const apiKey = Deno.env.get('RESEND_API_KEY')
    const siteUrl = (Deno.env.get('SITE_URL') ?? '').replace(/\/+$/, '')
    if (!apiKey || !siteUrl) throw new Error('RESEND_API_KEY or SITE_URL is not set')

    // Read it again from the database instead of trusting the payload.
    const db = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false },
    })
    const { data: application, error } = await db
      .from('applications')
      .select('id, applicant_id, pitch, jobs(title, contact_email)')
      .eq('id', applicationId)
      .single()
    if (error) throw error
    const { data: person } = await db.from('profiles').select('full_name').eq('id', application.applicant_id).maybeSingle()

    const jobTitle = application.jobs.title.replace(/[\r\n]+/g, ' ')
    const name = person?.full_name?.trim() || 'Someone'
    const link = `${siteUrl}/recruiter/candidates/${application.applicant_id}?application=${application.id}`
    const { html, text } = emailFor({ name, pitch: application.pitch?.trim(), jobTitle, link })

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: Deno.env.get('RESEND_FROM') || 'InfluHunt <onboarding@resend.dev>',
        to: [application.jobs.contact_email],
        subject: `New applicant for ${jobTitle} on InfluHunt`,
        html,
        text,
      }),
    })
    if (!response.ok) throw new Error(`Resend replied ${response.status}: ${await response.text()}`)
    return json({ sent: true })
  } catch (error) {
    // Logged in Supabase → Edge Functions → notify-new-application → Logs. No personal details.
    console.error(`[notify-new-application] email not sent for application ${applicationId}:`, error?.message ?? error)
    return json({ sent: false })
  }
})
