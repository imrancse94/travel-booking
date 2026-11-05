import { apiHandler } from '../../../../server/lib/apiHandler.js';
import { parseBody, parseQuery } from '../../../../server/lib/parseRequest.js';
import { generalLimit } from '../../../../server/lib/rateLimit.js';
import { paginated, created } from '../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../server/middleware/withPermission.js';
import { parsePagination } from '../../../../server/utils/pagination.js';
import { createRefundSchema, listRefundsQuerySchema } from '../../../../server/validators/refund.validators.js';
import * as refundService from '../../../../server/services/refundService.js';
import * as customerService from '../../../../server/services/customerService.js';

function isStaff(user) {
  return user.roles.some((r) => r !== 'Customer');
}

export const GET = apiHandler(async (request) => {
  generalLimit(request, 'refunds');
  const user = await withAuth(request);
  requirePermission(user, 'payments.view');
  const query = parseQuery(request, listRefundsQuerySchema);
  const { page, limit, skip } = parsePagination(query);

  if (!isStaff(user)) {
    const own = await customerService.findCustomerByUserId(user.id);
    query.customerId = own ? own.id : '00000000-0000-0000-0000-000000000000';
  }

  const { items, total } = await refundService.listRefunds({ ...query, page, limit, skip });
  return paginated({ items, page, limit, total });
});

export const POST = apiHandler(async (request) => {
  generalLimit(request, 'refunds');
  const user = await withAuth(request);
  requirePermission(user, 'payments.refund');
  const body = await parseBody(request, createRefundSchema);
  const refund = await refundService.refundPayment(body, user.id);
  return created(refund, 'Refund processed');
});
