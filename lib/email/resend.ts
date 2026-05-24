// lib/email/resend.ts — Xinuco RF18: Resend client singleton + base send function
// Run: npm install resend

import { Resend } from 'resend'

// Singleton — se instancia una vez por proceso de Node.js
const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailPayload {
  to:      string
  subject: string
  html:    string
  from?:   string
}

export async function sendEmail(
  payload: EmailPayload,
): Promise<{ success: boolean; error?: string }> {
  try {
    await resend.emails.send({
      from:    payload.from ?? 'Xinuco <noreply@xinuco.app>',
      to:      payload.to,
      subject: payload.subject,
      html:    payload.html,
    })
    return { success: true }
  } catch (err) {
    console.error('[resend] sendEmail failed:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
