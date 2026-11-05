import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseBody } from '../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import { updateCustomerSchema } from '../../../../../server/validators/customer.validators.js';
import * as customerService from '../../../../../server/services/customerService.js';

export const GET = apiHandler(async (request) => {
  const user = await withAuth(request);
  const customer = await customerService.getMyProfile(user.id);
  return success({ data: customer });
});

export const PUT = apiHandler(async (request) => {
  const user = await withAuth(request);
  const body = await parseBody(request, updateCustomerSchema);
  const customer = await customerService.updateMyProfile(user.id, body);
  return success({ data: customer, message: 'Profile updated' });
});
