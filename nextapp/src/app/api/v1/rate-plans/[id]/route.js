import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../server/middleware/withPermission.js';
import { idParamSchema, updateRatePlanSchema } from '../../../../../server/validators/ratePlan.validators.js';
import * as ratePlanService from '../../../../../server/services/ratePlanService.js';

export const GET = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'rate_plans.view');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const plan = await ratePlanService.getRatePlan(id);
  return success({ data: plan });
});

export const PUT = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'rate_plans.update');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const body = await parseBody(request, updateRatePlanSchema);
  const plan = await ratePlanService.updateRatePlan(id, body, user.id);
  return success({ data: plan, message: 'Rate plan updated' });
});

export const DELETE = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'rate_plans.delete');
  const { id } = parseParams(await ctx.params, idParamSchema);
  await ratePlanService.deleteRatePlan(id, user.id);
  return success({ message: 'Rate plan deleted' });
});
