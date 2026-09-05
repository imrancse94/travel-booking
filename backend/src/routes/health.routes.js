import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success, failure } from '../utils/apiResponse.js';
import { checkDatabaseConnection } from '../db/index.js';
import { checkRedisConnection } from '../config/redis.js';

export const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: API liveness check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is healthy
 */
router.get('/', (req, res) => success(res, { message: 'API is healthy' }));

/**
 * @openapi
 * /health/db:
 *   get:
 *     summary: Database connectivity check
 *     tags: [Health]
 */
router.get(
  '/db',
  asyncHandler(async (req, res) => {
    try {
      await checkDatabaseConnection();
      return success(res, { message: 'Database connection is healthy' });
    } catch (err) {
      return failure(res, { message: 'Database connection failed', statusCode: 503, errors: [err.message] });
    }
  })
);

/**
 * @openapi
 * /health/redis:
 *   get:
 *     summary: Redis connectivity check
 *     tags: [Health]
 */
router.get(
  '/redis',
  asyncHandler(async (req, res) => {
    try {
      await checkRedisConnection();
      return success(res, { message: 'Redis connection is healthy' });
    } catch (err) {
      return failure(res, { message: 'Redis connection failed', statusCode: 503, errors: [err.message] });
    }
  })
);

export default router;
