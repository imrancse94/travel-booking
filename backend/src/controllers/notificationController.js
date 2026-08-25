import { asyncHandler } from '../utils/asyncHandler.js';
import { success, paginated } from '../utils/apiResponse.js';
import { parsePagination } from '../utils/pagination.js';
import { NotFoundError } from '../utils/errors.js';
import { prisma } from '../config/prisma.js';
import { markAsRead } from '../notifications/notificationService.js';

// GET /notifications -- the caller's own notifications, paginated.
export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const where = {
    userId: req.user.id,
    ...(req.query.isRead !== undefined ? { isRead: req.query.isRead === 'true' } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.notification.count({ where }),
  ]);

  return paginated(res, { items, page, limit, total });
});

// PATCH /notifications/:id/read
export const markOneAsRead = asyncHandler(async (req, res) => {
  const result = await markAsRead(req.params.id, req.user.id);
  if (result.count === 0) throw new NotFoundError('Notification not found');
  return success(res, { message: 'Notification marked as read' });
});

// PATCH /notifications/read-all
export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true },
  });
  return success(res, { message: 'All notifications marked as read', data: { count: result.count } });
});
