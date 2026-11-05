import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseBody } from '../../../../../server/lib/parseRequest.js';
import { authLimit } from '../../../../../server/lib/rateLimit.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { resetPasswordSchema } from '../../../../../server/validators/auth.validators.js';
import * as authService from '../../../../../server/services/authService.js';

export const POST = apiHandler(async (request) => {
  authLimit(request, 'auth');
  const body = await parseBody(request, resetPasswordSchema);
  await authService.resetPassword(body);
  return success({ message: 'Password has been reset. Please log in.' });
});
