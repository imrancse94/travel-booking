export function passwordReset({ firstName, resetUrl }) {
  return {
    subject: 'Reset your password',
    title: 'Password reset requested',
    bodyHtml: `<p>Hi ${firstName}, click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  };
}
