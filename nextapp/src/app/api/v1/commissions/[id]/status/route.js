import { apiHandler } from '../../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../../server/middleware/withPermission.js';
import { updateCommissionStatusSchema, idParamSchema } from '../../../../../../server/validators/commission.validators.js';
import * as commissionService from '../../../../../../server/services/commissionService.js';

export const PATCH = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'commissions.update');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const body = await parseBody(request, updateCommissionStatusSchema);
  const commission = await commissionService.updateCommissionStatus(id, body, user.id);
  return success({ data: commission, message: 'Commission status updated' });
});
