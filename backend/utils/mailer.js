// mailer.js — minimal SendGrid sender (no SDK; uses global fetch).
// Reads SENDGRID_API_KEY, MAIL_FROM, MAIL_FROM_NAME from env (set in Railway).
// If not configured, it logs and no-ops so the app never crashes on send.

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const MAIL_FROM = process.env.MAIL_FROM;
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'Functional WOD';

function isMailEnabled() { return !!(SENDGRID_API_KEY && MAIL_FROM); }

async function sendMail({ to, subject, text, html }) {
  if (!isMailEnabled()) {
    console.warn('[MAIL] not configured (SENDGRID_API_KEY/MAIL_FROM) — skipping email to', to);
    return { ok: false, skipped: true };
  }
  try {
    // SendGrid requires text/plain BEFORE text/html in the content array.
    const content = [];
    if (text) content.push({ type: 'text/plain', value: text });
    if (html) content.push({ type: 'text/html', value: html });
    if (!content.length) content.push({ type: 'text/plain', value: '' });

    const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + SENDGRID_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: MAIL_FROM, name: MAIL_FROM_NAME },
        subject: subject || '(no subject)',
        content: content
      })
    });
    if (r.status >= 200 && r.status < 300) return { ok: true };
    const errText = await r.text().catch(() => '');
    console.error('[MAIL] SendGrid error', r.status, errText);
    return { ok: false, status: r.status, error: errText };
  } catch (e) {
    console.error('[MAIL] send failed:', e.message);
    return { ok: false, error: e.message };
  }
}

module.exports = { sendMail, isMailEnabled };
