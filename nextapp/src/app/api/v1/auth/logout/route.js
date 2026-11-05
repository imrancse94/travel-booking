import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { clearAuthCookies } from '../../../../../server/lib/authCookies.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import * as authService from '../../../../../server/services/authService.js';

export const POST = apiHandler(async (request) => {
  const user = await withAuth(request);
  if (user) await authService.logout(user.id);
  const result = success({ message: 'Logged out' });
  result.applyCookies = (response) => clearAuthCookies(response);
  return result;
});
