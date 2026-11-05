import { apiHandler } from '../../../../server/lib/apiHandler.js';
import { parseQuery } from '../../../../server/lib/parseRequest.js';
import { paginated } from '../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../server/middleware/withPermission.js';
import { parsePagination } from '../../../../server/utils/pagination.js';
import { listNotificationsQuerySchema } from '../../../../server/validators/notification.validators.js';
import { listForUser } from '../../../../server/notifications/notificationService.js';

export const GET = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'notifications.view');
  const query = parseQuery(request, listNotificationsQuerySchema);
  const { page, limit, skip } = parsePagination(query);
  const isRead = query.isRead === undefined ? undefined : query.isRead === 'true';
  const { items, total } = await listForUser(user.id, { isRead, limit, skip });
  return paginated({ items, page, limit, total });
});
