import { apiHandler } from '../../../../server/lib/apiHandler.js';
import { parseQuery } from '../../../../server/lib/parseRequest.js';
import { success } from '../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../server/middleware/withPermission.js';
import { listActivityLogsQuerySchema } from '../../../../server/validators/activityLog.validators.js';
import * as activityLogService from '../../../../server/services/activityLogService.js';

export const GET = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'activity_logs.view');
  const query = parseQuery(request, listActivityLogsQuerySchema);
  const { items, total, page, limit, date, truncated } = await activityLogService.listActivityLogs(query);
  return success({
    data: items,
    meta: { pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }, date, truncated },
  });
});
