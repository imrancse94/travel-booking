import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseBody } from '../../../../../server/lib/parseRequest.js';
import { authLimit } from '../../../../../server/lib/rateLimit.js';
import { created } from '../../../../../server/lib/apiResponse.js';
import { registerSchema } from '../../../../../server/validators/auth.validators.js';
import * as authService from '../../../../../server/services/authService.js';

export const POST = apiHandler(async (request) => {
  authLimit(request, 'auth');
  const body = await parseBody(request, registerSchema);
  const user = await authService.register(body);
  return created(user, 'Account created. Please check your email to verify your address.');
});
