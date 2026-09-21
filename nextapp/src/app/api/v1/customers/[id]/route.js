import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../server/middleware/withPermission.js';
import { updateCustomerSchema, idParamSchema } from '../../../../../server/validators/customer.validators.js';
import * as customerService from '../../../../../server/services/customerService.js';

export const GET = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'customers.view');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const customer = await customerService.getCustomer(id);
  return success({ data: customer });
});

export const PUT = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'customers.update');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const body = await parseBody(request, updateCustomerSchema);
  const customer = await customerService.updateCustomer(id, body, user.id);
  return success({ data: customer, message: 'Customer updated' });
});

export const DELETE = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'customers.delete');
  const { id } = parseParams(await ctx.params, idParamSchema);
  await customerService.deleteCustomer(id, user.id);
  return success({ message: 'Customer deleted' });
});
