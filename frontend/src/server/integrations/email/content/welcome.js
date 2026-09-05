export function welcome({ firstName, agencyName = 'Global Travel Agency' }) {
  return {
    subject: `Welcome to ${agencyName}`,
    title: 'Welcome!',
    bodyHtml: `<p>Hi ${firstName}, thanks for creating an account with us.</p>`,
  };
}
