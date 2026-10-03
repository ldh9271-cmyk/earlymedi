import 'server-only';

/**
 * Resend 로 HTML 메일 1통을 보낸다. 키가 없으면 false (로컬·데모).
 * 발신 주소는 RESEND_FROM (send.glowuptour.com 서브도메인 인증, memory: glowuptour-email-domain).
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.RESEND_FROM ?? 'GlowUpTour <noreply@glowuptour.com>', to: [to], subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
