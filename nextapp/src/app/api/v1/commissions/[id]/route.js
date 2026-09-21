import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseParams } from '../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../server/middleware/withPermission.js';
import { idParamSchema } from '../../../../../server/validators/commission.validators.js';
import * as commissionService from '../../../../../server/services/commissionService.js';

export const GET = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'commissions.view');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const commission = await commissionService.getCommission(id);
  return success({ data: commission });
});
