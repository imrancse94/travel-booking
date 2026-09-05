import { env } from '../config/env.js';
import * as emailLogRepository from '../repositories/emailLogRepository.js';
import logger from '../config/logger.js';
import { createConsoleEmailProvider } from '../integrations/email/providers/consoleProvider.js';
import { createSmtpEmailProvider } from '../integrations/email/providers/smtpProvider.js';
import { emailContent, renderLayout } from '../integrations/email/content/index.js';
import { getSettings } from './settingsService.js';

function resolveProvider() {
  // Tests must never put mail on the wire. Under Docker Compose EMAIL_PROVIDER
  // is `smtp` pointing at Mailpit, so the integration suite was delivering a
  // real batch of welcome/verification/booking/cancellation messages into the
  // shared dev mailbox on every run -- which looked exactly like a booking
  // having sent a dozen emails. In CI the same setting would aim at whatever
  // SMTP host was configured.
  if (env.isTest) {
    return createConsoleEmailProvider();
  }
  if (env.emailProvider === 'smtp' && env.smtp.host) {
    return createSmtpEmailProvider();
  }
  return createConsoleEmailProvider();
}

const provider = resolveProvider();

export async function sendTemplateEmail(templateName, to, data) {
  const build = emailContent[templateName];
  if (!build) {
    throw new Error(`Unknown email template: ${templateName}`);
  }

  const settings = await getSettings().catch(() => ({}));
  const agencyName = settings.agency_name || 'Global Travel Agency';
  // Passed alongside the caller's own data so a template's subject line (only
  // welcome.js uses it today) can name the configured agency instead of a
  // hard-coded one.
  const { subject, title, bodyHtml } = build({ ...data, agencyName });
  const html = renderLayout({
    title,
    bodyHtml,
    agencyName,
    logoUrl: settings.agency_logo_url || null,
  });

  try {
    await provider.send({ to, subject, html });
    await emailLogRepository.create({ toEmail: to, template: templateName, subject, status: 'sent' });
  } catch (err) {
    logger.error({ err, templateName, to }, 'Failed to send email');
    await emailLogRepository.create({
      toEmail: to,
      template: templateName,
      subject,
      status: 'failed',
      error: err.message,
    });
  }
}

export default { sendTemplateEmail };
