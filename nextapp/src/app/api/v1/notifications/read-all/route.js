import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import { markAllAsRead } from '../../../../../server/notifications/notificationService.js';

export const PATCH = apiHandler(async (request) => {
  const user = await withAuth(request);
  const count = await markAllAsRead(user.id);
  return success({ message: 'All notifications marked as read', data: { count } });
});
