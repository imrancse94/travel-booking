import { apiHandler } from '../../../../server/lib/apiHandler.js';
import { parseBody, parseQuery } from '../../../../server/lib/parseRequest.js';
import { paginated, created } from '../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../server/middleware/withPermission.js';
import { parsePagination } from '../../../../server/utils/pagination.js';
import { createRatePlanSchema, listRatePlansQuerySchema } from '../../../../server/validators/ratePlan.validators.js';
import * as ratePlanService from '../../../../server/services/ratePlanService.js';

export const GET = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'rate_plans.view');
  const query = parseQuery(request, listRatePlansQuerySchema);
  const { page, limit, skip } = parsePagination(query);
  const { items, total } = await ratePlanService.listRatePlans({ ...query, page, limit, skip });
  return paginated({ items, page, limit, total });
});

export const POST = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'rate_plans.create');
  const body = await parseBody(request, createRatePlanSchema);
  const plan = await ratePlanService.createRatePlan(body, user.id);
  return created(plan, 'Rate plan created');
});
