import { apiHandler } from '../../../../server/lib/apiHandler.js';
import { paginated } from '../../../../server/lib/apiResponse.js';
import { parseBody, parseQuery } from '../../../../server/lib/parseRequest.js';
import { withAuth } from '../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../server/middleware/withPermission.js';
import { bookingLimit } from '../../../../server/lib/rateLimit.js';
import { createPaymentSchema, listPaymentsQuerySchema } from '../../../../server/validators/payment.validators.js';
import { parsePagination } from '../../../../server/utils/pagination.js';
import * as paymentService from '../../../../server/services/paymentService.js';

export const GET = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'payments.view');
  const query = parseQuery(request, listPaymentsQuerySchema);
  const { page, limit, skip } = parsePagination(query);

  const { items, total } = await paymentService.listPaymentsForUser(user, { ...query, page, limit, skip });
  return paginated({ items, page, limit, total });
});

export const POST = apiHandler(async (request) => {
  const user = await withAuth(request);
  bookingLimit(request, 'payments');
  requirePermission(user, 'payments.create');
  const body = await parseBody(request, createPaymentSchema);

  const payment = await paymentService.recordPaymentForUser(user, body);
  return {
    body: {
      success: true,
      data: payment,
      message: payment.status === 'paid' ? 'Payment recorded' : 'Payment attempt recorded (declined)',
    },
    statusCode: 201,
  };
});
