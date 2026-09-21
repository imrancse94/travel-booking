import { apiHandler } from '../../../../server/lib/apiHandler.js';
import { success } from '../../../../server/lib/apiResponse.js';

export const GET = apiHandler(async () => {
  return success({ data: { message: 'API is healthy' } });
});
