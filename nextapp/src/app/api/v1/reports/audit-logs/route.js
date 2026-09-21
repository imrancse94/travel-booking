import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseQuery } from '../../../../../server/lib/parseRequest.js';
import { generalLimit } from '../../../../../server/lib/rateLimit.js';
import { paginated } from '../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../server/middleware/withPermission.js';
import { parsePagination } from '../../../../../server/utils/pagination.js';
import { auditLogQuerySchema } from '../../../../../server/validators/report.validators.js';
import { listAuditLogs } from '../../../../../server/services/auditService.js';

export const GET = apiHandler(async (request) => {
  generalLimit(request, 'reports');
  const user = await withAuth(request);
  requirePermission(user, 'audit_logs.view');
  const query = parseQuery(request, auditLogQuerySchema);
  const { page, limit, skip } = parsePagination(query);
  const { entity, entityId, userId, dateFrom, dateTo } = query;

  const { items, total } = await listAuditLogs({ entity, entityId, userId, dateFrom, dateTo, limit, skip });
  return paginated({ items, page, limit, total });
});
