export function verificationEmailHtml(username, url) {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Hey ${username}!</h2>
      <p>Click the link below to verify your email on BeeBeeBee:</p>
      <p><a href="${url}">${url}</a></p>
      <p>This link expires in 24 hours.</p>
    </div>
  `;
}

export function passwordResetEmailHtml(username, url) {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Hey ${username}!</h2>
      <p>Someone requested a password reset for your BeeBeeBee account.</p>
      <p><a href="${url}">Reset your password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, just ignore it.</p>
    </div>
  `;
}
