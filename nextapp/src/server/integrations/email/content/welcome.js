import { APP_NAME } from '../../../../lib/appConfig.js';
export function welcome({ firstName, agencyName = APP_NAME }) {
  return {
    subject: `Welcome to ${agencyName}`,
    title: 'Welcome!',
    bodyHtml: `<p>Hi ${firstName}, thanks for creating an account with us.</p>`,
  };
}
