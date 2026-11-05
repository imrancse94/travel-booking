import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';

export const GET = apiHandler(async (request) => {
  const user = await withAuth(request);
  return success({ data: user });
});
