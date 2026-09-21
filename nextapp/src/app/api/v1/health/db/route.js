import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { checkDatabaseConnection } from '../../../../../server/db/index.js';

export const GET = apiHandler(async () => {
  try {
    await checkDatabaseConnection();
    return success({ data: { message: 'Database connection is healthy' } });
  } catch (err) {
    return {
      body: { success: false, data: null, message: 'Database connection failed', errors: [err.message] },
      statusCode: 503,
    };
  }
});
