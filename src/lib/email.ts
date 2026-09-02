// Pluggable email delivery. No provider is wired in yet (no Resend/SendGrid
// account exists for this project) — sendEmail() logs and no-ops until
// EMAIL_PROVIDER_API_KEY is set, so features that need email (staff invites,
// password-adjacent flows) can ship their token/link logic now without
// blocking on external account setup. Swap the no-op branch below for a
// real provider call once credentials exist.

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(message: EmailMessage): Promise<{ delivered: boolean }> {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY;

  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.warn(
      `[email] EMAIL_PROVIDER_API_KEY not set — not sending "${message.subject}" to ${message.to}. ` +
        'The action that triggered this (e.g. a staff invite) still succeeded and its link/token is valid; ' +
        'share it manually until an email provider is configured.',
    );
    return { delivered: false };
  }

  // Example Resend integration — uncomment and adjust once EMAIL_PROVIDER_API_KEY
  // is set to a real Resend key:
  //
  // const res = await fetch('https://api.resend.com/emails', {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     from: 'QarWheel <no-reply@qarwheel.qa>',
  //     to: message.to,
  //     subject: message.subject,
  //     html: message.html,
  //     text: message.text,
  //   }),
  // });
  // return { delivered: res.ok };

  return { delivered: false };
}
