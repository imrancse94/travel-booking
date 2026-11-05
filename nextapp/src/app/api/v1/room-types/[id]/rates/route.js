import { apiHandler } from '../../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams, parseQuery } from '../../../../../../server/lib/parseRequest.js';
import { paginated, created } from '../../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../../server/middleware/withPermission.js';
import { parsePagination } from '../../../../../../server/utils/pagination.js';
import { idParamSchema, listRatesQuerySchema } from '../../../../../../server/validators/roomType.validators.js';
import { createRoomRateSchema } from '../../../../../../server/validators/ratePlan.validators.js';
import * as ratePlanService from '../../../../../../server/services/ratePlanService.js';

export const GET = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'rate_plans.view');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const query = parseQuery(request, listRatesQuerySchema);
  const { page, limit, skip } = parsePagination(query);
  const { items, total } = await ratePlanService.listRatesForRoomType(id, { page, limit, skip });
  return paginated({ items, page, limit, total });
});

export const POST = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'rate_plans.create');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const body = await parseBody(request, createRoomRateSchema);
  const rate = await ratePlanService.createRoomRate(id, body, user.id);
  return created(rate, 'Room rate created');
});
