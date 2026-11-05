import { apiHandler } from '../../../../../../server/lib/apiHandler.js';
import { parseParams, parseQuery } from '../../../../../../server/lib/parseRequest.js';
import { paginated } from '../../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../../server/middleware/withPermission.js';
import { parsePagination } from '../../../../../../server/utils/pagination.js';
import { customerHistoryQuerySchema, idParamSchema } from '../../../../../../server/validators/customer.validators.js';
import * as customerService from '../../../../../../server/services/customerService.js';

export const GET = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'customers.view');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const query = parseQuery(request, customerHistoryQuerySchema);
  const { page, limit, skip } = parsePagination(query);
  const { items, total } = await customerService.getPaymentHistory(id, { ...query, page, limit, skip });
  return paginated({ items, page, limit, total });
});
