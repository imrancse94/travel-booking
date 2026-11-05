'use server';

import { withActionResult } from './_actionResult.js';
import { requireActionUser } from './_actionAuth.js';
import { parse } from '../lib/parseRequest.js';
import { notificationIdParamSchema } from '../validators/notification.validators.js';
import { NotFoundError } from '../utils/errors.js';
import { markAsRead, markAllAsRead } from '../notifications/notificationService.js';

export async function markNotificationReadAction(id) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    const { id: parsedId } = parse('params', { id }, notificationIdParamSchema);
    const updated = await markAsRead(parsedId, user.id);
    if (updated === 0) throw new NotFoundError('Notification not found');
    return null;
  });
}

export async function markAllNotificationsReadAction() {
  return withActionResult(async () => {
    const user = await requireActionUser();
    const count = await markAllAsRead(user.id);
    return { count };
  });
}
