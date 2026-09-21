import { apiHandler } from '../../../../../../server/lib/apiHandler.js';
import { parseParams } from '../../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../../server/middleware/withAuth.js';
import { NotFoundError } from '../../../../../../server/utils/errors.js';
import { notificationIdParamSchema } from '../../../../../../server/validators/notification.validators.js';
import { markAsRead } from '../../../../../../server/notifications/notificationService.js';

export const PATCH = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  const { id } = parseParams(await ctx.params, notificationIdParamSchema);
  const updated = await markAsRead(id, user.id);
  if (updated === 0) throw new NotFoundError('Notification not found');
  return success({ message: 'Notification marked as read' });
});
