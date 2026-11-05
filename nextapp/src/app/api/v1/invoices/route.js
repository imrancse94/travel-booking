import { apiHandler } from '../../../../server/lib/apiHandler.js';
import { parseBody, parseQuery } from '../../../../server/lib/parseRequest.js';
import { generalLimit } from '../../../../server/lib/rateLimit.js';
import { paginated, created } from '../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../server/middleware/withPermission.js';
import { parsePagination } from '../../../../server/utils/pagination.js';
import { createInvoiceSchema, listInvoicesQuerySchema } from '../../../../server/validators/invoice.validators.js';
import * as invoiceService from '../../../../server/services/invoiceService.js';
import * as customerService from '../../../../server/services/customerService.js';

function isStaff(user) {
  return user.roles.some((r) => r !== 'Customer');
}

export const GET = apiHandler(async (request) => {
  generalLimit(request, 'invoices');
  const user = await withAuth(request);
  requirePermission(user, 'invoices.view');
  const query = parseQuery(request, listInvoicesQuerySchema);
  const { page, limit, skip } = parsePagination(query);

  if (!isStaff(user)) {
    const own = await customerService.findCustomerByUserId(user.id);
    query.customerId = own ? own.id : '00000000-0000-0000-0000-000000000000';
  }

  const { items, total } = await invoiceService.listInvoices({ ...query, page, limit, skip });
  return paginated({ items, page, limit, total });
});

export const POST = apiHandler(async (request) => {
  generalLimit(request, 'invoices');
  const user = await withAuth(request);
  requirePermission(user, 'invoices.create');
  const body = await parseBody(request, createInvoiceSchema);
  const invoice = await invoiceService.generateInvoiceForBooking(body.bookingId, user.id);
  return created(invoice, 'Invoice generated');
});
