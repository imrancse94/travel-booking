import { apiHandler } from '../../../../server/lib/apiHandler.js';
import { parseBody, parseQuery } from '../../../../server/lib/parseRequest.js';
import { paginated, created } from '../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../server/middleware/withPermission.js';
import { parsePagination } from '../../../../server/utils/pagination.js';
import { createCustomerSchema, listCustomersQuerySchema } from '../../../../server/validators/customer.validators.js';
import * as customerService from '../../../../server/services/customerService.js';

export const GET = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'customers.view');
  const query = parseQuery(request, listCustomersQuerySchema);
  const { page, limit, skip } = parsePagination(query);
  const { items, total } = await customerService.listCustomers({ ...query, page, limit, skip });
  return paginated({ items, page, limit, total });
});

export const POST = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'customers.create');
  const body = await parseBody(request, createCustomerSchema);
  const customer = await customerService.createCustomer(body, user.id);
  return created(customer, 'Customer created');
});
