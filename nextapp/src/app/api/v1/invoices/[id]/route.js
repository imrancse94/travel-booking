import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseParams } from '../../../../../server/lib/parseRequest.js';
import { generalLimit } from '../../../../../server/lib/rateLimit.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../server/middleware/withPermission.js';
import { idParamSchema } from '../../../../../server/validators/invoice.validators.js';
import * as invoiceService from '../../../../../server/services/invoiceService.js';
import * as customerService from '../../../../../server/services/customerService.js';
import { AuthorizationError } from '../../../../../server/utils/errors.js';

function isStaff(user) {
  return user.roles.some((r) => r !== 'Customer');
}

async function assertOwnsInvoice(user, invoice) {
  if (isStaff(user)) return;
  const own = await customerService.findCustomerByUserId(user.id);
  if (!own || invoice.booking?.customerId !== own.id) throw new AuthorizationError();
}

export const GET = apiHandler(async (request, ctx) => {
  generalLimit(request, 'invoices');
  const user = await withAuth(request);
  requirePermission(user, 'invoices.view');
  const params = await ctx.params;
  const { id } = parseParams(params, idParamSchema);

  const invoice = await invoiceService.getInvoice(id);
  await assertOwnsInvoice(user, invoice);
  return success({ data: invoice });
});
