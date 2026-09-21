import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { checkRedisConnection } from '../../../../../server/config/redis.js';

export const GET = apiHandler(async () => {
  try {
    await checkRedisConnection();
    return success({ data: { message: 'Redis connection is healthy' } });
  } catch (err) {
    return {
      body: { success: false, data: null, message: 'Redis connection failed', errors: [err.message] },
      statusCode: 503,
    };
  }
});
