import { MailTransport } from '../../../lib/MailTransport.js';
import { env } from '../../../config/env.js';

// Production email provider backed by SMTP (e.g. AWS SES SMTP endpoint,
// SendGrid, Postmark, etc). Any SMTP-compatible provider works without code
// changes -- only the .env values need to change.
export function createSmtpEmailProvider() {
  const transport = new MailTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    user: env.smtp.user,
    password: env.smtp.password,
  });

  return {
    name: 'smtp',
    async send({ to, subject, html, text }) {
      return transport.send({ from: env.smtp.from, to, subject, html, text });
    },
  };
}
