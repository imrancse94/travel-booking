import { z } from 'zod';

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  isRead: z.enum(['true', 'false']).optional(),
});

export const notificationIdParamSchema = z.object({ id: z.string().uuid() });
