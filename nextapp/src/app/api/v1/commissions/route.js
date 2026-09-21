import { apiHandler } from '../../../../server/lib/apiHandler.js';
import { parseBody, parseQuery } from '../../../../server/lib/parseRequest.js';
import { paginated, created } from '../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../server/middleware/withPermission.js';
import { parsePagination } from '../../../../server/utils/pagination.js';
import { createCommissionSchema, listCommissionsQuerySchema } from '../../../../server/validators/commission.validators.js';
import * as commissionService from '../../../../server/services/commissionService.js';

export const GET = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'commissions.view');
  const query = parseQuery(request, listCommissionsQuerySchema);
  const { page, limit, skip } = parsePagination(query);
  const { items, total } = await commissionService.listCommissions({ ...query, page, limit, skip });
  return paginated({ items, page, limit, total });
});

export const POST = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'commissions.create');
  const body = await parseBody(request, createCommissionSchema);
  const commission = await commissionService.createCommission(body, user.id);
  return created(commission, 'Commission created');
});
