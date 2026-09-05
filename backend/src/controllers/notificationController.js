import { asyncHandler } from '../utils/asyncHandler.js';
import { success, paginated } from '../utils/apiResponse.js';
import { parsePagination } from '../utils/pagination.js';
import { NotFoundError } from '../utils/errors.js';
import { listForUser, markAllAsRead as markAllRead, markAsRead } from '../notifications/notificationService.js';

// GET /notifications -- the caller's own notifications, paginated.
export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const isRead = req.query.isRead === undefined ? undefined : req.query.isRead === 'true';

  const { items, total } = await listForUser(req.user.id, { isRead, limit, skip });

  return paginated(res, { items, page, limit, total });
});

// PATCH /notifications/:id/read
export const markOneAsRead = asyncHandler(async (req, res) => {
  const updated = await markAsRead(req.params.id, req.user.id);
  if (updated === 0) throw new NotFoundError('Notification not found');
  return success(res, { message: 'Notification marked as read' });
});

// PATCH /notifications/read-all
export const markAllAsRead = asyncHandler(async (req, res) => {
  const count = await markAllRead(req.user.id);
  return success(res, { message: 'All notifications marked as read', data: { count } });
});
