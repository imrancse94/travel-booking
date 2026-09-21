import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { notifications } from '../db/schema.js';
import logger from '../config/logger.js';
import { sendTemplateEmail } from '../services/emailService.js';
import { sendSms } from '../integrations/sms/smsProvider.js';
import { sendWhatsapp } from '../integrations/whatsapp/whatsappProvider.js';

// Central fan-out point for every business event in section 29. Each event
// always creates an in-app notification; email is sent when an emailTemplate
// is provided. SMS/WhatsApp are wired the same way once a provider exists.
export async function notify({ userId, event, title, message, emailTemplate, emailTo, emailData, metadata }) {
  await db.insert(notifications).values({ userId, event, title, message, channel: 'in_app', metadata });

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

/** One page of a user's own notifications, newest first. */
export async function listForUser(userId, { isRead, limit, skip }) {
  const where = and(
    eq(notifications.userId, userId),
    ...(isRead === undefined ? [] : [eq(notifications.isRead, isRead)])
  );

  const [items, [{ value: total }]] = await Promise.all([
    db.select().from(notifications).where(where).orderBy(desc(notifications.createdAt)).limit(limit).offset(skip),
    db.select({ value: count() }).from(notifications).where(where),
  ]);

  return { items, total };
}

/**
 * Returns how many rows were updated -- 0 when the notification does not exist
 * or belongs to someone else, which is how the controller decides on a 404.
 * Prisma's updateMany returned `{ count }`; a Drizzle update resolves to a pg
 * result with no `count` at all, so it reports the affected ids instead.
 */
export async function markAsRead(notificationId, userId) {
  const rows = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning({ id: notifications.id });
  return rows.length;
}

export async function markAllAsRead(userId) {
  const rows = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    .returning({ id: notifications.id });
  return rows.length;
}

export default { notify, notifySms, notifyWhatsapp, listForUser, markAsRead, markAllAsRead };
