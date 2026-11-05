import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseBody } from '../../../../../server/lib/parseRequest.js';
import { authLimit } from '../../../../../server/lib/rateLimit.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { setAuthCookies } from '../../../../../server/lib/authCookies.js';
import { loginSchema } from '../../../../../server/validators/auth.validators.js';
import * as authService from '../../../../../server/services/authService.js';

export const POST = apiHandler(async (request) => {
  authLimit(request, 'auth');
  const body = await parseBody(request, loginSchema);
  const { user, accessToken, refreshToken } = await authService.login(body, {
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent'),
  });
  // accessToken stays in the body as well: non-browser clients authenticate with a Bearer header.
  const result = success({ data: { user, accessToken }, message: 'Login successful' });
  result.applyCookies = (response) => setAuthCookies(response, { accessToken, refreshToken });
  return result;
});
