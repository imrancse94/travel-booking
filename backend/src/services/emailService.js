import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import logger from '../config/logger.js';
import { createConsoleEmailProvider } from '../integrations/email/providers/consoleProvider.js';
import { createSmtpEmailProvider } from '../integrations/email/providers/smtpProvider.js';
import { emailContent, renderLayout } from '../integrations/email/content/index.js';
import { getSettings } from './settingsService.js';

function resolveProvider() {
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

  const { subject, title, bodyHtml } = build(data);
  const settings = await getSettings().catch(() => ({}));
  const html = renderLayout({
    title,
    bodyHtml,
    agencyName: settings.agency_name || 'Global Travel Agency',
    logoUrl: settings.agency_logo_url || null,
  });

  try {
    await provider.send({ to, subject, html });
    await prisma.emailLog.create({
      data: { toEmail: to, template: templateName, subject, status: 'sent' },
    });
  } catch (err) {
    logger.error({ err, templateName, to }, 'Failed to send email');
    await prisma.emailLog.create({
      data: { toEmail: to, template: templateName, subject, status: 'failed', error: err.message },
    });
  }
}

export default { sendTemplateEmail };
