import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseBody } from '../../../../../server/lib/parseRequest.js';
import { authLimit } from '../../../../../server/lib/rateLimit.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { forgotPasswordSchema } from '../../../../../server/validators/auth.validators.js';
import * as authService from '../../../../../server/services/authService.js';

export const POST = apiHandler(async (request) => {
  authLimit(request, 'auth');
  const body = await parseBody(request, forgotPasswordSchema);
  await authService.requestPasswordReset(body.email);
  return success({ message: 'If an account exists for this email, a reset link has been sent.' });
});
