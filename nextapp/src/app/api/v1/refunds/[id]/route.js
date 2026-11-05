import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseParams } from '../../../../../server/lib/parseRequest.js';
import { generalLimit } from '../../../../../server/lib/rateLimit.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../server/middleware/withPermission.js';
import { idParamSchema } from '../../../../../server/validators/refund.validators.js';
import * as refundService from '../../../../../server/services/refundService.js';
import * as customerService from '../../../../../server/services/customerService.js';
import { AuthorizationError } from '../../../../../server/utils/errors.js';

function isStaff(user) {
  return user.roles.some((r) => r !== 'Customer');
}

export const GET = apiHandler(async (request, ctx) => {
  generalLimit(request, 'refunds');
  const user = await withAuth(request);
  requirePermission(user, 'payments.view');
  const params = await ctx.params;
  const { id } = parseParams(params, idParamSchema);

  const refund = await refundService.getRefund(id);

  if (!isStaff(user)) {
    const own = await customerService.findCustomerByUserId(user.id);
    if (!own || refund.payment?.booking?.customerId !== own.id) throw new AuthorizationError();
  }

  return success({ data: refund });
});
