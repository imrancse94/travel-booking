export function welcome({ firstName }) {
  return {
    subject: 'Welcome to Global Travel Agency',
    title: 'Welcome!',
    bodyHtml: `<p>Hi ${firstName}, thanks for creating an account with us.</p>`,
  };
}
