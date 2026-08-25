export function emailVerification({ firstName, verifyUrl }) {
  return {
    subject: 'Verify your email address',
    title: 'Verify your email',
    bodyHtml: `<p>Hi ${firstName}, please verify your email address:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  };
}
