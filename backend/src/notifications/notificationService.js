import { prisma } from '../config/prisma.js';
import logger from '../config/logger.js';
import { sendTemplateEmail } from '../services/emailService.js';
import { sendSms } from '../integrations/sms/smsProvider.js';
import { sendWhatsapp } from '../integrations/whatsapp/whatsappProvider.js';

// Central fan-out point for every business event in section 29. Each event
// always creates an in-app notification; email is sent when an emailTemplate
// is provided. SMS/WhatsApp are wired the same way once a provider exists.
export async function notify({ userId, event, title, message, emailTemplate, emailTo, emailData, metadata }) {
  await prisma.notification.create({
    data: { userId, event, title, message, channel: 'in_app', metadata },
  });

  if (emailTemplate && emailTo) {
    await sendTemplateEmail(emailTemplate, emailTo, emailData || {}).catch((err) =>
      logger.error({ err, event }, 'notify: email dispatch failed')
    );
  }
}

export async function notifySms(to, message) {
  return sendSms({ to, message });
}

export async function notifyWhatsapp(to, message) {
  return sendWhatsapp({ to, message });
}

export async function markAsRead(notificationId, userId) {
  return prisma.notification.updateMany({ where: { id: notificationId, userId }, data: { isRead: true } });
}

export default { notify, notifySms, notifyWhatsapp, markAsRead };
