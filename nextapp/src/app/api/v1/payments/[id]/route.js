import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { parseParams } from '../../../../../server/lib/parseRequest.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../server/middleware/withPermission.js';
import { idParamSchema } from '../../../../../server/validators/payment.validators.js';
import * as paymentService from '../../../../../server/services/paymentService.js';

export const GET = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'payments.view');
  const { id } = parseParams(await ctx.params, idParamSchema);

  const payment = await paymentService.getPaymentForUser(user, id);
  return success({ data: payment });
});
