import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseBody } from '../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { verifyEmailSchema } from '../../../../../server/validators/auth.validators.js';
import * as authService from '../../../../../server/services/authService.js';

export const POST = apiHandler(async (request) => {
  const body = await parseBody(request, verifyEmailSchema);
  await authService.verifyEmail(body.token);
  return success({ message: 'Email verified' });
});
