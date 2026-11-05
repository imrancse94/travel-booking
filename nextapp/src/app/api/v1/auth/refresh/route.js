import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseBody } from '../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { setAuthCookies, getRefreshCookie } from '../../../../../server/lib/authCookies.js';
import { refreshSchema } from '../../../../../server/validators/auth.validators.js';
import { AuthenticationError } from '../../../../../server/utils/errors.js';
import * as authService from '../../../../../server/services/authService.js';

export const POST = apiHandler(async (request) => {
  const body = await parseBody(request, refreshSchema);
  const token = body.refreshToken || getRefreshCookie(request);
  if (!token) throw new AuthenticationError('No refresh token provided');

  const { accessToken, refreshToken } = await authService.refreshTokens(token);
  const result = success({ data: { accessToken }, message: 'Token refreshed' });
  result.applyCookies = (response) => setAuthCookies(response, { accessToken, refreshToken });
  return result;
});
