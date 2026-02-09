import { Resend } from 'resend';
import { config } from '../config.js';
import { verificationEmailHtml, passwordResetEmailHtml } from './templates.js';

const resend = config.RESEND_API_KEY ? new Resend(config.RESEND_API_KEY) : null;

async function sendEmail(to, subject, html) {
  if (!resend) {
    console.log(`\n--- DEV EMAIL ---\nTo: ${to}\nSubject: ${subject}\n${html}\n--- END EMAIL ---\n`);
    return;
  }

  await resend.emails.send({
    from: 'BeeBeeBee <noreply@beebeebee.app>',
    to,
    subject,
    html
  });
}

export async function sendVerificationEmail(username, email, token) {
  const url = `${config.FRONTEND_URL}/verify-email?token=${token}`;
  await sendEmail(email, 'Verify your email - BeeBeeBee', verificationEmailHtml(username, url));
}

export async function sendPasswordResetEmail(username, email, token) {
  const url = `${config.FRONTEND_URL}/reset-password?token=${token}`;
  await sendEmail(email, 'Reset your password - BeeBeeBee', passwordResetEmailHtml(username, url));
}
