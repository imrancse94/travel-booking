import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseBody } from '../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import { changePasswordSchema } from '../../../../../server/validators/auth.validators.js';
import * as authService from '../../../../../server/services/authService.js';

export const POST = apiHandler(async (request) => {
  const user = await withAuth(request);
  const body = await parseBody(request, changePasswordSchema);
  await authService.changePassword(user.id, body);
  return success({ message: 'Password changed' });
});
